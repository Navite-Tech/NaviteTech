/**
 * O aceite do Método, reescrito na Fase 16.
 *
 * A Fase 15 media uma SEQUÊNCIA: quatro estados assumindo em ordem, com janelas
 * de leitura equivalentes, e a lei de que nunca houvesse duas descrições
 * visíveis ao mesmo tempo. A Fase 16 pôs as quatro artes simultâneas — então
 * três daquelas leis passaram a defender exatamente o que decidimos descartar, e
 * uma delas (a das duas descrições) passou a ser o oposto do certo. Foram
 * reescritas; um teste que defende uma decisão revogada não é rede de segurança,
 * é âncora.
 *
 * O que a seção afirma AGORA, e o que este arquivo mede:
 *
 *   1. continuidade   os cubos do Processo são as MESMAS instâncias do Problema
 *   2. dissolução     o campo sai por opacidade, sem recuar, escalonado por
 *                     profundidade, e sai ANTES de as artes assumirem
 *   3. recomposição   o bloco de texto migra da esquerda ao centro, e não está
 *                     centralizado enquanto o campo ainda está cheio
 *   4. simultaneidade as quatro entram em ordem, e depois FICAM — as quatro
 *                     visíveis ao mesmo tempo, até o fim da seção
 *   5. tinta          cada peça pinta uma imagem de verdade
 *   6. símbolo        a crescente sai de cena, sem nunca atravessar o texto
 *
 * O QUE FOI PRESERVADO INTEIRO das fases 9 e 15, e por quê:
 *
 * "SÃO AS MESMAS INSTÂNCIAS" não se prova com `data-cube-id` sozinho: um segundo
 * campo montado no Processo teria os mesmos ids. Então, no fim do Problema — com
 * o enxame disperso —, cada nó recebe uma MARCA EM JAVASCRIPT, que não existe no
 * HTML e não sobrevive a uma remontagem do React. No fim da seção, duas adiante,
 * as marcas são lidas de volta. Continua sendo a lei mais importante do arquivo.
 *
 * "LER TINTA, NÃO ESTILO" também fica, e ficou MAIS FORTE: onde a Fase 15 lia um
 * painel em quatro posições de rolagem, aqui se leem as QUATRO CAIXAS numa
 * captura só de repouso. Uma imagem que não carregasse, ou um `object-position`
 * que caísse numa faixa de preto puro, passa por qualquer medição de estilo e é
 * pega por essa.
 *
 * O QUE ESTE ARQUIVO NÃO MEDE, de propósito: fidelidade de imagem. Isso é
 * `scripts/compare-processo.mjs`, que compara arquivo original × renderizado.
 * Aqui a pergunta é "a imagem está lá"; lá é "a imagem está intacta".
 *
 *   node scripts/check-processo.mjs --url=http://localhost:3431
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const AMOSTRAS = Number(argv.n ?? 18);
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);
const TMP = '.shots/.tmp-processo';

/** Marca cada cubo com um valor que só existe em memória. */
const MARCAR = `(() => {
  const cubos = [...document.querySelectorAll('[data-cube-id]')];
  for (const c of cubos) c.__fase9 = 'marcado-' + c.dataset.cubeId;
  return {
    total: cubos.length,
    ids: cubos.map((c) => +c.dataset.cubeId).sort((a, b) => a - b),
  };
})()`;

/**
 * Retrato do Processo numa posição de rolagem.
 *
 * A PRESENÇA do campo é lida como a opacidade COMPUTADA de cada plano, e não do
 * `--f` que o escritor publica: `--f` é propriedade customizada não registrada,
 * e `getComputedStyle` devolve o fluxo de tokens dela, não um número. Ler a
 * opacidade resolvida também é o que faz a medição valer sob as media queries.
 *
 * A DESCRIÇÃO é medida em opacidade EFETIVA — a dela vezes a da peça que a
 * contém. A opacidade não é herdada como valor computado, e quem carrega a
 * entrada é a peça: ler só o parágrafo daria 1 nas quatro sempre.
 *
 * O CENTRO DO BLOCO DE TEXTO entrou na Fase 16. Ele é o que prova a
 * recomposição: a migração é `translate`, então `getBoundingClientRect` já
 * devolve a posição visual, e comparar o centro do bloco com o centro da área
 * útil diz exatamente onde ele está no percurso.
 */
