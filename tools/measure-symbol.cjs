/**
 * Medição rigorosa da geometria do símbolo a partir de references/logoNavite.png.
 *
 * Diferente da sondagem por raios (que é enviesada perto dos terminais, onde o raio
 * atravessa a peça longitudinalmente), aqui extraímos o contorno real e classificamos
 * cada pixel de borda em externo / interno / ambíguo pela direção da normal radial.
 * Só então ajustamos círculos por mínimos quadrados.
 *
 *   node tools/measure-symbol.cjs
 */
const { decodePNG } = require('./png.cjs');

const SRC = 'references/logoNavite.png';
const THRESHOLD = 140;
const PROBE = 3; // px de sondagem para dentro/fora

const { w, h, rgba } = decodePNG(SRC);
const mask = new Uint8Array(w * h);
let minX = w,
  maxX = 0,
  minY = h,
  maxY = 0;
for (let i = 0; i < w * h; i++) {
  const lum = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  if (lum > THRESHOLD) {
    mask[i] = 1;
    const x = i % w,
      y = (i / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);

// ---- componentes conexas (as duas crescentes) -------------------------------
const label = new Int32Array(w * h).fill(-1);
const comps = [];
for (let i = 0; i < w * h; i++) {
  if (!mask[i] || label[i] >= 0) continue;
  const id = comps.length;
  const stack = [i];
  label[i] = id;
  const pts = [];
  while (stack.length) {
    const p = stack.pop();
    pts.push(p);
    const x = p % w,
      y = (p / w) | 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (mask[q] && label[q] < 0) {
        label[q] = id;
        stack.push(q);
      }
    }
  }
  comps.push(pts);
}
comps.sort((a, b) => b.length - a.length);
const shapes = comps.filter((c) => c.length > 1000);

// centro de simetria = centro do bbox global
const CX = (minX + maxX) / 2;
const CY = (minY + maxY) / 2;

function fitCircle(pts) {
  const n = pts.length;
  let Sx = 0,
    Sy = 0,
    Sxx = 0,
    Syy = 0,
    Sxy = 0,
    Sxxx = 0,
    Syyy = 0,
    Sxyy = 0,
    Sxxy = 0;
  for (const [x, y] of pts) {
    Sx += x;
    Sy += y;
    Sxx += x * x;
    Syy += y * y;
    Sxy += x * y;
    Sxxx += x * x * x;
    Syyy += y * y * y;
    Sxyy += x * y * y;
    Sxxy += x * x * y;
  }
  const C = n * Sxx - Sx * Sx,
    D = n * Sxy - Sx * Sy,
    E = n * Sxxx + n * Sxyy - (Sxx + Syy) * Sx;
  const G = n * Syy - Sy * Sy,
    H = n * Sxxy + n * Syyy - (Sxx + Syy) * Sy;
  const a = (H * D - E * G) / (C * G - D * D);
  const b = (H * C - E * D) / (D * D - G * C);
  const cx = -a / 2,
    cy = -b / 2;
  const c = -(a * Sx + b * Sy + Sxx + Syy) / n;
  const r = Math.sqrt(cx * cx + cy * cy - c);
  let sum = 0,
    max = 0;
  for (const [x, y] of pts) {
    const e = Math.abs(Math.hypot(x - cx, y - cy) - r);
    sum += e;
    if (e > max) max = e;
  }
  return { cx, cy, r, meanErr: sum / n, maxErr: max, n };
}

const round = (v, d = 2) => Number(v.toFixed(d));
console.log(`imagem ${w}x${h}  bbox ${maxX - minX + 1}x${maxY - minY + 1}`);
console.log(`centro de simetria (bbox): ${round(CX, 1)}, ${round(CY, 1)}`);
console.log(`componentes >1000px: ${shapes.length}\n`);

const results = [];
shapes.forEach((pts) => {
  const outer = [],
    inner = [];
  let ambiguous = 0;
  for (const p of pts) {
    const x = p % w,
      y = (p / w) | 0;
    // é borda?
    if (at(x + 1, y) && at(x - 1, y) && at(x, y + 1) && at(x, y - 1)) continue;
    const vx = x - CX,
      vy = y - CY;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len,
      uy = vy / len;
    const out = at(Math.round(x + ux * PROBE), Math.round(y + uy * PROBE));
    const inn = at(Math.round(x - ux * PROBE), Math.round(y - uy * PROBE));
    if (!out && inn) outer.push([x, y]);
    else if (out && !inn) inner.push([x, y]);
    else ambiguous++;
  }
  const centroid = pts.reduce(
    (acc, p) => {
      acc[0] += p % w;
      acc[1] += (p / w) | 0;
      return acc;
    },
    [0, 0],
  );
  const side = centroid[0] / pts.length < CX ? 'ESQUERDA' : 'DIREITA';

  const fo = fitCircle(outer);
  const fi = fitCircle(inner);
  const d = Math.hypot(fi.cx - fo.cx, fi.cy - fo.cy);
  console.log(`--- crescente ${side} (${pts.length} px) ---`);
  console.log(
    `  borda externa: ${outer.length} pts, interna: ${inner.length}, ambígua: ${ambiguous}`,
  );
  console.log(
    `  círculo EXTERNO: centro (${round(fo.cx, 1)}, ${round(fo.cy, 1)})  R=${round(fo.r, 1)}  erroMédio=${round(fo.meanErr)}  erroMáx=${round(fo.maxErr, 1)}`,
  );
  console.log(
    `  círculo INTERNO: centro (${round(fi.cx, 1)}, ${round(fi.cy, 1)})  r=${round(fi.r, 1)}  erroMédio=${round(fi.meanErr)}  erroMáx=${round(fi.maxErr, 1)}`,
  );
  console.log(
    `  desvio do centro externo p/ centro de simetria: ${round(Math.hypot(fo.cx - CX, fo.cy - CY), 1)} px`,
  );
  console.log(
    `  offset interno→externo: |d|=${round(d, 1)}  direção=${round((Math.atan2(-(fi.cy - fo.cy), fi.cx - fo.cx) * 180) / Math.PI, 1)}°`,
  );
  console.log(
    `  normalizado: r/R=${round(fi.r / fo.r, 4)}  d/R=${round(d / fo.r, 4)}  R−r−d=${round(fo.r - fi.r - d, 2)}px`,
  );
  results.push({ side, fo, fi, d });
});

// ---- extensão angular e terminais -------------------------------------------
console.log('\n--- cobertura angular (0°=leste, anti-horário) ---');
const covered = [];
for (let a = 0; a < 360; a += 0.25) {
  const rad = (a * Math.PI) / 180,
    dx = Math.cos(rad),
    dy = -Math.sin(rad);
  let hit = false;
  for (let r = 150; r <= 520; r += 0.5) {
    if (at(Math.round(CX + dx * r), Math.round(CY + dy * r))) {
      hit = true;
      break;
    }
  }
  covered.push([a, hit]);
}
const edges = [];
for (let i = 0; i < covered.length; i++) {
  const prev = covered[(i - 1 + covered.length) % covered.length];
  if (covered[i][1] !== prev[1])
    edges.push({ type: covered[i][1] ? 'inicia' : 'termina', a: covered[i][0] });
}
console.log('  ' + edges.map((e) => `${e.type} @ ${e.a}°`).join('  |  '));
const gapA = 91.5 - 68,
  gapB = 269.75 - 246.75;
console.log(`  vãos aproximados: ${round(gapA, 2)}° e ${round(gapB, 2)}°`);

// ---- simetria de 180° --------------------------------------------------------
let agree = 0,
  total = 0;
for (let y = minY; y <= maxY; y += 2) {
  for (let x = minX; x <= maxX; x += 2) {
    const rx = Math.round(2 * CX - x),
      ry = Math.round(2 * CY - y);
    total++;
    if (at(x, y) === at(rx, ry)) agree++;
  }
}
console.log(`\nsimetria rotacional de 180°: ${round((100 * agree) / total, 2)}% de concordância`);
