/**
 * Os terminais da crescente: a ponta fina fecha em zero (cúspide) ou é um corte
 * estreito? E qual a largura real da face do corte reto?
 *
 * Rays quase tangentes são pouco confiáveis perto da ponta, então aqui medimos
 * a espessura PERPENDICULAR ao arco, não ao longo do raio.
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
const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);

// Círculo externo ajustado para o lobo esquerdo (tools/diagnose-edges.cjs)
const O = { x: 635.3, y: 589.6, r: 398.15 };
const deg = (d) => (d * Math.PI) / 180;
const R2 = (v, d = 2) => Number(v.toFixed(d));

/**
 * Espessura medida ao longo da NORMAL do círculo externo, no ângulo `phi`
 * medido a partir do centro do círculo externo O.
 */
function thicknessAt(phi) {
  const ux = Math.cos(deg(phi)),
    uy = -Math.sin(deg(phi));
  let firstIn = null,
    lastIn = null;
  // caminha de fora para dentro ao longo da normal
  for (let t = O.r + 12; t > O.r - 140; t -= 0.05) {
    const on = at(Math.round(O.x + ux * t), Math.round(O.y + uy * t));
    if (on) {
      if (firstIn === null) firstIn = t;
      lastIn = t;
    }
  }
  if (firstIn === null) return null;
  return { outer: firstIn, inner: lastIn, thickness: firstIn - lastIn };
}

console.log('Lobo ESQUERDO — espessura perpendicular, ângulo a partir do centro EXTERNO\n');
console.log('  phi     rOut     rIn    espessura');
for (const phi of [
  95, 100, 110, 130, 150, 170, 190, 210, 225, 235, 240, 243, 245, 247, 249, 251, 253,
]) {
  const t = thicknessAt(phi);
  if (!t) {
    console.log(`  ${String(phi).padStart(3)}°     —        —      (sem material)`);
    continue;
  }
  console.log(
    `  ${String(phi).padStart(3)}°  ${R2(t.outer, 1).toString().padStart(6)}  ${R2(t.inner, 1).toString().padStart(6)}   ${R2(t.thickness, 1).toString().padStart(6)}`,
  );
}

// Varredura fina para achar onde o material acaba de cada lado
function sweepEnd(from, to, step) {
  let last = null;
  for (let phi = from; step > 0 ? phi <= to : phi >= to; phi += step) {
    const t = thicknessAt(phi);
    if (!t || t.thickness < 0.5) return { phi, last };
    last = { phi, ...t };
  }
  return { phi: null, last };
}

const tipEnd = sweepEnd(240, 262, 0.1);
const cutEnd = sweepEnd(100, 80, -0.1);
console.log(
  `\nponta: material acaba em phi=${R2(tipEnd.phi, 1)}° (última espessura ${R2(tipEnd.last?.thickness ?? 0, 2)}px)`,
);
console.log(
  `corte: material acaba em phi=${R2(cutEnd.phi, 1)}° (última espessura ${R2(cutEnd.last?.thickness ?? 0, 2)}px)`,
);

// Largura da face do corte reto: pixels do contorno dentro de uma faixa estreita
// logo após o corte.
if (cutEnd.last) {
  console.log(
    `\nface do corte: ~${R2(cutEnd.last.thickness, 1)}px de largura, entre raios ${R2(cutEnd.last.inner, 1)} e ${R2(cutEnd.last.outer, 1)} do centro externo`,
  );
}
