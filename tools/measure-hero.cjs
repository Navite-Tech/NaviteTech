/**
 * Mede a composição do hero-reference.png.
 *
 * O que a Fase 5 precisa saber e não dá para estimar a olho: onde começa a
 * coluna de texto, a altura de caixa de cada linha, a régua, a caixa do botão,
 * e a AMBIENTAÇÃO — os quadradinhos, cruzetas e linhas finas que o plano chama
 * de "HUD editorial" (§3.5) e que ainda não existem no código.
 *
 * TRÊS PASSES COM CRITÉRIOS DIFERENTES, porque um limiar só não separa as três
 * coisas:
 *
 *   símbolo      luminância absoluta alta. Um modelo de fundo por percentil
 *                local NÃO funciona aqui: dentro de uma célula inteiramente
 *                ocupada pelo símbolo, o percentil é o próprio símbolo, e ele
 *                deixa de se destacar de si mesmo.
 *   texto        luminância absoluta média, restrito à coluna esquerda.
 *   ambientação  CROMA. Os marcadores são sage/brass — verde-oliva
 *                dessaturado, com (r+g)/2 > b. O fundo é navy, onde b domina.
 *                É o discriminador limpo; luminância sozinha pega artefato de
 *                compressão e a penumbra do símbolo junto.
 *
 * Tudo sai em fração da largura/altura, que é o que vira vw/vh no CSS.
 *
 *   node tools/measure-hero.cjs
 */
const { decodePNG } = require('./png.cjs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'references', 'hero-reference.png');
const { w: W, h: H, rgba } = decodePNG(FILE);

const at = (x, y) => (y * W + x) * 4;
const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
/** Quanto o pixel puxa para oliva em vez de azul. Positivo = sage/brass. */
const warm = (i) => (rgba[i] + rgba[i + 1]) / 2 - rgba[i + 2];

/** Componentes conexos, varredura iterativa (a recursiva estoura a pilha). */
function components(isInk, box = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }) {
  const seen = new Uint8Array(W * H);
  const out = [];
  const stack = new Int32Array(W * H);
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const p = y * W + x;
      if (seen[p] || !isInk(x, y)) continue;
      let sp = 0;
      stack[sp++] = p;
      seen[p] = 1;
      let n = 0,
        x0 = x,
        x1 = x,
        y0 = y,
        y1 = y,
        sr = 0,
        sg = 0,
        sb = 0;
      while (sp > 0) {
        const q = stack[--sp];
        const qx = q % W,
          qy = (q / W) | 0;
        n++;
        if (qx < x0) x0 = qx;
        if (qx > x1) x1 = qx;
        if (qy < y0) y0 = qy;
        if (qy > y1) y1 = qy;
        const i = q * 4;
        sr += rgba[i];
        sg += rgba[i + 1];
        sb += rgba[i + 2];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx,
              ny = qy + dy;
            if (nx < box.x0 || ny < box.y0 || nx > box.x1 || ny > box.y1) continue;
            const np = ny * W + nx;
            if (seen[np] || !isInk(nx, ny)) continue;
            seen[np] = 1;
            stack[sp++] = np;
          }
        }
      }
      out.push({
        n,
        x0,
        y0,
        x1,
        y1,
        w: x1 - x0 + 1,
        h: y1 - y0 + 1,
        r: sr / n,
        g: sg / n,
        b: sb / n,
      });
    }
  }
  return out;
}

const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const pw = (v) => ((100 * v) / W).toFixed(2);
const ph = (v) => ((100 * v) / H).toFixed(2);

console.log(`hero-reference.png  ${W}x${H}   aspecto ${(W / H).toFixed(3)}\n`);

// ---------------------------------------------------------------------------
// 1. SÍMBOLO — luminância absoluta alta, metade direita.
// ---------------------------------------------------------------------------
const sym = components((x, y) => lum(at(x, y)) > 100, {
  x0: Math.round(W * 0.44),
  y0: 0,
  x1: W - 1,
  y1: H - 1,
})
  .filter((c) => c.n > 2000)
  .sort((a, b) => a.x0 - b.x0);

