/**
 * Critério de aceite da Fase 3: o relevo sintético se sustenta ao lado do render
 * de referência?
 *
 * Compõe três painéis lado a lado a partir da captura de /simbolo/calibre — que
 * já está alinhada por construção — e do mesmo recorte no hero-reference.png:
 *
 *   referência  |  reconstrução  |  diferença de luminância
 *
 * Reporta os DOIS perfis de luz, vertical e horizontal. A primeira versão desta
 * ferramenta só media o vertical, e por isso deu passe num gradiente com o
 * componente horizontal invertido: a referência clareia para a direita e a
 * reconstrução escurecia. Direção de luz é vetor, não escalar — mede-se nos dois
 * eixos ou não se mede.
 *
 *   node tools/compare-relief.cjs
 */
const fs = require('node:fs');
const { decodePNG } = require('./png.cjs');
const { encodePNG } = require('./png-write.cjs');

// Recorte da crescente esquerda no render de referência (medido por
// componentes conexos — ver tools/measure-hero-symbol.cjs).
const REF_CROP = { x: 829, y: 227, w: 277, h: 516 };
const SHOT = '.shots/fase-3/page-277x516-p0.png';
const OUT = '.shots/fase-3/comparacao.png';
const GAP = 24;
const INK = 70; // acima disso é material, não fundo

if (!fs.existsSync(SHOT)) {
  console.error(`falta a captura: ${SHOT}`);
  console.error(
    'rode:  node scripts/shoot.mjs --url=http://localhost:PORTA/simbolo/calibre --w=277x516 --out=.shots/fase-3',
  );
  process.exit(1);
}

const ref = decodePNG('references/hero-reference.png');
const got = decodePNG(SHOT);

const lumOf = (px) => 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
const refPx = (x, y) => {
  const i = ((y + REF_CROP.y) * ref.w + (x + REF_CROP.x)) * 4;
  return [ref.rgba[i], ref.rgba[i + 1], ref.rgba[i + 2]];
};
const gotPx = (x, y) => {
  const i = (y * got.w + x) * 4;
  return [got.rgba[i], got.rgba[i + 1], got.rgba[i + 2]];
};

const W = REF_CROP.w;
const H = REF_CROP.h;
if (got.w !== W || got.h !== H) {
  console.error(`captura tem ${got.w}x${got.h}, esperado ${W}x${H}`);
  process.exit(1);
}

// --- estatísticas do material ---------------------------------------------
function stats(px) {
  const vals = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const l = lumOf(px(x, y));
      if (l > INK) vals.push(l);
    }
  vals.sort((a, b) => a - b);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const at = (q) => vals[Math.floor(vals.length * q)];
  return {
    n: vals.length,
    mean,
    p05: at(0.05),
    p50: at(0.5),
    p95: at(0.95),
    range: at(0.95) - at(0.05),
  };
}

const sRef = stats(refPx);
const sGot = stats(gotPx);
const f = (v) => v.toFixed(1);

console.log('material (pixels com luminância > 70)\n');
console.log('                 referência   reconstrução');
console.log(`  área (px)      ${String(sRef.n).padStart(10)}   ${String(sGot.n).padStart(12)}`);
console.log(`  luminância méd ${f(sRef.mean).padStart(10)}   ${f(sGot.mean).padStart(12)}`);
console.log(`  p05 (sombra)   ${f(sRef.p05).padStart(10)}   ${f(sGot.p05).padStart(12)}`);
console.log(`  p50            ${f(sRef.p50).padStart(10)}   ${f(sGot.p50).padStart(12)}`);
console.log(`  p95 (luz)      ${f(sRef.p95).padStart(10)}   ${f(sGot.p95).padStart(12)}`);
console.log(`  faixa dinâmica ${f(sRef.range).padStart(10)}   ${f(sGot.range).padStart(12)}`);

// --- perfis de luz nos dois eixos -------------------------------------------
const BANDS = 10;

/** Média de luminância do material em `BANDS` faixas ao longo de um eixo. */
function profile(px, axis) {
  const N = axis === 'y' ? H : W;
  const cross = axis === 'y' ? W : H;
  const out = [];
  for (let b = 0; b < BANDS; b++) {
    const a0 = Math.floor((b * N) / BANDS);
    const a1 = Math.floor(((b + 1) * N) / BANDS);
    let sum = 0;
    let n = 0;
    for (let a = a0; a < a1; a++)
      for (let c = 0; c < cross; c++) {
        const l = lumOf(axis === 'y' ? px(c, a) : px(a, c));
        if (l > INK) {
          sum += l;
          n++;
        }
      }
    out.push(n ? sum / n : null);
  }
  return out;
}

