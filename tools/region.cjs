const { decodePNG } = require('./png.cjs');
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
function rgb2hsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2;
  let hh = 0,
    s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
  }
  return `hsl(${Math.round(hh)},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`;
}
// args: file x0 y0 x1 y1 (fractions)
const [file, ...rest] = process.argv.slice(2);
const label = rest[4] || '';
const [fx0, fy0, fx1, fy1] = rest.slice(0, 4).map(Number);
const { w, h, rgba } = decodePNG(file);
const x0 = Math.round(fx0 * w),
  y0 = Math.round(fy0 * h),
  x1 = Math.round(fx1 * w),
  y1 = Math.round(fy1 * h);
const buckets = new Map();
let maxLum = 0,
  maxCol = null;
// also row/col ink profile to measure glyph metrics
const rowInk = new Array(y1 - y0).fill(0),
  colInk = new Array(x1 - x0).fill(0);
for (let y = y0; y < y1; y++)
  for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 4,
      r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 70) {
      rowInk[y - y0]++;
      colInk[x - x0]++;
    }
    if (lum < 100) continue;
    if (lum > maxLum) {
      maxLum = lum;
      maxCol = [r, g, b];
    }
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    if (!buckets.has(k)) buckets.set(k, { n: 0, r: 0, g: 0, b: 0 });
    const o = buckets.get(k);
    o.n++;
    o.r += r;
    o.g += g;
    o.b += b;
  }
console.log(`\n--- ${label} [${x0},${y0}]..[${x1},${y1}] of ${w}x${h} ---`);
const bs = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 5);
for (const o of bs) {
  const r = Math.round(o.r / o.n),
    g = Math.round(o.g / o.n),
    b = Math.round(o.b / o.n);
  console.log(`   ${hex(r, g, b)} ${rgb2hsl(r, g, b)}  n=${o.n}`);
}
if (maxCol) console.log(`   brightest: ${hex(...maxCol)} ${rgb2hsl(...maxCol)}`);
// ink runs (rows)
const runs = [];
let s = -1;
for (let i = 0; i < rowInk.length; i++) {
  if (rowInk[i] > 1 && s < 0) s = i;
  else if (rowInk[i] <= 1 && s >= 0) {
    runs.push([s + y0, i - 1 + y0, i - s]);
    s = -1;
  }
}
if (s >= 0) runs.push([s + y0, rowInk.length - 1 + y0, rowInk.length - s]);
console.log('   row ink runs (yStart,yEnd,height):', runs.map((r) => r.join('-')).join('  '));
const cruns = [];
s = -1;
for (let i = 0; i < colInk.length; i++) {
  if (colInk[i] > 0 && s < 0) s = i;
  else if (colInk[i] <= 0 && s >= 0) {
    cruns.push([s + x0, i - 1 + x0]);
    s = -1;
  }
}
if (s >= 0) cruns.push([s + x0, colInk.length - 1 + x0]);
console.log(
  '   col extent:',
  cruns.length ? `${cruns[0][0]} .. ${cruns[cruns.length - 1][1]}` : 'none',
  ` (${cruns.length} runs)`,
);