const SONDA = `(() => {
  const r = (el) => el.getBoundingClientRect();
  const num = (el, p) => +parseFloat(getComputedStyle(el)[p] || '0').toFixed(3);

  const secao = document.getElementById('processo');
  const cubos = [...document.querySelectorAll('[data-cube-id]')];
  const planos = [...document.querySelectorAll('[data-plane]')];
  const pecas = [...document.querySelectorAll('[data-no]')];

  const esq = document.getElementById('sym-left');
  const tinta = [...esq.querySelectorAll('svg use, svg path')].map((p) => r(p));
  const opSimbolo = +parseFloat(getComputedStyle(esq).opacity || '0').toFixed(3);

  const coluna = document.querySelector('[class*="processoText"]');
  const cc = coluna ? r(coluna) : null;

  return {
    y: Math.round(scrollY),
    reveal: +(getComputedStyle(secao).getPropertyValue('--reveal') || 0),
    cubos: cubos.length,
    marcados: cubos.filter((c) => c.__fase9 === 'marcado-' + c.dataset.cubeId).length,
    planos: planos.map((p) => ({ id: p.dataset.plane, op: num(p, 'opacity') })),
    pecas: pecas.map((e, i) => ({
      i,
      etapa: e.dataset.etapa,
      op: num(e, 'opacity'),
      caixa: (() => {
        const b = r(e);
        return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
      })(),
      descricao: +(
        num(e.querySelector('[data-descricao]'), 'opacity') * num(e, 'opacity')
      ).toFixed(3),
    })),
    coluna: cc
      ? {
          l: +cc.left.toFixed(1),
          r: +cc.right.toFixed(1),
          t: +cc.top.toFixed(1),
          b: +cc.bottom.toFixed(1),
          /* deslocamento do centro do bloco em relação ao centro da tela útil */
          fora: +((cc.left + cc.right) / 2 - document.documentElement.clientWidth / 2).toFixed(1),
        }
      : null,
    simbolo: tinta.length
      ? {
          op: opSimbolo,
          l: +Math.min(...tinta.map((b) => b.left)).toFixed(1),
          r: +Math.max(...tinta.map((b) => b.right)).toFixed(1),
          t: +Math.min(...tinta.map((b) => b.top)).toFixed(1),
          b: +Math.max(...tinta.map((b) => b.bottom)).toFixed(1),
        }
      : null,
  };
})()`;

/**
 * A imagem está mesmo pintando?
 *
 * Média e desvio-padrão da luminância dentro da BANDA CENTRAL da peça — 34% a
 * 62% da altura, que é a faixa entre o bloco numeral/título e a descrição, onde
 * não há texto por cima. Uma peça vazia (só o `--navy-900` de fundo) tem desvio
 * próximo de zero; qualquer uma das quatro artes tem estrutura. É a lei que
 * separa "a imagem carregou" de "o elemento existe no DOM".
 */