/**
 * Inclinação por regressão linear sobre as faixas. É o número que importa: o
 * SINAL diz a direção da luz naquele eixo, e era exatamente o que estava errado.
 */
function slope(p) {
  const pts = p.map((v, i) => [i, v]).filter(([, v]) => v != null);
  const n = pts.length;
  const mx = pts.reduce((s, [i]) => s + i, 0) / n;
  const my = pts.reduce((s, [, v]) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (const [i, v] of pts) {
    num += (i - mx) * (v - my);
    den += (i - mx) ** 2;
  }
  return num / den; // luminância por faixa
}

let worst = 0;
let inverted = 0;
for (const [axis, title, from, to] of [
  ['y', 'VERTICAL', 'topo', 'base'],
  ['x', 'HORIZONTAL', 'esq', 'dir'],
]) {
  const a = profile(refPx, axis);
  const c = profile(gotPx, axis);
  console.log(`\nperfil ${title} (${from} → ${to})`);
  console.log('  faixa   referência   reconstrução   Δ');
  for (let b = 0; b < BANDS; b++) {
    const d = a[b] == null || c[b] == null ? null : c[b] - a[b];
    if (d != null) worst = Math.max(worst, Math.abs(d));
    console.log(
      `  ${String(Math.round((100 * b) / BANDS)).padStart(3)}%   ${f(a[b] ?? 0).padStart(10)}   ` +
        `${f(c[b] ?? 0).padStart(12)}   ${d == null ? '   —' : (d >= 0 ? '+' : '') + f(d).padStart(6)}  ` +
        `${'#'.repeat(Math.round((c[b] ?? 0) / 12))}`,
    );
  }
  const sr = slope(a);
  const sg = slope(c);
  const ok = Math.sign(sr) === Math.sign(sg);
  if (!ok) inverted++;
  console.log(
    `  inclinação: referência ${sr >= 0 ? '+' : ''}${sr.toFixed(2)}/faixa   ` +
      `reconstrução ${sg >= 0 ? '+' : ''}${sg.toFixed(2)}/faixa   ` +
      `${ok ? `mesma direção · razão ${(sg / sr).toFixed(2)}x` : '*** DIRECAO INVERTIDA ***'}`,
  );
}
console.log(`\nmaior desvio de faixa nos dois eixos: ${worst.toFixed(1)}`);
if (inverted) console.log(`${inverted} eixo(s) com a luz na direção errada`);

// --- textura do material ----------------------------------------------------
// Julgar granulação a olho é traiçoeiro. Medimos a variação local: a diferença
// média entre pixels vizinhos DENTRO do material, depois de tirar o gradiente
// suave (que também produz diferença entre vizinhos, mas em escala maior).
function texture(px) {
  let sum = 0;
  let n = 0;
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      const c = lumOf(px(x, y));
      if (c < 90) continue;
      const l = lumOf(px(x - 1, y));
      const r = lumOf(px(x + 1, y));
      const u = lumOf(px(x, y - 1));
      const d = lumOf(px(x, y + 1));
      if (l < 90 || r < 90 || u < 90 || d < 90) continue; // evita as bordas
      sum += Math.abs(c - (l + r + u + d) / 4); // laplaciano: isola alta frequência
      n++;
    }
  return n ? sum / n : 0;
}
const tRef = texture(refPx);
const tGot = texture(gotPx);
console.log('\ntextura de alta frequência (laplaciano médio dentro do material)');
console.log(
  `  referência ${tRef.toFixed(2)}   reconstrução ${tGot.toFixed(2)}   razão ${(tGot / tRef).toFixed(2)}x`,
);
console.log(
  `  ${tGot > tRef * 1.6 ? 'GRÃO EXCESSIVO — reduzir' : tGot < tRef * 0.4 ? 'grão fraco demais' : 'compatível'}`,
);

// --- painel de comparação ---------------------------------------------------
const outW = W * 3 + GAP * 2;
const rgb = new Uint8Array(outW * H * 3);
rgb.fill(10);
const put = (x, y, col) => {
  const i = (y * outW + x) * 3;
  rgb[i] = col[0];
  rgb[i + 1] = col[1];
  rgb[i + 2] = col[2];
};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    put(x, y, refPx(x, y));
    put(x + W + GAP, y, gotPx(x, y));
    const d = Math.abs(lumOf(refPx(x, y)) - lumOf(gotPx(x, y)));
    // diferença: escuro = igual, brass = divergente
    const t = Math.min(1, d / 90);
    put(x + (W + GAP) * 2, y, [
      Math.round(10 + 157 * t),
      Math.round(16 + 142 * t),
      Math.round(30 + 93 * t),
    ]);
  }
}

fs.writeFileSync(OUT, encodePNG(outW, H, rgb));
console.log(`\npainel: ${OUT}  (referência | reconstrução | diferença)`);
