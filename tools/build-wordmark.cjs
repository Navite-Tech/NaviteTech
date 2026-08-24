/**
 * Constrói public/brand/wordmark.svg a partir de
 * references/navite-symbol-to-use-in-Header-official.png.
 *
 * O requisito do briefing é preservar RIGOROSAMENTE proporções, espaçamento e
 * hierarquia NAVITE / TECH — então nada aqui é redesenhado à mão: os glifos são
 * traçados do PNG aprovado com o mesmo pipeline já validado no símbolo, e as
 * posições relativas vêm direto da medição.
 *
 * As duas palavras têm cores diferentes na marca (NAVITE em bone, TECH em
 * brass), então são separadas por matiz, não só por luminância.
 *
 *   node tools/build-wordmark.cjs
 */
const fs = require('node:fs');
const { loadField, traceContours, fitLoop, emitPath, fitError, bbox } = require('./trace.cjs');

const SRC = 'references/navite-symbol-to-use-in-Header-official.png';
const TOL_PX = 0.45;

// Tudo que não é o fundo navy. NAVITE ~#FCFCFC (lum 252), TECH ~#A49C7A
// (lum 155), fundo ~#001226 (lum 17). Limiar em 85 separa com folga.
const img = loadField(SRC, (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b - 85);
console.log(`imagem ${img.w}x${img.h}`);

const loops = traceContours(img, { x0: 0, y0: 0, x1: img.w - 1, y1: img.h - 1 });
console.log(`contornos: ${loops.length}`);

// ---------------------------------------------------------------------------
// Classificação: cada contorno é um glifo (nenhuma destas letras tem contraforma
// fechada — o A é um Λ sem travessão). Separamos as duas palavras pela faixa
// vertical e ordenamos da esquerda para a direita.
// ---------------------------------------------------------------------------
const glyphs = loops.map((loop) => {
  const bb = bbox(loop);
  return { loop, bb };
});
const midY =
  (Math.min(...glyphs.map((g) => g.bb.y0)) + Math.max(...glyphs.map((g) => g.bb.y1))) / 2;
const upper = glyphs
  .filter((g) => (g.bb.y0 + g.bb.y1) / 2 < midY)
  .sort((a, b) => a.bb.x0 - b.bb.x0);
const lower = glyphs
  .filter((g) => (g.bb.y0 + g.bb.y1) / 2 >= midY)
  .sort((a, b) => a.bb.x0 - b.bb.x0);

console.log(`palavra de cima: ${upper.length} glifos   palavra de baixo: ${lower.length} glifos`);

const NAVITE = 'NAVITE'.split('');
const TECH = 'TECH'.split('');
if (upper.length !== NAVITE.length || lower.length !== TECH.length) {
  console.error(
    `\nesperava ${NAVITE.length} glifos em cima e ${TECH.length} embaixo; ` +
      `achei ${upper.length} e ${lower.length}. Contornos (x0,y0,w,h):`,
  );
  for (const g of glyphs)
    console.error(
      `  (${g.bb.x0.toFixed(1)}, ${g.bb.y0.toFixed(1)}) ${g.bb.w.toFixed(1)}x${g.bb.h.toFixed(1)}  ${g.loop.length}pts`,
    );
  process.exit(1);
}
upper.forEach((g, i) => (g.char = NAVITE[i]));
lower.forEach((g, i) => (g.char = TECH[i]));

// ---------------------------------------------------------------------------
// Métricas da marca — o que precisa ser preservado
// ---------------------------------------------------------------------------
const upperBB = bbox(upper.flatMap((g) => g.loop));
const lowerBB = bbox(lower.flatMap((g) => g.loop));
const capNavite = upperBB.h;
const capTech = lowerBB.h;
const gap = lowerBB.y0 - upperBB.y1;

const n2 = (v) => Number(v.toFixed(2));
console.log('\n--- métricas medidas (px do PNG) ---');
console.log(`NAVITE: largura ${n2(upperBB.w)}  altura de caixa ${n2(capNavite)}`);
console.log(`TECH:   largura ${n2(lowerBB.w)}  altura de caixa ${n2(capTech)}`);
console.log(`razão altura TECH / NAVITE: ${n2(capTech / capNavite)}`);
console.log(
  `vão vertical entre as palavras: ${n2(gap)}  (${n2(gap / capNavite)} da caixa do NAVITE)`,
);
console.log(`razão largura/altura do NAVITE: ${n2(upperBB.w / capNavite)}`);
console.log(
  `centro horizontal — NAVITE ${n2((upperBB.x0 + upperBB.x1) / 2)}, TECH ${n2((lowerBB.x0 + lowerBB.x1) / 2)}` +
    `  (deslocamento ${n2((lowerBB.x0 + lowerBB.x1) / 2 - (upperBB.x0 + upperBB.x1) / 2)}px)`,
);

// tracking: espaço entre glifos vizinhos, normalizado pela altura de caixa
function tracking(list) {
  const gaps = [];
  for (let i = 1; i < list.length; i++) gaps.push(list[i].bb.x0 - list[i - 1].bb.x1);
  return gaps;
}
const tNav = tracking(upper);
const tTech = tracking(lower);
console.log(
  `vãos NAVITE: ${tNav.map(n2).join(', ')}  (médio ${n2(tNav.reduce((a, b) => a + b, 0) / tNav.length)})`,
);
console.log(
  `vãos TECH:   ${tTech.map(n2).join(', ')}  (médio ${n2(tTech.reduce((a, b) => a + b, 0) / tTech.length)})`,
);

// ---------------------------------------------------------------------------
// Ajuste e emissão
// ---------------------------------------------------------------------------
// viewBox normalizado pela caixa total das duas palavras, com origem no canto
// superior esquerdo do NAVITE. Assim o consumidor controla só a altura.
const totalBB = {
  x0: Math.min(upperBB.x0, lowerBB.x0),
  y0: upperBB.y0,
  x1: Math.max(upperBB.x1, lowerBB.x1),
  y1: lowerBB.y1,
};
const totalW = totalBB.x1 - totalBB.x0;
const totalH = totalBB.y1 - totalBB.y0;
const VIEW_H = 200;
const S = VIEW_H / totalH;
const VIEW_W = Number((totalW * S).toFixed(2));
const M = (p) => ({ x: (p.x - totalBB.x0) * S, y: (p.y - totalBB.y0) * S });

let worstMean = 0,
  worstMax = 0;
function build(list) {
  return list.map((g) => {
    const fitted = fitLoop(g.loop, { tolPx: TOL_PX, resamplePx: 1.0, smoothWin: 3, trimPts: 4 });
    const e = fitError(fitted);
    worstMean = Math.max(worstMean, e.mean);
    worstMax = Math.max(worstMax, e.max);
    const curves = fitted.segments.reduce(
      (s, x) => s + (x.kind === 'bezier' ? x.chain.length : 1),
      0,
    );
    console.log(
      `  ${g.char}: ${fitted.corners.length} cantos, ${curves} comandos, erro ${n2(e.mean)}/${n2(e.max)}px`,
    );
    return { char: g.char, d: emitPath(fitted, M) };
  });
}

console.log('\n--- ajuste NAVITE ---');
const navitePaths = build(upper);
console.log('--- ajuste TECH ---');
const techPaths = build(lower);
console.log(`\nerro máximo global: médio ${n2(worstMean)}px  máximo ${n2(worstMax)}px`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="NAVITE TECH">
  <g class="wordmark-navite" fill="currentColor">
${navitePaths.map((p) => `    <path d="${p.d}"/>`).join('\n')}
  </g>
  <g class="wordmark-tech" fill="var(--brass, currentColor)">
${techPaths.map((p) => `    <path d="${p.d}"/>`).join('\n')}
  </g>
</svg>
`;
fs.writeFileSync('public/brand/wordmark.svg', svg);

fs.writeFileSync(
  'public/brand/wordmark-geometry.json',
  JSON.stringify(
    {
      source: SRC,
      note: 'Vetor canônico de implementação, traçado do PNG aprovado. Não é master oficial da marca.',
      viewBox: { w: VIEW_W, h: VIEW_H },
      // Caixa ocupada pelo wordmark dentro do PNG de origem, para sobrepor
      // exatamente na validação visual.
      sourceBox: { x: n2(totalBB.x0), y: n2(totalBB.y0), w: n2(totalW), h: n2(totalH) },
      metrics: {
        capHeightNavite: n2(capNavite * S),
        capHeightTech: n2(capTech * S),
        capRatioTechOverNavite: n2(capTech / capNavite),
        verticalGap: n2(gap * S),
        gapOverCapNavite: n2(gap / capNavite),
        widthOverCapNavite: n2(upperBB.w / capNavite),
        letterGapsNavite: tNav.map((v) => n2(v * S)),
        letterGapsTech: tTech.map((v) => n2(v * S)),
      },
      fitErrorPx: { mean: n2(worstMean), max: n2(worstMax) },
    },
    null,
    2,
  ) + '\n',
);

fs.mkdirSync('lib/brand', { recursive: true });
fs.writeFileSync(
  'lib/brand/wordmark.ts',
  [
    '// GERADO por tools/build-wordmark.cjs — não editar à mão.',
    `// Vetor canônico de implementação, traçado de`,
    `// ${SRC}.`,
    '// Proporções, espaçamento e hierarquia NAVITE / TECH preservados da arte.',
    '// Ver public/brand/README.md.',
    '',
    `export const WORDMARK_VIEWBOX = { w: ${VIEW_W}, h: ${VIEW_H} } as const;`,
    '',
    '/** Glifos de NAVITE — recebem a cor principal. */',
    'export const NAVITE_PATHS: readonly string[] = [',
    ...navitePaths.map((p) => `  '${p.d}',`),
    '];',
    '',
    '/** Glifos de TECH — recebem o acento brass. */',
    'export const TECH_PATHS: readonly string[] = [',
    ...techPaths.map((p) => `  '${p.d}',`),
    '];',
    '',
  ].join('\n'),
);

console.log(`\nviewBox ${VIEW_W} x ${VIEW_H}`);
console.log('escrito: public/brand/wordmark.svg + wordmark-geometry.json + lib/brand/wordmark.ts');
