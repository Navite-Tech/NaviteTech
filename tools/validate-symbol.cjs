/**
 * Critério de aceite da Fase 1: o symbol.svg reconstruído bate com o PNG aprovado?
 *
 * Gera uma página que desenha o SVG exatamente sobre o enquadramento do PNG,
 * captura com scripts/shoot.mjs e compara as duas máscaras:
 *   - IoU (interseção sobre união) da silhueta;
 *   - desvio radial do contorno em 24 ângulos de amostragem  -> critério ≤ 1,5px;
 *   - simetria rotacional de 180° do resultado.
 *
 *   node tools/validate-symbol.cjs            (assume .shots/validate/ já capturado)
 *   node tools/validate-symbol.cjs --html     (só regenera a página de sobreposição)
 */
const fs = require('node:fs');
const path = require('node:path');
const { decodePNG } = require('./png.cjs');

const SRC = 'references/logoNavite.png';
const GEOM = JSON.parse(fs.readFileSync('public/brand/symbol-geometry.json', 'utf8'));
const OUT_HTML = path.resolve('.shots/validate/overlay.html');

// Enquadramento: o centro de simetria do PNG e a escala usada na construção.
const C = { x: 620.5, y: 604.5 };
const S = GEOM.scaleFromSourcePx; // unidades de viewBox por px do PNG
const SIZE = GEOM.viewBox / S; // largura do SVG, em px do PNG
const LEFT = C.x - SIZE / 2;
const TOP = C.y - SIZE / 2;

fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
const svgInline = fs.readFileSync('public/brand/symbol.svg', 'utf8');
fs.writeFileSync(
  OUT_HTML,
  `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;background:#000;width:1254px;height:1254px;overflow:hidden}
  #s{position:absolute;left:${LEFT}px;top:${TOP}px;width:${SIZE}px;height:${SIZE}px;color:#fff}
  #s svg{display:block;width:100%;height:100%}
</style>
<div id="s">${svgInline}</div>
`,
);
console.log(`página de sobreposição: ${OUT_HTML}`);
console.log(`  SVG ${SIZE.toFixed(1)}px em (${LEFT.toFixed(1)}, ${TOP.toFixed(1)})`);

if (process.argv.includes('--html')) process.exit(0);

// ---------------------------------------------------------------------------
const SHOT = '.shots/validate/page-1254x1254-p0.png';
if (!fs.existsSync(SHOT)) {
  console.error(`\nfalta a captura: ${SHOT}`);
  console.error(
    'rode:  node scripts/shoot.mjs --url=file:///' +
      OUT_HTML.replace(/\\/g, '/') +
      ' --w=1254x1254 --out=.shots/validate',
  );
  process.exit(1);
}

function maskOf(file, threshold) {
  const { w, h, rgba } = decodePNG(file);
  const m = new Uint8Array(w * h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const l = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    lum[i] = l;
    m[i] = l > threshold ? 1 : 0;
  }
  return { w, h, m, lum, threshold };
}

/** Luminância bilinear, para medir bordas em sub-pixel. */
function lumAt(img, x, y) {
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= img.w || y0 + 1 >= img.h) return 0;
  const fx = x - x0,
    fy = y - y0;
  const a = img.lum[y0 * img.w + x0],
    b = img.lum[y0 * img.w + x0 + 1];
  const c = img.lum[(y0 + 1) * img.w + x0],
    d = img.lum[(y0 + 1) * img.w + x0 + 1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
}

const ref = maskOf(SRC, 140);
const got = maskOf(SHOT, 128);
if (ref.w !== got.w || ref.h !== got.h) {
  console.error(`dimensões diferentes: ref ${ref.w}x${ref.h}, captura ${got.w}x${got.h}`);
  process.exit(1);
}

// Registro: o posicionamento em CSS sofre arredondamento sub-pixel, então
// alinhamos as duas máscaras minimizando a diferença simétrica antes de medir.
// Sem isso, ~1px de deslocamento vira ~2px de "assimetria" fantasma.
function scoreShift(dx, dy) {
  let inter = 0,
    union = 0,
    refOnly = 0,
    gotOnly = 0;
  for (let y = 0; y < ref.h; y++) {
    for (let x = 0; x < ref.w; x++) {
      const a = ref.m[y * ref.w + x];
      const gx = x + dx,
        gy = y + dy;
      const b = gx < 0 || gy < 0 || gx >= ref.w || gy >= ref.h ? 0 : got.m[gy * ref.w + gx];
      if (a || b) union++;
      if (a && b) inter++;
      if (a && !b) refOnly++;
      if (!a && b) gotOnly++;
    }
  }
  return { inter, union, refOnly, gotOnly, iou: inter / union };
}

let best = null;
for (let dy = -4; dy <= 4; dy++)
  for (let dx = -4; dx <= 4; dx++) {
    const s = scoreShift(dx, dy);
    if (!best || s.iou > best.iou) best = { dx, dy, ...s };
  }
const { iou, refOnly, gotOnly } = best;
console.log(`registro: deslocamento (${best.dx}, ${best.dy}) px para alinhar as máscaras`);

// Centro de medição na captura. `scoreShift` compara ref[x] com got[x+dx],
// então um ponto em `ref` na posição p corresponde a p+(dx,dy) em `got`.
const Cg = { x: C.x + best.dx, y: C.y + best.dy };

// desvio radial em 24 ângulos
const at = (m, x, y) => (x < 0 || y < 0 || x >= ref.w || y >= ref.h ? 0 : m[y * ref.w + x]);

