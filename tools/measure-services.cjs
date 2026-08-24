/**
 * APOSENTADO NA FASE 14 — `references/services-reference.png` não existe mais no
 * repositório, e a composição que ele media (moldura + coluna de maquete) foi
 * substituída por arte sangrando pelo card inteiro. Fica como registro de
 * método; ver a nota em tools/compare-servicos.cjs.
 *
 * ---
 *
 * Mede a composição do services-reference.png.
 *
 * O que a Fase 7 precisa saber e não dá para estimar a olho: a caixa do painel
 * do card, a espessura e a cor da borda, onde ficam o numeral e o indicador de
 * progresso de quatro traços, e as faixas de texto dentro e fora do card.
 *
 * TRÊS DETECTORES, porque um limiar só não separa as três coisas:
 *
 *   borda    CRISTA de luminância. A borda do painel é uma linha de 1px alguns
 *            pontos mais clara que o fundo dos dois lados. Um limiar absoluto
 *            não a encontra — ela é mais escura que qualquer texto — mas ela é
 *            um máximo local em x (ou em y) ao longo de centenas de pixels.
 *   texto    luminância absoluta, restrita a uma caixa.
 *   traços   componentes conexos numa faixa estreita: os quatro segmentos do
 *            indicador são retângulos de 4px de altura separados por vãos.
 *
 * Tudo sai em fração da largura/altura, que é o que vira vw/vh no CSS.
 *
 *   node tools/measure-services.cjs
 */
const { decodePNG } = require('./png.cjs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'references', 'services-reference.png');
const { w: W, h: H, rgba } = decodePNG(FILE);

const at = (x, y) => (y * W + x) * 4;
const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
const pw = (v) => ((100 * v) / W).toFixed(2);
const ph = (v) => ((100 * v) / H).toFixed(2);
const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function amostra(x0, y0, x1, y1) {
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = at(x, y);
      r += rgba[i];
      g += rgba[i + 1];
      b += rgba[i + 2];
      n++;
    }
  return { hex: hex(r / n, g / n, b / n), l: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n, n };
}

console.log(`services-reference.png  ${W}x${H}\n`);

// ---------------------------------------------------------------------------
// 1. a caixa do painel — por crista de luminância
// ---------------------------------------------------------------------------
/** Quantas linhas de `faixa` têm um máximo local em x, com contraste mínimo. */
function cristaVertical(x, y0, y1, minDelta) {
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    const c = lum(at(x, y));
    if (c - lum(at(x - 2, y)) > minDelta && c - lum(at(x + 2, y)) > minDelta) n++;
  }
  return n;
}
function cristaHorizontal(y, x0, x1, minDelta) {
  let n = 0;
  for (let x = x0; x <= x1; x++) {
    const c = lum(at(x, y));
    if (c - lum(at(x, y - 2)) > minDelta && c - lum(at(x, y + 2)) > minDelta) n++;
  }
  return n;
}

const DELTA = 2.5;
const colunas = [];
for (let x = Math.round(W * 0.5); x < W - 3; x++) {
  const n = cristaVertical(x, Math.round(H * 0.12), Math.round(H * 0.86), DELTA);
  if (n > H * 0.74 * 0.55) colunas.push({ x, n });
}
const linhas = [];
for (let y = 3; y < H - 3; y++) {
  const n = cristaHorizontal(y, Math.round(W * 0.6), Math.round(W * 0.95), DELTA);
  if (n > W * 0.35 * 0.55) linhas.push({ y, n });
}
console.log('bordas verticais do painel (x, linhas na crista):');
for (const c of colunas) console.log(`   x=${c.x}  ${pw(c.x)}vw   n=${c.n}`);
console.log('bordas horizontais do painel (y, colunas na crista):');
for (const l of linhas) console.log(`   y=${l.y}  ${ph(l.y)}vh   n=${l.n}`);