console.log('SÍMBOLO');
const union = sym.reduce(
  (a, c) => ({
    x0: Math.min(a.x0, c.x0),
    y0: Math.min(a.y0, c.y0),
    x1: Math.max(a.x1, c.x1),
    y1: Math.max(a.y1, c.y1),
  }),
  { x0: W, y0: H, x1: 0, y1: 0 },
);
for (const [i, c] of sym.entries()) {
  console.log(
    `  metade ${i === 0 ? 'esq' : 'dir'}  x ${c.x0}..${c.x1}  y ${c.y0}..${c.y1}  ` +
      `(${c.w}x${c.h})  centro ${pw((c.x0 + c.x1) / 2)}vw ${ph((c.y0 + c.y1) / 2)}vh  ${c.n}px`,
  );
}
console.log(
  `  união    x ${union.x0}..${union.x1}  y ${union.y0}..${union.y1}  ` +
    `(${union.x1 - union.x0 + 1}x${union.y1 - union.y0 + 1})`,
);
console.log(
  `  em vw/vh  centro ${pw((union.x0 + union.x1) / 2)}vw  ${ph((union.y0 + union.y1) / 2)}vh  ` +
    `larg ${pw(union.x1 - union.x0 + 1)}vw  alt ${ph(union.y1 - union.y0 + 1)}vh`,
);
if (sym.length === 2) {
  const gap = sym[1].x0 - sym[0].x1;
  console.log(`  vão entre as metades  ${gap}px = ${pw(gap)}vw`);
}

// ---------------------------------------------------------------------------
// 2. TEXTO — agrupa por faixa de y na coluna esquerda.
// ---------------------------------------------------------------------------
const textInk = components((x, y) => lum(at(x, y)) > 62, {
  x0: 0,
  y0: 0,
  x1: Math.round(W * 0.46),
  y1: H - 1,
}).filter((c) => c.n > 6);

const rows = [];
for (const c of textInk.slice().sort((a, b) => a.y0 - b.y0)) {
  const hit = rows.find((r) => c.y0 <= r.y1 + 3 && c.y1 >= r.y0 - 3);
  if (hit) {
    hit.y0 = Math.min(hit.y0, c.y0);
    hit.y1 = Math.max(hit.y1, c.y1);
    hit.x0 = Math.min(hit.x0, c.x0);
    hit.x1 = Math.max(hit.x1, c.x1);
    hit.parts.push(c);
  } else rows.push({ y0: c.y0, y1: c.y1, x0: c.x0, x1: c.x1, parts: [c] });
}

console.log('\nCOLUNA DE TEXTO');
console.log(
  '   #    y0    y1  alt    x0    x1  larg  peças    x0%    y0%     cor      Δy do topo anterior',
);
let prevTop = null;
for (const [i, r] of rows.entries()) {
  const n = r.parts.reduce((s, p) => s + p.n, 0);
  const c = {
    r: r.parts.reduce((s, p) => s + p.r * p.n, 0) / n,
    g: r.parts.reduce((s, p) => s + p.g * p.n, 0) / n,
    b: r.parts.reduce((s, p) => s + p.b * p.n, 0) / n,
  };
  const adv = prevTop === null ? '' : String(r.y0 - prevTop);
  console.log(
    `  ${String(i).padStart(2)}  ${String(r.y0).padStart(4)}  ${String(r.y1).padStart(4)}  ` +
      `${String(r.y1 - r.y0 + 1).padStart(3)}  ${String(r.x0).padStart(4)}  ${String(r.x1).padStart(4)}  ` +
      `${String(r.x1 - r.x0 + 1).padStart(4)}  ${String(r.parts.length).padStart(5)}  ` +
      `${pw(r.x0).padStart(6)} ${ph(r.y0).padStart(6)}  ${hex(c)}  ${adv.padStart(4)}`,
  );
  prevTop = r.y0;
}

