/**
 * APOSENTADO NA FASE 14 — não roda mais, e o motivo não é abandono.
 *
 * Este script diffa uma captura contra `references/services-reference.png`, um
 * arquivo que já não existe no repositório. E mesmo que existisse, ele mediria a
 * composição errada: a Fase 14 trocou a moldura com maquete de interface por
 * arte sangrando pelo card inteiro, e as proporções internas que ele confere —
 * aresta do painel, coluna do visual, faixas de texto — descrevem um objeto que
 * não é mais o que a página desenha.
 *
 * Fica em disco como registro de método. A pilha continua verificada, e por
 * medição de comportamento em vez de diferença de pixel: `scripts/check-servicos.mjs`
 * (oito leis do §18) e `scripts/check-visuais.mjs` (a arte é uma prop).
 *
 * ---
 *
 * Compara a seção Serviços com a referência — o primeiro aceite da Fase 8.
 *
 * A comparação é feita em COORDENADAS DO CARD, não da tela, e essa é a decisão
 * que a torna honesta. O card daqui tem 600px de largura contra os 660 da
 * referência, porque respeita a margem de página que o hero estabelece (a razão
 * está em components/services/services.module.css). Comparar em vw acusaria
 * essa diferença em toda linha e afogaria o que interessa: se as PROPORÇÕES
 * internas do card batem.
 *
 * Três famílias de marco, três detectores:
 *
 *   colunas   cristas verticais longas — as bordas do painel e a aresta
 *             esquerda da coluna do visual
 *   linhas    cristas horizontais longas — o topo e a base de cada tela do mock
 *   faixas    perfil de tinta na coluna de texto — numeral, título, descrição,
 *             régua e capacidades
 *
 * O eixo Y é comparado com tolerância apertada: a altura útil do card é a mesma
 * proporção nos dois. O eixo X é comparado com folga, porque a largura difere
 * por decisão registrada.
 *
 *   node tools/compare-servicos.cjs .shots/fase-8/servicos.png
 */
const { decodePNG } = require('./png.cjs');
const path = require('path');

const REF = path.join(__dirname, '..', 'references', 'services-reference.png');
const alvo = process.argv[2];
if (!alvo) {
  console.error('uso: node tools/compare-servicos.cjs <captura.png>');
  process.exit(2);
}

const TOL_Y = Number(process.env.TOL_Y ?? 2.0); // % da altura do card
const TOL_PX = Number(process.env.TOL_PX ?? 12); // px, no eixo X (ver a nota abaixo)

function carregar(file) {
  const img = decodePNG(file);
  const { w: W, h: H, rgba } = img;
  const at = (x, y) => (y * W + x) * 4;
  const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  return { W, H, rgba, at, lum };
}

/** Colunas em que a luminância é máximo local ao longo de muitas linhas. */
function cristasV(im, y0, y1, x0, x1, minFrac, d = 2) {
  const out = [];
  for (let x = Math.max(2, x0); x < Math.min(im.W - 3, x1); x++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      const c = im.lum(im.at(x, y));
      if (c - im.lum(im.at(x - 2, y)) > d && c - im.lum(im.at(x + 2, y)) > d) n++;
    }
    if (n > (y1 - y0) * minFrac) out.push(x);
  }
  return agrupar(out);
}

function cristasH(im, x0, x1, y0, y1, minFrac, d = 2) {
  const out = [];
  for (let y = Math.max(2, y0); y < Math.min(im.H - 3, y1); y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) {
      const c = im.lum(im.at(x, y));
      if (c - im.lum(im.at(x, y - 2)) > d && c - im.lum(im.at(x, y + 2)) > d) n++;
    }
    if (n > (x1 - x0) * minFrac) out.push(y);
  }
  return agrupar(out);
}

/** Junta posições adjacentes (uma borda de 1px acende 2 ou 3 colunas). */
function agrupar(xs) {
  const out = [];
  for (const x of xs) {
    const ultimo = out[out.length - 1];
    if (ultimo && x - ultimo[ultimo.length - 1] <= 2) ultimo.push(x);
    else out.push([x]);
  }
  return out.map((g) => g.reduce((s, v) => s + v, 0) / g.length);
}

/**
 * A caixa do card.
 *
 * As laterais saem das duas cristas verticais mais externas da metade direita.
 * O TOPO E A BASE saem da extensão dessas mesmas cristas, não de cristas
 * horizontais: uma borda horizontal longa também é a barra do header e o topo
 * do card que espia por baixo, e numa primeira versão o detector devolvia
 * 144..859 no lugar dos 152..842 reais — 25px de erro que contaminavam todo
 * percentual derivado.
 */
