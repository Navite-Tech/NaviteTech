/**
 * Diagnóstico: as bordas da crescente são arcos de círculo de verdade?
 *
 * Aproveita a simetria rotacional de 180% (98,17% medida) para sobrepor as duas
 * crescentes e cancelar ruído de rasterização, depois olha o resíduo do ajuste
 * circular em função do ângulo. Ruído sem estrutura => círculo. Estrutura
 * sistemática => a borda não é circular e precisa de outra representação.
 */
const { decodePNG } = require('./png.cjs');

const { w, h, rgba } = decodePNG('references/logoNavite.png');
const mask = new Uint8Array(w * h);
let minX = w,
  maxX = 0,
  minY = h,
  maxY = 0;
for (let i = 0; i < w * h; i++) {
  const lum = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  if (lum > 140) {
    mask[i] = 1;
    const x = i % w,
      y = (i / w) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const CX = (minX + maxX) / 2,
  CY = (minY + maxY) / 2;
const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);

/**
 * Amostragem sub-pixel: para um ângulo, caminha ao longo do raio e interpola
 * a transição de cobertura para achar rIn/rOut com precisão ~0,05px.
 */
function edgesAt(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180,
    dx = Math.cos(rad),
    dy = -Math.sin(rad);
  const hits = [];
  let prev = 0;
  for (let r = 200; r <= 480; r += 0.05) {
    const cur = at(Math.round(CX + dx * r), Math.round(CY + dy * r));
    if (cur !== prev) hits.push({ r, entering: cur === 1 });
    prev = cur;
  }
  if (hits.length < 2) return null;
  const first = hits.find((v) => v.entering);
  const last = [...hits].reverse().find((v) => !v.entering);
  if (!first || !last) return null;
  return { rIn: first.r, rOut: last.r };
}

// A crescente ESQUERDA cobre ~91,5°..246,75°. Amostramos a faixa segura,
// longe do corte reto (91,5°) e da ponta (246,75°).
const SAFE_FROM = 105,
  SAFE_TO = 230;
const samples = [];
for (let a = SAFE_FROM; a <= SAFE_TO; a += 0.5) {
  const e = edgesAt(a);
  // amostra do lado oposto, rotacionada 180°, para dobrar os dados
  const e2 = edgesAt(a + 180 > 360 ? a - 180 : a + 180);
  if (e) samples.push({ a, ...e, lobe: 'esq' });
  if (e2) samples.push({ a, rIn: e2.rIn, rOut: e2.rOut, lobe: 'dir' });
}

function fitCircleFromPolar(pts, key) {
  const xy = pts.map((p) => {
    const rad = (p.a * Math.PI) / 180;
    return [CX + Math.cos(rad) * p[key], CY - Math.sin(rad) * p[key]];
  });
  const n = xy.length;
  let Sx = 0,
    Sy = 0,
    Sxx = 0,
    Syy = 0,
    Sxy = 0,
    Sxxx = 0,
    Syyy = 0,
    Sxyy = 0,
    Sxxy = 0;
  for (const [x, y] of xy) {
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
  const residuals = xy.map(([x, y], i) => ({ a: pts[i].a, e: Math.hypot(x - cx, y - cy) - r }));
  return { cx, cy, r, residuals };
}

const R2 = (v, d = 2) => Number(v.toFixed(d));

for (const lobe of ['esq', 'dir']) {
  const pts = samples.filter((s) => s.lobe === lobe);
  console.log(`\n===== lobo ${lobe.toUpperCase()} (${pts.length} amostras sub-pixel) =====`);
  for (const key of ['rOut', 'rIn']) {
    const f = fitCircleFromPolar(pts, key);
    const errs = f.residuals.map((r) => r.e);
    const mean = errs.reduce((s, v) => s + Math.abs(v), 0) / errs.length;
    const max = Math.max(...errs.map(Math.abs));
    console.log(
      `  ${key === 'rOut' ? 'EXTERNA' : 'INTERNA'}: centro (${R2(f.cx, 1)}, ${R2(f.cy, 1)})  raio=${R2(f.r, 2)}  |erro| médio=${R2(mean, 3)}  máx=${R2(max, 2)}`,
    );
    // resíduo amostrado a cada 25° para ver estrutura
    const line = f.residuals
      .filter((_, i) => i % 50 === 0)
      .map((r) => `${Math.round(r.a)}°:${r.e >= 0 ? '+' : ''}${R2(r.e, 1)}`)
      .join('  ');
    console.log(`     resíduo por ângulo: ${line}`);
  }
}