function tintaNaPeca(img, caixa) {
  const x0 = Math.max(0, Math.round(caixa.x) + 4);
  const x1 = Math.min(img.w, Math.round(caixa.x + caixa.w) - 4);
  const y0 = Math.max(0, Math.round(caixa.y + caixa.h * 0.34));
  const y1 = Math.min(img.h, Math.round(caixa.y + caixa.h * 0.62));

  let n = 0;
  let soma = 0;
  let soma2 = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * img.w + x) * 4;
      const l = 0.2126 * img.rgba[i] + 0.7152 * img.rgba[i + 1] + 0.0722 * img.rgba[i + 2];
      soma += l;
      soma2 += l * l;
      n++;
    }
  }
  if (!n) return { media: 0, desvio: 0 };
  const media = soma / n;
  return {
    media: +media.toFixed(1),
    desvio: +Math.sqrt(Math.max(0, soma2 / n - media * media)).toFixed(1),
  };
}

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    mkdirSync(TMP, { recursive: true });

    // A calha da barra encolhe a área útil, e é contra ela que todo vw se
    // resolve. Mesma correção de shoot-hero.mjs.
    await setViewport(W, H);
    await navigate(url, 1200);
    const calha = await evaluate('innerWidth - document.documentElement.clientWidth');
    await setViewport(W + calha, H);
    await navigate(url, 2200);

    const geo = await evaluate(`(() => {
      const p = document.getElementById('problema');
      const q = document.getElementById('processo');
      return {
        problemaFim: p.getBoundingClientRect().top + scrollY + p.offsetHeight - innerHeight,
        topo: q.getBoundingClientRect().top + scrollY,
        curso: q.offsetHeight - innerHeight,
      };
    })()`);

    const irPara = (y) =>
      evaluate(`(async () => {
        window.scrollTo(0, ${y});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);

    // --- 1. marca as instâncias no fim do Problema ---------------------------
    await irPara(geo.problemaFim);
    await sleep(900);
    const disperso = await evaluate(MARCAR);

    // --- 2. varre o Processo -------------------------------------------------
    const linhas = [];
    for (let i = 0; i < AMOSTRAS; i++) {
      const t = i / (AMOSTRAS - 1);
      await irPara(geo.topo + geo.curso * t);
      await sleep(260);
      linhas.push({ t: +t.toFixed(3), ...(await evaluate(SONDA)) });
    }

    const fim = linhas[linhas.length - 1];
    const presenca = (l) => Math.max(...l.planos.map((p) => p.op));

    /*
     * A dissolução acontece entre reveal 0,14 e 0,40. Na varredura geral isso
     * são três ou quatro amostras, e com elas os três planos podem aparecer
     * cruzando a metade no MESMO ponto: a lei do escalonamento passaria por
     * acidente. Esta segunda passagem é fina o bastante para que a ordem
     * far → mid → near seja uma medição, e não uma coincidência de amostragem.
     */
    const finas = [];
    for (let i = 0; i <= 14; i++) {
      const t = 0.12 + (0.32 * i) / 14;
      await irPara(geo.topo + geo.curso * t);
      await sleep(200);
      finas.push({ t: +t.toFixed(3), ...(await evaluate(SONDA)) });
    }

    // --- 3. tinta das QUATRO peças, numa captura só de repouso ---------------
    await irPara(geo.topo + geo.curso * 0.85);
    await sleep(700);
    const repouso = await evaluate(SONDA);
    const arq = `${TMP}/repouso.png`;
    writeFileSync(arq, await screenshot());
    const captura = decodePNG(arq);
    const tintas = repouso.pecas.map((p) => ({
      etapa: p.etapa,
      op: p.op,
      ...tintaNaPeca(captura, p.caixa),
    }));

    // --- relatório -----------------------------------------------------------
    console.log(`${url}  ${W}x${H}  ·  ${AMOSTRAS} amostras do curso do Processo\n`);
    console.log(
      '    t    reveal   marcados   planos (far mid near)   peças (opacidade)   texto fora do centro',
    );
    for (const l of linhas) {
      console.log(
        `  ${l.t.toFixed(2)}   ${l.reveal.toFixed(3)}   ${String(l.marcados).padStart(6)}   ` +
          `${l.planos.map((p) => p.op.toFixed(2)).join(' ')}${' '.repeat(12)}` +
          `${l.pecas.map((e) => e.op.toFixed(2)).join(' ')}   ` +
          `${String(l.coluna ? Math.round(l.coluna.fora) : '—').padStart(8)}px`,
      );
    }

    console.log('\n  peça         opacidade   luminância média   desvio (estrutura)');
    for (const p of tintas) {
      console.log(
        `  ${p.etapa.padEnd(11)}  ${p.op.toFixed(2).padStart(6)}    ` +
          `${p.media.toFixed(1).padStart(12)}   ${p.desvio.toFixed(1).padStart(12)}`,
      );
    }

    const falhas = [];
    const ok = (cond, texto) => {
      console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
      if (!cond) falhas.push(texto);
    };

    console.log('\nACEITE DO MÉTODO — Fase 16');

    // --- 1. continuidade -----------------------------------------------------
    const idsIguais = fim.cubos === disperso.total && linhas[0].cubos === disperso.total;
    ok(
      idsIguais,
      `o Processo tem os mesmos ${disperso.total} data-cube-id do Problema (encontrados ${fim.cubos})`,
    );

    const marcadosNoFim = Math.max(...linhas.map((l) => l.marcados));
    ok(
      marcadosNoFim === disperso.total,
      `e são as MESMAS instâncias: ${marcadosNoFim}/${disperso.total} nós ainda carregam a marca ` +
        `posta no fim do Problema — uma remontagem a apagaria`,
    );

    // --- 2. dissolução -------------------------------------------------------
    const abertura = linhas.filter((l) => l.reveal <= 0.14);
    ok(
      abertura.length > 0 && abertura.every((l) => presenca(l) > 0.9),
      `o campo abre a seção CHEIO: presença ${abertura.map((l) => presenca(l).toFixed(2)).join(' ')} ` +
        `até reveal 0,14`,
    );

    const serie = linhas.map(presenca);
    const subiu = serie.filter((v, i) => i > 0 && v > serie[i - 1] + 0.02);
    ok(
      subiu.length === 0,
      `a dissolução é monótona: a presença nunca volta a subir (${subiu.length} retomadas)`,
    );

    /*
     * O limiar subiu de 0,30 para 0,42 junto com a coreografia: a dissolução
     * fecha em 0,40 (lib/cubes/states.ts), que é onde `METODO.recompoe` põe a
     * chegada das peças. É a mesma fração dos dois lados, e é a lei que garante
     * que as imagens não dividam a própria chegada com o desaparecimento dos
     * cubos.
     */
    const depois = linhas.filter((l) => l.reveal >= 0.42);
    const piorDepois = depois.length ? Math.max(...depois.map(presenca)) : 1;
    ok(
      depois.length > 0 && piorDepois <= 0.05,
      `e termina ANTES de as artes assumirem: presença máxima ${piorDepois.toFixed(3)} a partir ` +
        `de reveal 0,42`,
    );

    /*
     * O escalonamento por profundidade. Para cada plano, o reveal em que ele
     * cruza a metade da própria presença; o distante tem de cruzar primeiro.
     */
    const meia = (id) => {
      const s = finas.filter((l) => l.planos.some((p) => p.id === id));
      const cheio = Math.max(...s.map((l) => l.planos.find((p) => p.id === id).op));
      if (cheio <= 0.01) return 0;
      const alvo = cheio / 2;
      const cruz = s.find((l) => l.planos.find((p) => p.id === id).op <= alvo);
      return cruz ? cruz.reveal : 1;
    };
    const [mFar, mMid, mNear] = ['far', 'mid', 'near'].map(meia);
    ok(
      mFar < mNear && mFar <= mMid && mMid <= mNear,
      `os planos saem escalonados, o distante primeiro: far ${mFar.toFixed(2)} · ` +
        `mid ${mMid.toFixed(2)} · near ${mNear.toFixed(2)}`,
    );

    // --- 3. recomposição do bloco de texto -----------------------------------
    /*
     * A LEI QUE O BRIEFING PEDIU EXPLICITAMENTE: não pôr a headline
     * centralizada sobre o campo cheio de cubos. Ela se mede sem ambiguidade —
     * enquanto o campo está cheio, o bloco tem de estar deslocado do centro; no
     * fim, tem de estar no centro.
     */
    const naAbertura = linhas.filter((l) => l.reveal <= 0.14 && l.coluna);
    const desloc = naAbertura.length
      ? Math.min(...naAbertura.map((l) => Math.abs(l.coluna.fora)))
      : 0;
    ok(
      naAbertura.length > 0 && desloc > 120,
      `o bloco de texto ABRE deslocado para a esquerda, não centralizado: ` +
        `${Math.round(desloc)}px fora do centro enquanto o campo está cheio`,
    );

    ok(
      fim.coluna !== null && Math.abs(fim.coluna.fora) <= 2,
      `e termina centralizado: ${fim.coluna ? Math.round(fim.coluna.fora) : '—'}px do centro`,
    );

    /* a migração é monótona — o bloco caminha para o centro, sem recuar */
    const centros = [...linhas].filter((l) => l.coluna).map((l) => Math.abs(l.coluna.fora));
    const recuou = centros.filter((v, i) => i > 0 && v > centros[i - 1] + 3);
    ok(
      recuou.length === 0,
      `e a travessia é monótona: o bloco nunca volta para a esquerda (${recuou.length} recuos)`,
    );

    // --- 4. simultaneidade das quatro peças ----------------------------------
    const ordem = [];
    for (const l of linhas) {
      for (const p of l.pecas) {
        if (p.op > 0.5 && !ordem.includes(p.i)) ordem.push(p.i);
      }
    }
    ok(
      ordem.join(',') === '0,1,2,3',
      `as quatro peças entram em ordem (medido: ${ordem.map((i) => '0' + (i + 1)).join(' → ')})`,
    );

    /*
     * A AFIRMAÇÃO CENTRAL DESTA FASE, e o oposto da lei que estava aqui antes.
     * A Fase 15 exigia que nunca houvesse duas descrições visíveis ao mesmo
     * tempo; agora exige-se que as QUATRO estejam.
     */
    const posto = linhas.filter((l) => l.reveal >= 0.62);
    const todasPostas = posto.every((l) => l.pecas.every((p) => p.op > 0.95));
    ok(
      posto.length > 0 && todasPostas,
      `e a partir de reveal 0,62 as quatro ficam visíveis AO MESMO TEMPO, até o fim ` +
        `(${posto.length} amostras)`,
    );

    ok(
      fim.pecas.filter((p) => p.descricao > 0.5).length === 4,
      `no fim da seção as quatro descrições estão legíveis ` +
        `(${fim.pecas.filter((p) => p.descricao > 0.5).length}/4)`,
    );

    /* nada se move depois do repouso: a seção para de animar e deixa ler */
    const larguras = new Set(posto.map((l) => Math.round(l.pecas[0]?.caixa.w ?? 0)));
    ok(
      larguras.size === 1,
      `e a composição fica IMÓVEL no repouso: a peça 01 mede ${[...larguras].join('/')}px ` +
        `em todas as amostras`,
    );

    // --- 5. tinta ------------------------------------------------------------
    ok(
      tintas.length === 4 && tintas.every((p) => p.op > 0.95),
      `no repouso as quatro peças estão opacas (${tintas.map((p) => p.op.toFixed(2)).join(' ')})`,
    );

    ok(
      tintas.length === 4 && tintas.every((p) => p.desvio > 6),
      `e cada uma pinta uma IMAGEM, não um retângulo vazio: desvio de luminância ` +
        `${tintas.map((p) => p.desvio.toFixed(0)).join(' ')} (um painel chapado daria ~0)`,
    );

    // --- 6. o símbolo --------------------------------------------------------
    /*
     * A LEI NOVA DA FASE 16, e ela substitui "a crescente chega encostada na
     * borda esquerda". A peça continua descendo até lá — `processGone` tem a
     * geometria de `processEdge`, de propósito, para o `check:continuity` não
     * ver teleporte —, mas apaga antes de a prancha assumir. Com as quatro peças
     * ocupando a metade inferior da tela em toda a largura, não sobra canto onde
     * ela caiba sem pôr tinta bone atrás de uma arte.
     */
    const comPecas = linhas.filter((l) => l.reveal >= 0.42 && l.simbolo);
    const piorOp = comPecas.length ? Math.max(...comPecas.map((l) => l.simbolo.op)) : 1;
    ok(
      comPecas.length > 0 && piorOp <= 0.02,
      `a crescente SAI DE CENA antes da prancha: opacidade máxima ${piorOp.toFixed(3)} ` +
        `a partir de reveal 0,42`,
    );

    /*
     * A INTERSEÇÃO É DE RETÂNGULOS, e tem de ser. A primeira versão desta lei
     * comparava só as alturas e acusava colisão no início da seção, quando a
     * peça ainda está na pose de Serviços: lá ela é alta, sim, mas mora à
     * direita da coluna. Não havia um pixel em comum. Uma lei que reprova o que
     * não acontece gasta a confiança de todas as outras.
     *
     * Ela FICA mesmo com a peça saindo de cena: é barata, e é a rede que pegou o
     * lead do Método atravessado pela crescente na fase passada. Só conta
     * enquanto a peça está visível — sobreposição com tinta invisível não é
     * colisão.
     */
    const cruza = (l) =>
      l.simbolo &&
      l.coluna &&
      l.simbolo.op > 0.02 &&
      l.simbolo.l < l.coluna.r &&
      l.simbolo.r > l.coluna.l &&
      l.simbolo.t < l.coluna.b &&
      l.simbolo.b > l.coluna.t;
    const colisao = [...linhas, ...finas].filter(cruza);
    ok(
      colisao.length === 0,
      `e não atravessa o bloco de texto em nenhuma amostra` +
        (colisao.length
          ? ` — ${colisao.length} em colisão, a pior em reveal ${colisao[0].reveal}`
          : ''),
    );

    console.log(
      falhas.length
        ? `\nFALHOU — ${falhas.length} lei(s):\n${falhas.map((f) => `  · ${f}`).join('\n')}`
        : '\nOK — a matéria dissolve, a composição se recompõe, e as quatro artes ficam.',
    );
    if (falhas.length) throw new Error('o Método não cumpre o aceite');
  },
  { port: Number(argv.port ?? 9489), browser: argv.browser, profile: '.shots/.chrome-processo' },
);