function acharCard(im) {
  const cols = cristasV(
    im,
    Math.round(im.H * 0.25),
    Math.round(im.H * 0.75),
    Math.round(im.W * 0.5),
    im.W - 3,
    0.5,
  );
  const x0 = cols[0];
  const x1 = cols[cols.length - 1];

  /*
   * O TRECHO CONTÍNUO MAIS LONGO da crista, não o primeiro e o último ponto
   * dela: a mesma coluna carrega também a borda esquerda do card que espia por
   * baixo, e pegar os extremos esticava a caixa até 937 numa base real de 842.
   * Vãos de até 12px são tolerados, que é o que o raio do canto abre.
   */
  const trecho = (xc) => {
    const x = Math.round(xc);
    let melhor = [0, -1];
    let ini = -1;
    let ultimo = -99;
    for (let y = 3; y < im.H - 3; y++) {
      const c = im.lum(im.at(x, y));
      const tem = c - im.lum(im.at(x - 2, y)) > 2 && c - im.lum(im.at(x + 2, y)) > 2;
      if (!tem) continue;
      if (y - ultimo > 12) ini = y;
      ultimo = y;
      if (ultimo - ini > melhor[1] - melhor[0]) melhor = [ini, ultimo];
    }
    return melhor;
  };
  const a = trecho(x0);
  const b = trecho(x1);
  return { x0, x1, y0: Math.min(a[0], b[0]), y1: Math.max(a[1], b[1]) };
}

/** Faixas de tinta numa caixa, com extensão horizontal. */
function faixas(im, x0, y0, x1, y1, limiar, minAltura = 2) {
  const perfil = [];
  for (let y = y0; y <= y1; y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (im.lum(im.at(x, y)) > limiar) n++;
    perfil.push(n);
  }
  const out = [];
  let s = -1;
  for (let i = 0; i < perfil.length; i++) {
    const tem = (perfil[i] ?? 0) > 0;
    if (tem && s < 0) s = i;
    else if (!tem && s >= 0) {
      if (i - s >= minAltura) out.push({ y0: s + y0, y1: i - 1 + y0 });
      s = -1;
    }
  }
  if (s >= 0 && perfil.length - s >= minAltura) out.push({ y0: s + y0, y1 });
  for (const f of out) {
    let a = x1;
    let b = x0;
    for (let y = f.y0; y <= f.y1; y++)
      for (let x = x0; x <= x1; x++)
        if (im.lum(im.at(x, y)) > limiar) {
          if (x < a) a = x;
          if (x > b) b = x;
        }
    f.x0 = a;
    f.x1 = b;
  }
  return out;
}

function medir(file, rotulo) {
  const im = carregar(file);
  const card = acharCard(im);
  const CW = card.x1 - card.x0;
  const CH = card.y1 - card.y0;
  const fx = (v) => ((v - card.x0) / CW) * 100;
  const fy = (v) => ((v - card.y0) / CH) * 100;

  // colunas estruturais dentro do card (a aresta do visual entre elas)
  const colunas = cristasV(
    im,
    Math.round(card.y0 + CH * 0.25),
    Math.round(card.y0 + CH * 0.7),
    Math.round(card.x0 + 6),
    Math.round(card.x1 - 6),
    0.5,
  ).map(fx);

  // linhas estruturais: topo e base de cada tela do mock
  const linhas = cristasH(
    im,
    Math.round(card.x0 + CW * 0.45),
    Math.round(card.x1 - 6),
    Math.round(card.y0 + 4),
    Math.round(card.y1 - 4),
    0.55,
  ).map(fy);

  // faixas de texto na coluna esquerda do card
  const texto = faixas(
    im,
    Math.round(card.x0 + CW * 0.04),
    Math.round(card.y0 + 4),
    Math.round(card.x0 + CW * 0.36),
    Math.round(card.y1 - 4),
    55,
  ).map((f) => ({ y0: fy(f.y0), y1: fy(f.y1), x0: fx(f.x0), x1: fx(f.x1) }));

  console.log(
    `${rotulo}: card x ${card.x0.toFixed(0)}..${card.x1.toFixed(0)} (${CW.toFixed(0)}px) · ` +
      `y ${card.y0.toFixed(0)}..${card.y1.toFixed(0)} (${CH.toFixed(0)}px)`,
  );
  return { colunas, linhas, texto, CW, CH };
}

