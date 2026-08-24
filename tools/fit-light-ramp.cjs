/**
 * Ajusta as paradas do gradiente da face a partir da referência.
 *
 * Um `linearGradient` é uma função de UMA variável: a projeção `t` do ponto
 * sobre o eixo da luz. Então a rampa certa não se adivinha — mede-se a
 * luminância da referência em função de `t` e leem-se as paradas direto.
 *
 * Também mede o mesmo perfil na captura da reconstrução, e reporta a correção
 * necessária em cada parada. Duas ou três iterações fecham.
 *
 *   node tools/fit-light-ramp.cjs
 */
const fs = require('node:fs');
const { decodePNG } = require('./png.cjs');

const REF_CROP = { x: 829, y: 227, w: 277, h: 516 };
const SHOT = '.shots/fase-3/page-277x516-p0.png';
const INK = 70;
const BINS = 20;

// Espelha lib/symbol/light.ts e lib/symbol/geometry.ts. Lidos do fonte para não
// haver duas verdades: se a direção da luz mudar lá, esta ferramenta acompanha.
const src = fs.readFileSync('lib/symbol/light.ts', 'utf8');
const num = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`não achei ${what} em lib/symbol/light.ts`);
  return Number(m[1]);
};
const LIGHT = {
  x: num(/LIGHT_DIR = \{ x: (-?[\d.]+)/, 'LIGHT_DIR.x'),
  y: num(/LIGHT_DIR = \{ x: -?[\d.]+, y: (-?[\d.]+)/, 'LIGHT_DIR.y'),
};
const OFF = {
  x: num(/EXTRUDE_OFFSET = \{ x: (-?[\d.]+)/, 'EXTRUDE_OFFSET.x'),
  y: num(/EXTRUDE_OFFSET = \{ x: -?[\d.]+, y: (-?[\d.]+)/, 'EXTRUDE_OFFSET.y'),
};

const geo = fs.readFileSync('lib/symbol/geometry.ts', 'utf8');
const bboxM = geo.match(/CRESCENT_BBOX = \{ x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+)/);
const BBOX = { x: +bboxM[1], y: +bboxM[2], w: +bboxM[3], h: +bboxM[4] };

// Caixa do relevo (mesma conta de CRESCENT_RELIEF_BBOX em lib/symbol/light.ts)
const RELIEF = {
  x: BBOX.x + Math.min(0, OFF.x),
  y: BBOX.y + Math.min(0, OFF.y),
  w: BBOX.w + Math.abs(OFF.x),
  h: BBOX.h + Math.abs(OFF.y),
};
// px por unidade de viewBox no recorte de 516px de altura
const unit = REF_CROP.h / RELIEF.h;

// Eixo ANCORADO NA METADE, igual a lightAxisFor('left').
const SPAN = Math.abs(LIGHT.x) * RELIEF.w + Math.abs(LIGHT.y) * RELIEF.h;
const CX = RELIEF.x + RELIEF.w / 2;
const CY = RELIEF.y + RELIEF.h / 2;

/** Projeção normalizada sobre o eixo da luz: 0 = lado iluminado, 1 = sombra. */
function tAt(cropX, cropY) {
  const vx = RELIEF.x + cropX / unit;
  const vy = RELIEF.y + cropY / unit;
  return 0.5 - ((vx - CX) * LIGHT.x + (vy - CY) * LIGHT.y) / SPAN;
}

const lumOf = (a, i) => 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2];

function ramp(sample) {
  const sum = new Float64Array(BINS);
  const n = new Int32Array(BINS);
  let tMin = 1;
  let tMax = 0;
  for (let y = 0; y < REF_CROP.h; y++)
    for (let x = 0; x < REF_CROP.w; x++) {
      const l = sample(x, y);
      if (l <= INK) continue;
      const t = tAt(x, y);
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
      const b = Math.min(BINS - 1, Math.max(0, Math.floor(t * BINS)));
      sum[b] += l;
      n[b]++;
    }
  return {
    mean: Array.from(sum, (s, i) => (n[i] ? s / n[i] : null)),
    n: Array.from(n),
    tMin,
    tMax,
  };
}

const ref = decodePNG('references/hero-reference.png');
const refL = (x, y) => lumOf(ref.rgba, ((y + REF_CROP.y) * ref.w + (x + REF_CROP.x)) * 4);
const rRef = ramp(refL);

let rGot = null;
if (fs.existsSync(SHOT)) {
  const got = decodePNG(SHOT);
  if (got.w === REF_CROP.w && got.h === REF_CROP.h) {
    rGot = ramp((x, y) => lumOf(got.rgba, (y * got.w + x) * 4));
  }
}

console.log(`eixo da luz: (${LIGHT.x}, ${LIGHT.y})  span ${SPAN}  extrusão (${OFF.x}, ${OFF.y})`);
console.log(`a crescente ocupa t ∈ [${rRef.tMin.toFixed(3)}, ${rRef.tMax.toFixed(3)}]`);
console.log('  => paradas fora desse intervalo não têm efeito nenhum\n');
console.log('   t      px     referência   reconstrução      Δ   correção sugerida');
for (let b = 0; b < BINS; b++) {
  const t = (b + 0.5) / BINS;
  const a = rRef.mean[b];
  if (a == null) continue;
  const c = rGot ? rGot.mean[b] : null;
  const d = c == null ? null : c - a;
  console.log(
    `  ${t.toFixed(3)}  ${String(rRef.n[b]).padStart(6)}   ${a.toFixed(1).padStart(10)}   ` +
      `${c == null ? '         —' : c.toFixed(1).padStart(12)}   ${d == null ? '    —' : (d >= 0 ? '+' : '') + d.toFixed(1).padStart(5)}` +
      `${d == null ? '' : `   ${d < 0 ? 'clarear' : 'escurecer'} ${Math.abs(d).toFixed(0)}`}`,
  );
}

// --- paradas propostas -------------------------------------------------------
// Cinco paradas cobrindo o intervalo ocupado, com o valor lido da referência.
console.log('\nparadas propostas (offset -> cinza alvo da REFERÊNCIA):');
const at = (t) => {
  const b = Math.min(BINS - 1, Math.max(0, Math.floor(t * BINS)));
  for (let k = 0; k < BINS; k++) {
    if (rRef.mean[b + k] != null) return rRef.mean[b + k];
    if (rRef.mean[b - k] != null) return rRef.mean[b - k];
  }
  return null;
};
const pad = 0.02;
const t0 = Math.max(0, rRef.tMin - pad);
const t1 = Math.min(1, rRef.tMax + pad);
for (let i = 0; i < 5; i++) {
  const t = t0 + ((t1 - t0) * i) / 4;
  const v = at(t);
  // O grão em `multiply` escurece a face ~7%; a parada compensa para que o
  // resultado FINAL na tela bata com a referência.
  const target = Math.min(255, Math.round(v / 0.93));
  const hex = target.toString(16).padStart(2, '0');
  console.log(
    `  offset ${t.toFixed(3)}   referência ${v.toFixed(0).padStart(3)}   antes do grão ${String(target).padStart(3)}   ≈ #${hex}${hex}${hex}`,
  );
}
console.log(
  '\n(os cinzas são neutros; a cor final mantém o matiz quente de --face-* — use a luminância como alvo)',
);