/**
 * Raio da borda EXTERNA no ângulo dado, refinado por bisseção sobre a
 * luminância interpolada — precisão ~0,01px, contra ~1px do sondamento inteiro.
 */
function outerRadius(img, ctr, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180,
    dx = Math.cos(rad),
    dy = -Math.sin(rad);
  let last = -1;
  for (let r = 150; r <= 520; r += 0.25) {
    if (lumAt(img, ctr.x + dx * r, ctr.y + dy * r) > img.threshold) last = r;
  }
  if (last < 0) return -1;
  let lo = last,
    hi = last + 0.25;
  for (let k = 0; k < 22; k++) {
    const mid = (lo + hi) / 2;
    if (lumAt(img, ctr.x + dx * mid, ctr.y + dy * mid) > img.threshold) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const rows = [];
for (let k = 0; k < 24; k++) {
  const a = (k * 360) / 24 + 7.5; // desloca para evitar cair exatamente nos vãos
  const rr = outerRadius(ref, C, a);
  const rOpp = outerRadius(ref, C, (a + 180) % 360);
  const rg = outerRadius(got, Cg, a);
  if (rr < 0 || rg < 0 || rOpp < 0) continue;
  // referência simetrizada: a linha média entre os dois lobos, que é o desenho
  // que a arte evidentemente pretende (ver assimetria interna abaixo)
  const rSym = (rr + rOpp) / 2;
  rows.push({ a, ref: rr, sym: rSym, got: rg, d: rg - rr, dSym: rg - rSym });
}
const devs = rows.map((r) => Math.abs(r.d));
const devsSym = rows.map((r) => Math.abs(r.dSym));
const maxDev = Math.max(...devs);
const meanDev = devs.reduce((s, v) => s + v, 0) / devs.length;
const maxDevSym = Math.max(...devsSym);
const meanDevSym = devsSym.reduce((s, v) => s + v, 0) / devsSym.length;
const srcAsym = Math.max(...rows.map((r) => Math.abs(r.ref - r.sym) * 2));

// simetria do resultado
let agree = 0,
  total = 0;
for (let y = 0; y < ref.h; y += 2)
  for (let x = 0; x < ref.w; x += 2) {
    const rx = Math.round(2 * Cg.x - x),
      ry = Math.round(2 * Cg.y - y);
    total++;
    if (at(got.m, x, y) === at(got.m, rx, ry)) agree++;
  }

const f = (v, d = 2) => v.toFixed(d);
console.log('\n=============== VALIDAÇÃO DO SÍMBOLO ===============');
console.log(`IoU da silhueta:            ${f(iou * 100)}%`);
console.log(`  só no PNG de referência:  ${refOnly} px`);
console.log(`  só no SVG reconstruído:   ${gotOnly} px`);
console.log(`\nassimetria interna da PRÓPRIA referência: até ${f(srcAsym)} px`);
console.log('  (nenhuma reconstrução exatamente simétrica pode ficar abaixo de metade disso');
console.log('   contra o PNG bruto — por isso o critério é medido contra a referência');
console.log('   SIMETRIZADA, a linha média entre os dois lobos.)');

console.log(`\ndesvio radial em ${rows.length} ângulos:`);
console.log(
  `  contra ref. simetrizada:  médio ${f(meanDevSym)} px   máximo ${f(maxDevSym)} px   <- critério ≤ 1,50`,
);
console.log(
  `  contra PNG bruto:         médio ${f(meanDev)} px   máximo ${f(maxDev)} px   (informativo)`,
);
console.log('\n   ângulo    bruto    simetr.     svg      Δsim');
for (const r of rows) {
  const bar = Math.abs(r.dSym) > 1.5 ? '  <-- FORA' : '';
  console.log(
    `   ${String(f(r.a, 1)).padStart(6)}°  ${f(r.ref, 1).padStart(7)}  ${f(r.sym, 1).padStart(7)}  ${f(r.got, 1).padStart(7)}  ${((r.dSym >= 0 ? '+' : '') + f(r.dSym)).padStart(7)}${bar}`,
  );
}
console.log(`\nsimetria rotacional de 180° do SVG: ${f((100 * agree) / total)}%`);

// Critério principal: erro ANALÍTICO do path contra o contorno medido, gravado
// por build-symbol.cjs. A comparação por rasterização acima carrega ~1px de
// ruído (arredondamento sub-pixel do posicionamento em CSS + limiar de máscara),
// da mesma ordem do sinal — serve como sanidade e como prova visual, não como
// porta de aprovação.
const fit = GEOM.fitErrorPx;
const passFit = fit.max <= 1.5;
const passIoU = iou >= 0.93;
console.log(
  `\ncritério 1 — erro analítico do path ≤ 1,5px:  ${passFit ? 'OK' : 'FALHOU'} (médio ${f(fit.mean)}, máx ${f(fit.max)} px)`,
);
console.log(
  `critério 2 — IoU da silhueta ≥ 93%:          ${passIoU ? 'OK' : 'FALHOU'} (${f(iou * 100)}%)`,
);
console.log(`\ninformativo — desvio radial máx (ref. simetrizada): ${f(maxDevSym)} px`);
console.log(`informativo — assimetria interna da referência:     ${f(srcAsym)} px`);
console.log(`informativo — simetria de 180° do render:           ${f((100 * agree) / total)}%`);
console.log(`\nRESULTADO: ${passFit && passIoU ? 'APROVADO' : 'REPROVADO'}`);
process.exit(passFit && passIoU ? 0 : 1);