/** Casa cada marco com o mais próximo do outro lado e reporta o desvio. */
function comparar(rotulo, a, b, tol, unidade) {
  console.log(`\n${rotulo}   (tolerância ±${tol}%)`);
  let pior = 0;
  const falhas = [];
  for (const v of a) {
    const perto = b.reduce((m, w) => (Math.abs(w - v) < Math.abs(m - v) ? w : m), b[0] ?? NaN);
    const d = perto - v;
    const bom = Number.isFinite(d) && Math.abs(d) <= tol;
    if (Math.abs(d) > pior) pior = Math.abs(d);
    if (!bom) falhas.push(v);
    console.log(
      `  ${bom ? '✓' : '✗'} ref ${v.toFixed(2).padStart(6)}${unidade}  →  ` +
        `obtido ${Number.isFinite(perto) ? perto.toFixed(2).padStart(6) : '   —'}${unidade}   Δ ${d.toFixed(2)}`,
    );
  }
  console.log(`  pior desvio ${pior.toFixed(2)}${unidade}`);
  return falhas;
}

const ref = medir(REF, 'referência');
const obt = medir(alvo, 'render     ');

const falhas = [];
falhas.push(
  ...comparar(
    'LINHAS ESTRUTURAIS — topo e base das telas do mock',
    ref.linhas,
    obt.linhas,
    TOL_Y,
    '%',
  ),
);

/*
 * O eixo X é comparado em PIXELS ABSOLUTOS, não em fração do card.
 *
 * A única coluna estrutural dentro do card é a aresta esquerda do visual, e a
 * posição dela é a soma de medidas absolutas: a folga interna, a largura da
 * coluna de texto (que existe para caber uma linha de texto de corpo fixo) e o
 * vão. Nada disso encolhe junto com o card. Em fração do card a diferença de
 * largura apareceria como erro; em pixels, o que se compara é o que de fato foi
 * decidido.
 */
falhas.push(
  ...comparar(
    'COLUNA DO VISUAL — aresta esquerda, em pixels a partir da borda do card',
    ref.colunas.map((v) => (v / 100) * ref.CW),
    obt.colunas.map((v) => (v / 100) * obt.CW),
    TOL_PX,
    'px',
  ),
);

/*
 * As faixas de texto são comparadas em PIXELS, e em DOIS referenciais.
 *
 * O card daqui é 72px mais curto que o da referência — ele começa abaixo da
 * barra do header, que na referência não existe. Comparar tudo em fração do
 * card produz erro fantasma: o avanço entre as linhas do título mede 43,5px nos
 * dois e mesmo assim aparece como 5,78% contra 6,34%.
 *
 * Cada bloco desta coluna está ancorado no topo (numeral, título, descrição) ou
 * na base (régua e capacidades, empurradas por `margin-block-start: auto`). O
 * comparador não precisa saber qual: exige que cada faixa da referência case em
 * ALGUM dos dois referenciais. Uma faixa fora de lugar erra nos dois.
 */
console.log(`\nFAIXAS DE TEXTO — em px do topo OU da base do card   (tolerância ±${TOL_PX}px)`);
{
  const topo = (m) => m.texto.map((f) => (f.y0 / 100) * m.CH);
  const base = (m) => m.texto.map((f) => ((100 - f.y0) / 100) * m.CH);
  const rt = topo(ref);
  const rb = base(ref);
  const ot = topo(obt);
  const ob = base(obt);
  console.log(`  ref ${rt.length} faixas - obtido ${ot.length} faixas`);
  console.log('        do topo                 da base                 veredito');
  for (let i = 0; i < rt.length; i++) {
    const pt = ot.reduce((m, w) => (Math.abs(w - rt[i]) < Math.abs(m - rt[i]) ? w : m), ot[0]);
    const pb = ob.reduce((m, w) => (Math.abs(w - rb[i]) < Math.abs(m - rb[i]) ? w : m), ob[0]);
    const dt = pt - rt[i];
    const db = pb - rb[i];
    const bom = Math.abs(dt) <= TOL_PX || Math.abs(db) <= TOL_PX;
    if (!bom) falhas.push(`faixa ${rt[i].toFixed(0)}px`);
    console.log(
      `  ${bom ? 'v' : 'x'} ${rt[i].toFixed(0).padStart(4)} -> ${pt.toFixed(0).padStart(4)} (${dt.toFixed(0).padStart(4)})` +
        `    ${rb[i].toFixed(0).padStart(4)} -> ${pb.toFixed(0).padStart(4)} (${db.toFixed(0).padStart(4)})` +
        `    ${Math.abs(dt) <= Math.abs(db) ? 'topo' : 'base'}`,
    );
  }
}

if (falhas.length) {
  console.log(`\n${falhas.length} marco(s) fora da tolerância.`);
  process.exit(1);
}
console.log('\nOK — as proporções internas do card batem com a referência.');
