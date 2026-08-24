/**
 * O aceite da Fase 6: a ORDEM DOS EVENTOS da transição Hero → Problema.
 *
 * O §4.1 do plano decompôs `flow-symbol-transition.mp4` quadro a quadro e
 * derivou três leis. Este script as verifica como proposições, não como
 * impressão de quem olha o screenshot:
 *
 *   1. NENHUM cubo aparece antes de as metades separarem. É o critério que o
 *      §18 nomeia explicitamente.
 *   2. Os cubos NASCEM NO CENTRO do vão e expandem. Medido pela distância
 *      média ao centro do enxame, que tem de crescer monotonicamente.
 *   3. Texto e HUD entram DEPOIS do movimento do símbolo, e os callouts por
 *      último.
 *
 * A amostragem da ORDEM é do DOM, não de pixel: opacidade computada e caixa de
 * cada nó dizem exatamente quando cada coisa entra, sem depender de limiar de
 * luminância.
 *
 * A última lei, porém, mede TINTA — e essa é a lição da Fase 9. Ler geometria e
 * estilo diz que a guia existe e que o `stroke-dashoffset` chegou a zero; não
 * diz que ela foi PINTADA. Com `vector-effect: non-scaling-stroke`, duas das
 * quatro guias apareciam com 60% do comprimento desde a Fase 6, e todas as leis
 * baseadas em DOM passavam.
 *
 *   node scripts/check-problema.mjs --url=http://localhost:3380
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const AMOSTRAS = Number(argv.n ?? 24);
const TMP = '.shots/.tmp-problema';

/**
 * Extensão PINTADA ao longo de uma guia, na captura.
 *
 * Mede o primeiro e o último x com tinta na faixa vertical da linha. O trecho
 * entre eles pode ter falhas — duas das quatro guias passam por cima da
 * crescente e do enxame, onde um fio a 33% de opacidade não vence o fundo —,
 * mas a EXTENSÃO é robusta, e é ela que denuncia um traço cortado pela metade.
 */
function extensaoPintada(arquivo, caixa) {
  const img = decodePNG(arquivo);
  const lum = (x, y) => {
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
    const i = ((y | 0) * img.w + (x | 0)) * 4;
    return 0.2126 * img.rgba[i] + 0.7152 * img.rgba[i + 1] + 0.0722 * img.rgba[i + 2];
  };
  const y0 = Math.floor(caixa.top) - 1;
  const y1 = Math.ceil(caixa.bottom) + 1;
  let de = null;
  let ate = null;
  for (let x = Math.floor(caixa.left); x <= Math.ceil(caixa.right); x++) {
    let pico = 0;
    for (let y = y0; y <= y1; y++) pico = Math.max(pico, lum(x, y));
    if (pico - (lum(x, y0 - 8) + lum(x, y1 + 8)) / 2 > 5) {
      if (de === null) de = x;
      ate = x;
    }
  }
  const largura = caixa.right - caixa.left;
  return { de, ate, fracao: de === null ? 0 : (ate - de + 1) / largura };
}

/**
 * Um retrato do estado em uma posição de rolagem.
 *
 * O `vao` é medido entre as caixas desenhadas das duas metades — não entre os
 * centros de viewBox, que são concêntricos no hero e não diriam nada sobre
 * separação.
 */
