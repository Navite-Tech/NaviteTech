/**
 * Mede a composição do símbolo em qualquer referência — PNG estático ou frame de
 * vídeo — e reporta os números no formato exato de lib/symbol/states.ts.
 *
 * É daqui que sai a coreografia. Nenhum valor de states.ts é estimado.
 *
 * O que a ferramenta resolve, e que olhar não resolve:
 *
 *   • separar as duas crescentes de cubos, tipografia e marcadores (componentes
 *     conexos com área mínima, não varredura de colunas — os elementos se
 *     sobrepõem em x);
 *   • dizer QUAL metade é qual. A crescente esquerda tem o corte reto em cima e
 *     a ponta embaixo; a direita é o inverso. Comparar a espessura do material
 *     no topo e na base da caixa identifica cada uma sem depender da posição —
 *     o que importa quando só uma delas está em cena (seção Serviços);
 *   • converter a caixa medida no pixel para o CENTRO DO VIEWBOX de cada metade,
 *     que é o que a camada persistente posiciona. A caixa do relevo não é
 *     concêntrica com o viewBox, e ignorar isso produziu, numa primeira medição,
 *     um desencaixe vertical de 3,8vh que simplesmente não existe.
 *
 *   node tools/measure-composition.cjs references/hero-reference.png
 *   node tools/measure-composition.cjs .shots/ref/flow-symbol-transition
 */
const fs = require('node:fs');
const path = require('node:path');
const { decodePNG } = require('./png.cjs');

const INK = 92;
const MIN_AREA = 1500; // descarta cubos, marcadores e tipografia

// Espelha lib/symbol/geometry.ts e lib/symbol/light.ts.
const geo = fs.readFileSync('lib/symbol/geometry.ts', 'utf8');
const m = geo.match(/CRESCENT_BBOX = \{ x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+)/);
const FACE = { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
const light = fs.readFileSync('lib/symbol/light.ts', 'utf8');
const off = light.match(/EXTRUDE_OFFSET = \{ x: (-?[\d.]+), y: (-?[\d.]+)/);
const OFF = { x: +off[1], y: +off[2] };
const V = 1000;

/** Caixa do relevo de cada metade, em unidades de viewBox. */
const RELIEF = {
  left: {
    x: FACE.x + Math.min(0, OFF.x),
    y: FACE.y + Math.min(0, OFF.y),
    w: FACE.w + Math.abs(OFF.x),
    h: FACE.h + Math.abs(OFF.y),
  },
  right: {
    x: V - FACE.x - FACE.w + Math.min(0, OFF.x),
    y: V - FACE.y - FACE.h + Math.min(0, OFF.y),
    w: FACE.w + Math.abs(OFF.x),
    h: FACE.h + Math.abs(OFF.y),
  },
};

/** Componentes conexos de 4 vizinhos, iterativo (a pilha nativa não aguenta). */
function components(w, h, mask) {
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  const out = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!mask[p0] || label[p0] >= 0) continue;
    const id = out.length;
    const c = { n: 0, x0: w, y0: h, x1: -1, y1: -1, px: [] };
    let sp = 0;
    stack[sp++] = p0;
    label[p0] = id;
    while (sp) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      c.n++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (const [ok, q] of [
        [x > 0, p - 1],
        [x < w - 1, p + 1],
        [y > 0, p - w],
        [y < h - 1, p + w],
      ]) {
        if (ok && mask[q] && label[q] < 0) {
          label[q] = id;
          stack[sp++] = q;
        }
      }
    }
    out.push({ ...c, label, id });
  }
  return out;
}

/**
 * Corte reto em cima ou ponta em cima?
 *
 * O corte reto tem ~93 unidades de espessura; a ponta afina até zero. Medimos
 * quanto material existe nos 8% superiores e nos 8% inferiores da caixa: o lado
 * mais "cheio" é o do corte. Corte em cima = crescente ESQUERDA.
 */
function sideOf(c, w, mask) {
  const h = c.y1 - c.y0 + 1;
  const band = Math.max(3, Math.round(h * 0.08));
  const count = (yA, yB) => {
    let n = 0;
    for (let y = yA; y < yB; y++) for (let x = c.x0; x <= c.x1; x++) if (mask[y * w + x]) n++;
    return n;
  };
  const top = count(c.y0, c.y0 + band);
  const bot = count(c.y1 - band + 1, c.y1 + 1);
  return { side: top >= bot ? 'left' : 'right', top, bot };
}