const PX0 = colunas[0]?.x,
  PX1 = colunas[colunas.length - 1]?.x;
const PY0 = linhas[0]?.y,
  PY1 = linhas[linhas.length - 1]?.y;
if (PX0 && PX1 && PY0 && PY1) {
  console.log(
    `\npainel: x ${pw(PX0)}..${pw(PX1)}vw (largura ${pw(PX1 - PX0)}vw) · ` +
      `y ${ph(PY0)}..${ph(PY1)}vh (altura ${ph(PY1 - PY0)}vh)`,
  );
  console.log(`  borda   ${amostra(PX0, Math.round(H * 0.4), PX0, Math.round(H * 0.6)).hex}`);
  console.log(
    `  dentro  ${amostra(PX0 + 6, Math.round(H * 0.55), PX0 + 30, Math.round(H * 0.6)).hex}`,
  );
  console.log(
    `  fora    ${amostra(PX0 - 30, Math.round(H * 0.55), PX0 - 6, Math.round(H * 0.6)).hex}`,
  );
}

// ---------------------------------------------------------------------------
// 2. faixas de tinta — perfil de linhas, dentro de uma caixa
// ---------------------------------------------------------------------------
function faixas(x0, y0, x1, y1, limiar, minAltura = 2) {
  const perfil = [];
  for (let y = y0; y <= y1; y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (lum(at(x, y)) > limiar) n++;
    perfil.push(n);
  }
  const out = [];
  let s = -1;
  for (let i = 0; i < perfil.length; i++) {
    const tem = (perfil[i] ?? 0) > 0;
    if (tem && s < 0) s = i;
    else if (!tem && s >= 0) {
      if (i - s >= minAltura) out.push({ y0: s + y0, y1: i - 1 + y0, h: i - s });
      s = -1;
    }
  }
  if (s >= 0 && perfil.length - s >= minAltura)
    out.push({ y0: s + y0, y1: y1, h: perfil.length - s });
  // extensão horizontal de cada faixa
  for (const f of out) {
    let a = x1,
      b = x0;
    for (let y = f.y0; y <= f.y1; y++)
      for (let x = x0; x <= x1; x++)
        if (lum(at(x, y)) > limiar) {
          if (x < a) a = x;
          if (x > b) b = x;
        }
    f.x0 = a;
    f.x1 = b;
  }
  return out;
}

function relatorio(titulo, bandas) {
  console.log(`\n${titulo}`);
  console.log('      y0      y1    alt      x0      x1   largura   cor');
  for (const f of bandas) {
    const c = amostra(f.x0, f.y0, f.x1, f.y1);
    console.log(
      `  ${ph(f.y0).padStart(6)}  ${ph(f.y1).padStart(6)}  ${String(f.h).padStart(4)}  ` +
        `${pw(f.x0).padStart(6)}  ${pw(f.x1).padStart(6)}  ${pw(f.x1 - f.x0).padStart(7)}   ${c.hex}`,
    );
  }
}

if (PX0 && PY0) {
  // coluna de texto do card: da borda até o começo do visual
  relatorio(
    'texto do card (x 59..72vw)',
    faixas(Math.round(W * 0.594), PY0 + 4, Math.round(W * 0.725), PY1 - 4, 60),
  );
}
relatorio(
  'coluna esquerda (x 4..30vw)',
  faixas(Math.round(W * 0.04), 0, Math.round(W * 0.3), H - 1, 60),
);
relatorio(
  'canto inferior direito (x 84..96vw, y 88..98vh)',
  faixas(Math.round(W * 0.84), Math.round(H * 0.88), Math.round(W * 0.96), H - 1, 55),
);
relatorio(
  'canto inferior esquerdo (x 2..12vw, y 86..96vh)',
  faixas(
    Math.round(W * 0.02),
    Math.round(H * 0.86),
    Math.round(W * 0.12),
    Math.round(H * 0.96),
    40,
    1,
  ),
);