const SONDA = `(() => {
  const r = (el) => el.getBoundingClientRect();
  const esq = document.getElementById('sym-left');
  const dir = document.getElementById('sym-right');
  const secao = document.getElementById('problema');
  const planos = [...document.querySelectorAll('[data-plane]')];
  const cubos = [...document.querySelectorAll('[data-plane] > *')];
  const callouts = [...document.querySelectorAll('#problema li')];
  const h1 = document.getElementById('hero-titulo');

  /*
   * Opacidade EFETIVA: o produto ao longo dos ancestrais.
   *
   * A opacidade computada de um no so engana: opacidade nao herda, ela COMPOE.
   * A saida do hero e aplicada no bloco de texto, nao no h1, e a leitura direta
   * no h1 devolvia 1,00 com o hero ja invisivel.
   *
   * (Sem crases neste comentario de proposito: ele vive dentro de um literal de
   * template, e uma crase aqui fecharia a sonda inteira.)
   */
  const opacidadeEfetiva = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity);
    }
    return o;
  };
  const hud = document.querySelector('#problema [class*="hud"]');

  const be = r(esq), bd = r(dir);
  // Quanto as metades desenhadas se afastaram: as caixas são iguais e
  // concêntricas no hero, então a diferença de centro é a separação.
  const separacao = Math.abs((bd.left + bd.width / 2) - (be.left + be.width / 2));

  // Tinta de cubo visível: um cubo conta se tem área e opacidade efetiva.
  const visiveis = cubos.filter((c) => {
    const b = r(c);
    return b.width > 0.6 && b.height > 0.6;
  });
  const cx = visiveis.reduce((s, c) => s + r(c).left + r(c).width / 2, 0) / (visiveis.length || 1);
  const cy = visiveis.reduce((s, c) => s + r(c).top + r(c).height / 2, 0) / (visiveis.length || 1);
  const raio = visiveis.length
    ? visiveis.reduce((s, c) => {
        const b = r(c);
        return s + Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
      }, 0) / visiveis.length
    : 0;

  return {
    y: Math.round(scrollY),
    separacao: +separacao.toFixed(1),
    planoT: planos.map((p) => +(getComputedStyle(p).getPropertyValue('--t') || 0)),
    cubosVisiveis: visiveis.length,
    raioMedio: +raio.toFixed(1),
    calloutOpacidade: callouts.length
      ? +Math.max(...callouts.map((c) => parseFloat(getComputedStyle(c).opacity))).toFixed(3)
      : 0,
    heroOpacidade: h1 ? +opacidadeEfetiva(h1).toFixed(3) : 1,
    hudVisivel: hud ? r(hud).width > 0 : false,
    /*
     * Onde cada guia foi DESENHADA, contra onde esta o callout dela.
     *
     * Nao e detalhe de estilo: um <svg> com viewBox e sem dimensoes e elemento
     * substituido, e com inset zero a altura vem da razao de aspecto, nao do
     * bloco container. A caixa saia quadrada, todo y era esticado, e duas das
     * quatro guias iam parar na secao seguinte.
     *
     * (Sem crases aqui de proposito: este comentario vive dentro de um literal
     * de template, e uma crase fecharia a sonda inteira.)
     */
    guias: [...document.querySelectorAll('#problema polyline')].map((l, i) => {
      const g = r(l);
      const c = callouts[i] ? r(callouts[i]) : null;
      return {
        i,
        gy: +(g.top + g.height / 2).toFixed(1),
        cy: c ? +(c.top + c.height / 2).toFixed(1) : null,
        // menor distancia horizontal entre a guia e a caixa do callout
        dx: c ? +Math.max(0, Math.max(g.left - c.right, c.left - g.right)).toFixed(1) : null,
      };
    }),
  };
})()`;

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    await setViewport(1672, 941);
    await navigate(url, 2200);

    // Do topo do hero até o fim do Problema: a janela que o §4.1 decompõe.
    const limites = await evaluate(`(() => {
      const h = document.getElementById('hero');
      const p = document.getElementById('problema');
      return {
        de: h.getBoundingClientRect().top + scrollY,
        ate: p.getBoundingClientRect().top + scrollY + p.offsetHeight - innerHeight,
      };
    })()`);

    const linhas = [];
    for (let i = 0; i < AMOSTRAS; i++) {
      const t = i / (AMOSTRAS - 1);
      const y = limites.de + (limites.ate - limites.de) * t;
      await evaluate(`(async () => {
        window.scrollTo(0, ${y});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      await sleep(230); // o scrub tem inércia; deixa alcançar
      const s = await evaluate(SONDA);
      linhas.push({ t: +t.toFixed(3), ...s });
    }

    console.log(`${url}  1672×941  ·  ${AMOSTRAS} amostras do topo do hero ao fim do Problema\n`);
    console.log('    t     separação   cubos   raio    planos t          callout   hero');
    for (const l of linhas) {
      console.log(
        `  ${l.t.toFixed(2)}   ${String(l.separacao).padStart(8)}px  ${String(l.cubosVisiveis).padStart(5)}  ` +
          `${String(l.raioMedio).padStart(6)}  ${l.planoT.map((v) => v.toFixed(2)).join(' ')}   ` +
          `${l.calloutOpacidade.toFixed(2).padStart(6)}   ${l.heroOpacidade.toFixed(2)}`,
      );
    }

    const falhas = [];
    const ok = (cond, texto) => {
      console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
      if (!cond) falhas.push(texto);
    };

    console.log('\nLEIS DO §4.1');

    // --- 1. nenhum cubo antes da separação -----------------------------------
    const separadoEm = linhas.find((l) => l.separacao > 8);
    const primeiroCubo = linhas.find((l) => l.planoT.some((v) => v > 0.01));
    ok(
      Boolean(separadoEm && primeiroCubo && separadoEm.t < primeiroCubo.t),
      `nenhum cubo antes de as metades separarem ` +
        `(separou em t=${separadoEm?.t ?? '—'}, primeiro cubo em t=${primeiroCubo?.t ?? '—'})`,
    );

    // --- 2. nascem no centro e expandem --------------------------------------
    const comCubos = linhas.filter((l) => l.cubosVisiveis > 0 && l.planoT.some((v) => v > 0.02));
    let monotonico = true;
    for (let i = 1; i < comCubos.length; i++) {
      // tolera 2px de ruído de arredondamento entre amostras
      if (comCubos[i].raioMedio < comCubos[i - 1].raioMedio - 2) monotonico = false;
    }
    ok(
      monotonico && comCubos.length > 3,
      `o enxame expande a partir do centro sem recuar ` +
        `(raio médio ${comCubos[0]?.raioMedio ?? 0}px → ${comCubos[comCubos.length - 1]?.raioMedio ?? 0}px)`,
    );

    // --- 3. planos nascem escalonados, o distante primeiro -------------------
    const nasce = [0, 1, 2].map((i) => linhas.find((l) => l.planoT[i] > 0.01)?.t ?? 9);
    ok(
      nasce[0] <= nasce[1] && nasce[1] <= nasce[2],
      `os planos nascem escalonados, o distante primeiro (t = ${nasce.join(' → ')})`,
    );

    // --- 4. callouts por último ----------------------------------------------
    const calloutEm = linhas.find((l) => l.calloutOpacidade > 0.02);
    const cubosCheios = linhas.find((l) => l.planoT.every((v) => v > 0.98));
    ok(
      Boolean(calloutEm && cubosCheios && cubosCheios.t <= calloutEm.t),
      `os callouts entram depois do enxame estar posto ` +
        `(enxame completo em t=${cubosCheios?.t ?? '—'}, callouts em t=${calloutEm?.t ?? '—'})`,
    );

    /*
     * 5. O headline do hero SAI, e sai antes de o enxame encher (§4.1: a copy
     * do hero zera em 0,45 do vídeo, e o enxame só fica denso depois).
     *
     * A exigência de que `heroSaiu` EXISTA não é detalhe: numa primeira versão
     * a condição era `!heroSaiu || ...`, que passava justamente quando a saída
     * não estava implementada. Um teste que aprova a ausência do que ele
     * verifica não verifica nada.
     */
    const heroSaiu = linhas.find((l) => l.heroOpacidade < 0.05);
    ok(
      Boolean(heroSaiu),
      `o headline do hero de fato sai de cena ` +
        `(opacidade mínima ${Math.min(...linhas.map((l) => l.heroOpacidade)).toFixed(2)})`,
    );
    ok(
      Boolean(heroSaiu && cubosCheios && heroSaiu.t <= cubosCheios.t),
      `e sai antes de o enxame encher ` +
        `(hero zera em t=${heroSaiu?.t ?? '—'}, enxame completo em t=${cubosCheios?.t ?? '—'})`,
    );

    /*
     * 6. Cada guia chega ao callout dela.
     *
     * Esta lei não está no §4.1 — ela existe porque a versão anterior desenhava
     * as quatro guias esticadas por 1,78 na vertical, com duas delas fora da
     * tela, e todas as leis acima passavam mesmo assim: elas medem opacidade e
     * ordem, não geometria. Ver a nota em components/sections/problema.module.css.
     */
    const fim = linhas[linhas.length - 1];
    const ligadas = (fim?.guias ?? []).filter(
      (g) => g.cy !== null && Math.abs(g.gy - g.cy) < 40 && g.dx < 220,
    );
    ok(
      (fim?.guias?.length ?? 0) === 4 && ligadas.length === 4,
      `as quatro guias chegam aos callouts ` +
        `(desvios verticais ${(fim?.guias ?? []).map((g) => (g.cy === null ? '—' : Math.round(g.gy - g.cy))).join(', ')}px)`,
    );

    /*
     * 7. Cada guia é PINTADA de ponta a ponta.
     *
     * A lei 6 confere para onde a guia aponta; esta confere que ela chega lá.
     * São coisas diferentes, e a diferença custou três fases: `pathLength` com
     * `non-scaling-stroke` deixava o traço ser medido em unidades do viewBox e
     * rasterizado em pixels de tela, e a metade colada ao callout não era
     * desenhada. `getBoundingClientRect` devolvia a caixa inteira o tempo todo.
     */
    mkdirSync(TMP, { recursive: true });
    const captura = `${TMP}/guias.png`;
    writeFileSync(captura, await screenshot());
    const caixas = await evaluate(`(() => [...document.querySelectorAll('#problema polyline')]
      .map((l) => { const b = l.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; }))()`);
    const pintadas = caixas.map((c) => extensaoPintada(captura, c));
    console.log(
      `
  tinta das guias: ${pintadas.map((p) => `${(p.fracao * 100).toFixed(0)}%`).join('  ')}`,
    );
    ok(
      pintadas.length === 4 && pintadas.every((p) => p.fracao > 0.92),
      `as quatro guias são pintadas de ponta a ponta ` +
        `(${pintadas.map((p) => `${(p.fracao * 100).toFixed(0)}%`).join(', ')} da caixa de cada uma)`,
    );

    if (falhas.length) throw new Error(`${falhas.length} lei(s) do §4.1 não verificada(s)`);
    console.log('\nOK — a transição reproduz a ordem de eventos do §4.1.');
  },
  { port: Number(argv.port ?? 9472), profile: '.shots/.chrome-problema' },
);