// ---------------------------------------------------------------------------
// 3. AMBIENTAÇÃO — por CROMA. Marcadores são oliva; o fundo é azul.
// ---------------------------------------------------------------------------
const marks = components((x, y) => {
  const i = at(x, y);
  return warm(i) > 12 && lum(i) > 40 && lum(i) < 190;
})
  .filter((c) => c.n >= 6 && c.w <= 140 && c.h <= 140)
  // fora da coluna de texto (o headline em sage também é oliva)
  .filter((c) => !(c.x0 < W * 0.45 && c.y0 > H * 0.26 && c.y1 < H * 0.8))
  .sort((a, b) => (a.y0 === b.y0 ? a.x0 - b.x0 : a.y0 - b.y0));

console.log(`\nAMBIENTAÇÃO — ${marks.length} elementos (croma oliva)`);
console.log('   forma       cx%     cy%    larg  alt   px   preench    cor');
const kinds = {};
for (const c of marks) {
  const fill = c.n / (c.w * c.h);
  const ar = c.w / c.h;
  let shape = 'blob';
  if (c.w <= 4 && c.h >= 10) shape = 'linha-v';
  else if (c.h <= 4 && c.w >= 10) shape = 'linha-h';
  else if (fill > 0.7 && ar > 0.65 && ar < 1.55) shape = 'quadrado';
  else if (fill < 0.45 && ar > 0.5 && ar < 2) shape = 'cruzeta';
  kinds[shape] = (kinds[shape] ?? 0) + 1;
  console.log(
    `  ${shape.padEnd(9)} ${pw((c.x0 + c.x1) / 2).padStart(7)} ${ph((c.y0 + c.y1) / 2).padStart(7)}  ` +
      `${String(c.w).padStart(4)} ${String(c.h).padStart(4)} ${String(c.n).padStart(4)}   ` +
      `${fill.toFixed(2)}    ${hex(c)}`,
  );
}
console.log(
  `  resumo: ${Object.entries(kinds)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')}`,
);

// ---------------------------------------------------------------------------
// 4. VINHETA — luminância do fundo, sem tinta.
// ---------------------------------------------------------------------------
console.log('\nVINHETA — percentil 20 da luminância por célula');
const GX = 8,
  GY = 5;
let head = '        ';
for (let i = 0; i < GX; i++) head += `${((100 * (i + 0.5)) / GX).toFixed(0).padStart(6)}%`;
console.log(head);
for (let j = 0; j < GY; j++) {
  let line = `  ${((100 * (j + 0.5)) / GY).toFixed(0).padStart(3)}%  `;
  for (let i = 0; i < GX; i++) {
    const vals = [];
    for (let y = ((j * H) / GY) | 0; (y < ((j + 1) * H) / GY) | 0; y += 2) {
      for (let x = ((i * W) / GX) | 0; (x < ((i + 1) * W) / GX) | 0; x += 2) {
        vals.push(lum(at(x, y)));
      }
    }
    vals.sort((a, b) => a - b);
    line += `${vals[(vals.length * 0.2) | 0].toFixed(1).padStart(6)} `;
  }
  console.log(line);
}

// ---------------------------------------------------------------------------
// 5. CHÃO — o símbolo repousa sobre um plano. Onde a luminância vira?
// ---------------------------------------------------------------------------
console.log('\nCHÃO — luminância do fundo sob o símbolo (x 50%..95%, ignorando a peça)');
let prev = null;
for (let y = Math.round(H * 0.7); y < H; y += 10) {
  let s = 0,
    n = 0;
  for (let x = Math.round(W * 0.5); x < Math.round(W * 0.95); x += 2) {
    const l = lum(at(x, y));
    if (l < 80) {
      s += l;
      n++;
    }
  }
  const v = s / n;
  const d = prev === null ? 0 : v - prev;
  console.log(
    `  y ${String(y).padStart(4)}  ${ph(y).padStart(6)}%   ${v.toFixed(2).padStart(6)}   ` +
      `${d >= 0 ? '+' : ''}${d.toFixed(2)}`,
  );
  prev = v;
}
