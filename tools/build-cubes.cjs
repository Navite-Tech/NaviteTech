/**
 * Gera `lib/content/cubes.ts` a partir de `problem-section-reference.png`.
 *
 * O campo de cubos NÃO é inventado nem semeado por gerador aleatório: cada
 * unidade sai de onde ela está na referência. Densidade, mistura de materiais e
 * envelope espacial são decisões de design que já foram tomadas ali.
 *
 * COORDENADAS. Nada é gravado em vw/vh, porque a referência tem aspecto 1,50 e
 * o alvo tem 1,78 — transpor porcentagem entre os dois deformaria o enxame. O
 * que se grava é a posição no referencial do VÃO:
 *
 *   u = (cx − centro do vão) / (meia-largura do vão)      −1..1 atravessa o vão
 *   v = (cy − centro das metades) / (meia-altura delas)   −1..1 atravessa a peça
 *   s = lado / (meia-largura do vão)
 *
 * Assim o enxame acompanha o símbolo: onde a peça abrir mais, os cubos ocupam
 * mais espaço, e o tamanho de cada um continua proporcional. O componente
 * converte para vw/vh com o vão medido na própria implementação.
 *
 * PLANOS. O §9.3 do plano previa 34 unidades em três planos (12/14/8). A
 * medição achou bem mais: 122 partículas de 1 a 4px e 85 cubos de 5px para
 * cima. Os planos ficam, mas com as contagens que a referência de fato tem.
 *
 *   node tools/build-cubes.cjs
 */
const { decodePNG } = require('./png.cjs');
const fs = require('fs');
const path = require('path');

const REF = path.join(__dirname, '..', 'references', 'problem-section-reference.png');
const OUT = path.join(__dirname, '..', 'lib', 'content', 'cubes.ts');

const img = decodePNG(REF);
const { w: W, h: H, rgba } = img;
const at = (x, y) => (y * W + x) * 4;
const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];

/**
 * O referencial, medido nesta mesma imagem (.shots/tmp/vao.cjs):
 * metade esquerda termina em x 750, direita começa em 1136; as duas juntas
 * ocupam y 292..765.
 */
const GAP = { x0: 750, x1: 1136 };
const UNION = { y0: 292, y1: 765 };
const cxRef = (GAP.x0 + GAP.x1) / 2;
const halfW = (GAP.x1 - GAP.x0) / 2;
const cyRef = (UNION.y0 + UNION.y1) / 2;
const halfH = (UNION.y1 - UNION.y0) / 2;

/** Componentes conexos de tinta dentro da janela do enxame. */
function componentes(limiar, box) {
  const seen = new Uint8Array(W * H);
  const st = new Int32Array(W * H);
  const out = [];
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      const p = y * W + x;
      if (seen[p] || lum(at(x, y)) <= limiar) continue;
      let sp = 0;
      st[sp++] = p;
      seen[p] = 1;
      let n = 0,
        x0 = x,
        x1 = x,
        y0 = y,
        y1 = y,
        sr = 0,
        sg = 0,
        sb = 0,
        pl = -1,
        pr = 0,
        pg = 0,
        pb = 0;
      while (sp > 0) {
        const q = st[--sp];
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
        const li = lum(i);
        if (li > pl) {
          pl = li;
          pr = rgba[i];
          pg = rgba[i + 1];
          pb = rgba[i + 2];
        }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx,
              ny = qy + dy;
            if (nx < box.x0 || ny < box.y0 || nx > box.x1 || ny > box.y1) continue;
            const np = ny * W + nx;
            if (seen[np] || lum(at(nx, ny)) <= limiar) continue;
            seen[np] = 1;
            st[sp++] = np;
          }
        }
      }
      out.push({
        n,
        w: x1 - x0 + 1,
        h: y1 - y0 + 1,
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        r: sr / n,
        g: sg / n,
        b: sb / n,
        pr,
        pg,
        pb,
      });
    }
  }
  return out;
}

/**
 * Material pelo PICO de luminância do componente, não pela média.
 *
 * A média não serve para partícula pequena: num objeto de 3px quase todo pixel
 * é borda antialiasada, e a média desliza para o fundo. Classificando pela
 * média, 85 dos 168 cubos saíam "navy" — metade do campo — quando na referência
 * o navy é minoria clara. O pixel mais brilhante é a face que de fato pegou luz,
 * e é ele que diz de que material o cubo é.
 *
 * O navy se reconhece por ser mais ESCURO que o bone mesmo no ponto de luz
 * (topo polido em ~96 de luminância contra ~163) e por puxar para o azul.
 */