/** Converte a caixa medida em pixel para o centro do viewBox daquela metade. */
function viewBoxCenter(c, side) {
  const boxH = c.y1 - c.y0 + 1;
  const r = RELIEF[side];
  const sidePx = (boxH * V) / r.h; // lado do SVG em pixels
  const u = sidePx / V; // pixels por unidade de viewBox
  return {
    cx: c.x0 - r.x * u + sidePx / 2,
    cy: c.y0 - r.y * u + sidePx / 2,
    sidePx,
  };
}

function measure(file) {
  const { w, h, rgba } = decodePNG(file);
  const mask = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4)
    mask[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2] > INK ? 1 : 0;

  const comps = components(w, h, mask)
    .filter((c) => c.n >= MIN_AREA)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2);

  const halves = {};
  for (const c of comps) {
    const { side } = sideOf(c, w, mask);
    const v = viewBoxCenter(c, side);
    // Duas do mesmo lado significa que a heurística falhou; fica a maior.
    if (halves[side]) continue;
    halves[side] = {
      x: (100 * v.cx) / w,
      y: (100 * v.cy) / h,
      size: (100 * v.sidePx) / h,
      boxH: (100 * (c.y1 - c.y0 + 1)) / h,
      area: c.n,
    };
  }
  return { w, h, halves };
}

// --- entrada -----------------------------------------------------------------
const target = process.argv[2];
if (!target || !fs.existsSync(target)) {
  console.error('uso: node tools/measure-composition.cjs <arquivo.png | diretório>');
  process.exit(1);
}
const files = fs.statSync(target).isDirectory()
  ? fs
      .readdirSync(target)
      .filter((f) => f.endsWith('.png'))
      .sort(
        (a, b) =>
          parseFloat(a.replace(/[^\d_.]/g, '').replace('_', '.')) -
          parseFloat(b.replace(/[^\d_.]/g, '').replace('_', '.')),
      )
      .map((f) => path.join(target, f))
  : [target];

const f3 = (v) => (v == null ? '   —  ' : v.toFixed(2).padStart(6));
console.log('centro do viewBox de cada metade, em unidades de states.ts');
console.log('  x = %da largura   y = %da altura   size = lado do SVG em %da altura\n');
console.log(
  'arquivo                             esquerda x /  y  / size     direita x /  y  / size    Δx',
);

const rows = [];
for (const file of files) {
  const r = measure(file);
  const L = r.halves.left;
  const R = r.halves.right;
  rows.push({ file, L, R });
  const name = path.basename(file).replace(/\.png$/, '');
  console.log(
    `  ${name.padEnd(32)} ${f3(L?.x)} ${f3(L?.y)} ${f3(L?.size)}    ` +
      `${f3(R?.x)} ${f3(R?.y)} ${f3(R?.size)}   ${L && R ? f3(R.x - L.x) : '   —  '}`,
  );
}

if (rows.length > 1) {
  const withBoth = rows.filter((r) => r.L && r.R);
  if (withBoth.length) {
    const peak = withBoth.reduce((a, b) => (b.R.x - b.L.x > a.R.x - a.L.x ? b : a));
    const first = withBoth[0];
    const last = withBoth[withBoth.length - 1];
    console.log('\nleitura da curva:');
    console.log(
      `  repouso   Δx ${(first.R.x - first.L.x).toFixed(2)}vw   size ${first.L.size.toFixed(2)}vh`,
    );
    console.log(
      `  pico      Δx ${(peak.R.x - peak.L.x).toFixed(2)}vw   size ${peak.L.size.toFixed(2)}vh   em ${path.basename(peak.file)}`,
    );
    console.log(
      `  final     Δx ${(last.R.x - last.L.x).toFixed(2)}vw   size ${last.L.size.toFixed(2)}vh`,
    );
    const over =
      (peak.R.x - peak.L.x - (last.R.x - last.L.x)) /
      (last.R.x - last.L.x - (first.R.x - first.L.x));
    console.log(`  ultrapassagem da separação: ${(100 * over).toFixed(1)}% do curso`);
  }
}