function material(c) {
  const l = 0.2126 * c.pr + 0.7152 * c.pg + 0.0722 * c.pb;
  const warm = (c.pr + c.pg) / 2 - c.pb;
  if (l < 110 || warm < -2) return 'navy';
  if (c.pg > c.pr + 2 && warm > 4) return 'sage';
  return 'bone';
}

const bruto = componentes(46, {
  x0: Math.round(W * 0.47),
  x1: Math.round(W * 0.755),
  y0: Math.round(H * 0.18),
  y1: Math.round(H * 0.84),
}).filter((c) => c.n >= 3 && c.n < 3000 && c.w <= 70 && c.h <= 70);

const lado = (c) => Math.max(c.w, c.h);

/**
 * Planos de profundidade pelo TAMANHO, que é o que a perspectiva deixa medir.
 * Os cortes saem do histograma: há um degrau claro entre as partículas de até
 * 4px e os cubos que já mostram três faces, a partir de 5px.
 */
function plano(c) {
  const s = lado(c);
  if (s <= 4) return 'far';
  if (s <= 13) return 'mid';
  return 'near';
}

/*
 * As partículas de 1 e 2px são grão de compressão tanto quanto objeto. Ficam
 * só as de 3 e 4px, que aparecem consistentemente e com forma.
 */
const cubos = bruto
  .filter((c) => lado(c) >= 3)
  .map((c) => ({
    u: +((c.cx - cxRef) / halfW).toFixed(4),
    v: +((c.cy - cyRef) / halfH).toFixed(4),
    s: +(lado(c) / halfW).toFixed(4),
    m: material(c),
    p: plano(c),
  }))
  // de cima para baixo: a ordem vira o escalonamento de entrada
  .sort((a, b) => a.v - b.v || a.u - b.u);

const conta = (p) => cubos.filter((c) => c.p === p).length;
const contaM = (m) => cubos.filter((c) => c.m === m).length;

const ts = `/**
 * O campo de cubos — GERADO por \`node tools/build-cubes.cjs\`. Não editar à mão.
 *
 * Cada unidade veio de onde ela está em \`problem-section-reference.png\`:
 * densidade, mistura de materiais e envelope espacial são decisões de design já
 * tomadas ali, e semeá-las com um gerador aleatório seria trocar a referência
 * por uma interpretação.
 *
 * COORDENADAS, no referencial do VÃO entre as metades — não em vw/vh. A
 * referência tem aspecto 1,50 e o alvo 1,78; transpor porcentagem entre os dois
 * deformaria o enxame.
 *
 *   u   −1..1 atravessando o vão            (0 = centro do vão)
 *   v   −1..1 atravessando a altura da peça (0 = centro das metades)
 *   s   lado do cubo, em meias-larguras de vão
 *
 * Referencial da medição: vão em x 750..1136, metades em y 292..765.
 *
 * ${cubos.length} unidades — far ${conta('far')} · mid ${conta('mid')} · near ${conta('near')}
 * materiais — bone ${contaM('bone')} · sage ${contaM('sage')} · navy ${contaM('navy')}
 *
 * O §9.3 do plano previa 34 unidades em três planos (12/14/8). A medição achou
 * mais: as contagens acima são as que a referência de fato tem.
 */

/** Plano de profundidade. Define parallax, desfoque e ordem de nascimento. */
export type CubePlane = 'far' | 'mid' | 'near';

/** As três famílias de material do §9.3. */
export type CubeMaterial = 'bone' | 'sage' | 'navy';

export type Cube = {
  u: number;
  v: number;
  s: number;
  m: CubeMaterial;
  p: CubePlane;
};

export const CUBES: readonly Cube[] = [
${cubos.map((c) => `  { u: ${c.u}, v: ${c.v}, s: ${c.s}, m: '${c.m}', p: '${c.p}' },`).join('\n')}
];
`;

fs.writeFileSync(OUT, ts);
console.log(`${path.relative(process.cwd(), OUT)}  —  ${cubos.length} cubos`);
console.log(`  far ${conta('far')} · mid ${conta('mid')} · near ${conta('near')}`);
console.log(`  bone ${contaM('bone')} · sage ${contaM('sage')} · navy ${contaM('navy')}`);
const ss = cubos.map((c) => c.s).sort((a, b) => a - b);
console.log(`  lado: ${ss[0].toFixed(3)} .. ${ss[ss.length - 1].toFixed(3)} meias-larguras de vão`);
const us = cubos.map((c) => Math.abs(c.u)).sort((a, b) => a - b);
const vs = cubos.map((c) => Math.abs(c.v)).sort((a, b) => a - b);
console.log(`  |u| máx ${us[us.length - 1].toFixed(2)}   |v| máx ${vs[vs.length - 1].toFixed(2)}`);
