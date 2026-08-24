/**
 * Aceite da Fase 12 — acessibilidade e movimento reduzido.
 *
 * O §18 pede três coisas: axe-core sem violações, percurso completo por teclado
 * e, sob `prefers-reduced-motion`, um site integralmente legível e navegável com
 * o símbolo ainda contando a narrativa em estados discretos.
 *
 * As leis extras são as que esta fase precisou criar, cada uma nascida de um
 * defeito medido — todas comentadas.
 *
 *   node scripts/check-a11y.mjs --url=http://localhost:3431
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');

let leis = 0;
let falhas = 0;

function lei(ok, texto, detalhe = '') {
  leis++;
  if (!ok) falhas++;
  console.log(`${ok ? '  ok  ' : ' FALHA'} ${texto}${detalhe ? `   ${detalhe}` : ''}`);
}

const RODAR_AXE = `(async () => {
  const r = await axe.run(document, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
  });
  return r.violations.map((v) => ({ id: v.id, impacto: v.impact, total: v.nodes.length }));
})()`;

const TAB = { type: 'keyDown', windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' };
const ESC = { type: 'keyDown', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' };

/*
 * O `text` do Enter não é enfeite: sem ele o Chrome entrega um keydown sem
 * evento de caractere e um `<button>` não chega a ser ativado. A primeira
 * rodada desta fase reprovou quatro leis do menu por isso — o menu nunca abria,
 * e as três leis seguintes caíam em cascata.
 */
const ENTER = {
  type: 'keyDown',
  windowsVirtualKeyCode: 13,
  key: 'Enter',
  code: 'Enter',
  text: String.fromCharCode(13),
};

async function tecla(send, base) {
  await send('Input.dispatchKeyEvent', base);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: base.key, code: base.code });
  await sleep(90);
}

const FOCO = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    texto: (el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 34),
    tabindex: el.getAttribute('tabindex'),
    anel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
    noMenu: !!el.closest('#menu-mobile'),
    ehToggle: el.getAttribute('aria-controls') === 'menu-mobile',
  };
})()`;

/*
 * O percurso do teclado, por Tab REAL.
 *
 * Não dá para deduzir a ordem de foco lendo o DOM: `hidden`, `display: none` e
 * elementos cobertos mudam quem participa. A única leitura honesta é apertar
 * Tab e ver onde o foco cai.
 */
async function percorrer(cdp, limite) {
  const { send, evaluate } = cdp;
  await evaluate('document.body.focus(); window.scrollTo(0, 0)');
  const visto = [];
  for (let i = 0; i < limite; i++) {
    await tecla(send, TAB);
    const f = await evaluate(FOCO);
    if (!f) break;
    // O ciclo fechou: o foco voltou ao primeiro elemento.
    if (visto.length && f.texto === visto[0].texto && f.tag === visto[0].tag) break;
    visto.push(f);
  }
  return visto;
}

/* Hierarquia de títulos: um h1 e nenhum salto de nível (§15). */
const TITULOS = `(() => {
  const n = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => +h.tagName[1]);
  let salto = null;
  for (let i = 1; i < n.length; i++) if (n[i] - n[i - 1] > 1) salto = n[i - 1] + ' para ' + n[i];
  return { h1: n.filter((x) => x === 1).length, salto, niveis: n.join(',') };
})()`;

/* Estado do símbolo, em unidades da viewport — as mesmas de states.ts. */
const PECA = `(() => {
  const b = (id) => document.getElementById(id).getBoundingClientRect();
  const e = b('sym-left');
  const d = b('sym-right');
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  return {
    ex: +(((e.left + e.width / 2) / vw) * 100).toFixed(1),
    ey: +(((e.top + e.height / 2) / vh) * 100).toFixed(1),
    dx: +(((d.left + d.width / 2) / vw) * 100).toFixed(1),
    lado: Math.round(e.width),
    opE: +getComputedStyle(document.getElementById('sym-left')).opacity,
    opD: +getComputedStyle(document.getElementById('sym-right')).opacity,
  };
})()`;

/*
 * PRESENÇA do campo de cubos — a opacidade máxima entre os três planos.
 *
 * Substituiu uma medição de raio. Até a Fase 14 a afirmação do Método era "o
 * disperso vira ordem", e a lei media a contração do enxame em quatro
 * retículas: unidades ordenadas por x, partidas em quatro grupos, raio médio
 * dentro de cada um. Aquela geometria foi removida de propósito na Fase 15, e
 * com ela a lei — um teste que defende uma decisão revogada é âncora, não rede.
 *
 * A afirmação agora é outra: a matéria bruta SAI para revelar as quatro
 * imagens. Sob movimento reduzido isso não é uma dissolução contínua, é um
 * degrau — o campo está cheio no Problema e ausente no Processo —, e é
 * exatamente o degrau que esta sonda mede.
 *
 * A opacidade é lida no PLANO, e não no cubo: é lá que ela é aplicada, e um
 * `checkVisibility` por unidade devolveria "visível" para 168 nós dentro de
 * uma camada que está em zero.
 */
const PRESENCA = `(() => {
  const planos = [...document.querySelectorAll('[data-plane]')];
  if (!planos.length) return null;
  return {
    n: document.querySelectorAll('[data-cube-id]').length,
    op: +Math.max(...planos.map((p) => +getComputedStyle(p).opacity)).toFixed(3),
  };
})()`;

await run(
  async (cdp) => {
    const { evaluate, setViewport, navigate, send } = cdp;

    const medias = (valor) =>
      send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: valor }],
      });

    /*
     * Rola para DEPOIS da âncora, e não com `scrollIntoView()`.
     *
     * As trilhas discretas ancoram no topo de cada seção, e `scrollIntoView`
     * respeita o `scroll-padding-top` de 168px: ele para ANTES da âncora, e a
     * pose lida ainda é a da seção anterior. Na primeira rodada isso mediu o
     * mesmo raio de enxame nos dois pontos — 173,1 e 173,1 — e reprovou uma lei
     * que estava correta.
     */
    const irPara = (id, folga) =>
      evaluate(`(() => {
        const el = document.getElementById(${JSON.stringify(id)});
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY + ${folga});
      })()`);

    // ------------------------------------------------------------ axe-core --
    console.log('\n=== AXE-CORE ===');
    for (const cond of ['no-preference', 'reduce']) {
      for (const [w, h] of [
        [1440, 900],
        [390, 844],
      ]) {
        await medias(cond);
        await setViewport(w, h);
        await navigate(`${url}/`, 2600);
        await sleep(600);
        await evaluate(AXE);
        const v = await evaluate(RODAR_AXE);
        const nome = cond === 'reduce' ? 'movimento reduzido' : 'movimento pleno';
        lei(
          v.length === 0,
          `sem violações em ${w}x${h} (${nome})`,
          v.map((x) => `${x.id}[${x.total}]`).join(' '),
        );
      }
    }

    // A rota de diagnóstico traz os seis estados do formulário, inclusive os de
    // erro — que é onde `aria-describedby` e a mensagem inline são exercidos.
    await medias('no-preference');
    await setViewport(1440, 900);
    await navigate(`${url}/contato/estados`, 2400);
    await evaluate(AXE);
    const vEstados = await evaluate(RODAR_AXE);
    lei(
      vEstados.length === 0,
      'sem violações na rota dos estados do formulário',
      vEstados.map((x) => `${x.id}[${x.total}]`).join(' '),
    );

    // ------------------------------------------------------------- teclado --
    console.log('\n=== TECLADO ===');
    await navigate(`${url}/`, 2600);

    const t = await evaluate(TITULOS);
    lei(t.h1 === 1, 'exatamente um <h1>', `${t.h1}`);
    lei(t.salto === null, 'nenhum salto de nível de título', t.salto ?? t.niveis);

    const foco = await percorrer(cdp, 30);
    lei(
      foco.length >= 17,
      'o percurso alcança todo o conteúdo interativo',
      `${foco.length} paradas`,
    );
    lei(foco[0]?.texto.startsWith('Pular'), 'o primeiro foco é o skip-link', foco[0]?.texto ?? '—');
    lei(
      foco.every((f) => f.anel),
      'todo ponto de foco tem anel visível',
      `${foco.filter((f) => !f.anel).length} sem anel`,
    );
    lei(
      foco.every((f) => !f.tabindex || Number(f.tabindex) <= 0),
      'nenhum tabindex positivo',
    );
    lei(
      foco.filter((f) => f.tag === 'summary').length === 6,
      'as seis perguntas do FAQ estão no percurso',
      `${foco.filter((f) => f.tag === 'summary').length}`,
    );
    lei(
      foco.filter((f) => f.tag === 'input' || f.tag === 'textarea').length === 4 &&
        foco.some((f) => f.texto === 'Enviar'),
      'os quatro campos e o botão de envio estão no percurso',
      `${foco.filter((f) => f.tag === 'input' || f.tag === 'textarea').length} campos`,
    );

    /*
     * O skip-link tem de MOVER O FOCO, não só rolar.
     *
     * Um `<a href="#conteudo">` sempre rola até o alvo; mover o foco só
     * acontece se o alvo for focável, e `<main>` não é. Medido antes da
     * correção: depois de acionar o link, `document.activeElement` continuava
     * sendo o `<body>` e a tabulação seguinte recomeçava do header — o link não
     * pulava nada. É o defeito clássico do skip-link, invisível a olho nu
     * porque a página de fato rola.
     */
    await evaluate('document.body.focus(); window.scrollTo(0, 0)');
    await tecla(send, TAB);
    await tecla(send, ENTER);
    await sleep(400);
    const depoisDoSkip = await evaluate(`(() => {
      const el = document.activeElement;
      return { id: el?.id ?? null, dentro: !!el?.closest('#conteudo') };
    })()`);
    lei(
      depoisDoSkip.id === 'conteudo' || depoisDoSkip.dentro,
      'o skip-link move o foco para o conteúdo',
      `foco em #${depoisDoSkip.id ?? '(body)'}`,
    );

    // ------------------------------------------------- menu móvel e o foco --
    console.log('\n=== MENU MÓVEL ===');
    await setViewport(390, 844);
    await navigate(`${url}/`, 2600);
    await evaluate('document.body.focus(); window.scrollTo(0, 0)');

    let noBotao = false;
    for (let i = 0; i < 6 && !noBotao; i++) {
      await tecla(send, TAB);
      noBotao = (await evaluate(FOCO))?.ehToggle === true;
    }
    lei(noBotao, 'o botão do menu é alcançável por teclado');

    await tecla(send, ENTER);
    await sleep(300);
    const aberto = await evaluate(
      `document.querySelector('[aria-controls="menu-mobile"]').getAttribute('aria-expanded')`,
    );
    lei(aberto === 'true', 'Enter abre o menu', `aria-expanded=${aberto}`);

    const dentro = await evaluate(FOCO);
    lei(dentro?.noMenu === true, 'o foco entra no painel ao abrir', dentro?.texto ?? '—');

    /*
     * O ciclo do foco (§9.1). O painel cobre a tela inteira e o resto da página
     * continua atrás dele: sem prender o foco, o Tab sai para links cobertos e
     * o cursor de foco some da vista sem que nada na tela explique para onde
     * ele foi.
     */
    let escapou = false;
    for (let i = 0; i < 8; i++) {
      await tecla(send, TAB);
      const f = await evaluate(FOCO);
      if (f && !f.noMenu && !f.ehToggle) {
        escapou = true;
        break;
      }
    }
    lei(!escapou, 'o foco não escapa do painel aberto');

    await tecla(send, ESC);
    await sleep(300);
    const fechado = await evaluate(
      `document.querySelector('[aria-controls="menu-mobile"]').getAttribute('aria-expanded')`,
    );
    const voltou = await evaluate(FOCO);
    lei(fechado === 'false', 'Escape fecha o menu', `aria-expanded=${fechado}`);
    lei(voltou?.ehToggle === true, 'e devolve o foco a quem abriu', voltou?.texto ?? '—');

    // -------------------------------------------------- movimento reduzido --
    console.log('\n=== MOVIMENTO REDUZIDO ===');
    await medias('reduce');
    await setViewport(1440, 900);
    await navigate(`${url}/`, 2800);
    await sleep(700);

    lei(
      !(await evaluate(`document.documentElement.classList.contains('lenis')`)),
      'a suavização de rolagem fica desligada (§14)',
    );

    const presos = await evaluate(
      `[...document.querySelectorAll('section, section > div')]
         .filter((el) => getComputedStyle(el).position === 'sticky').length`,
    );
    lei(presos === 0, 'nenhuma seção fica presa — tudo em fluxo', `${presos}`);

    /*
     * As poses discretas, e a última delas.
     *
     * Esta lei existe por causa de um defeito que só a medição pega: com a
     * trilha do desktop, as três âncoras do Contato caíam no mesmo pixel (em
     * fluxo, o curso de uma seção é ~0), as coincidentes eram descartadas e a
     * última pose alcançada em toda a página era `ctaReturn` — a metade direita
     * a 55% de opacidade, a caminho. O `( )` nunca se reconstituía.
     */
    const alt = await evaluate('document.documentElement.scrollHeight - innerHeight');
    const poses = [];
    for (let i = 0; i <= 30; i++) {
      await evaluate(`window.scrollTo(0, ${Math.round((alt * i) / 30)})`);
      await sleep(400);
      const p = await evaluate(PECA);
      const chave = `${p.ex}/${p.ey}/${p.dx}/${p.lado}/${p.opE}/${p.opD}`;
      if (!poses.length || poses[poses.length - 1].chave !== chave) poses.push({ chave, p });
    }
    lei(
      poses.length >= 5,
      'o símbolo percorre pelo menos cinco poses discretas',
      `${poses.length}`,
    );

    const fim = poses[poses.length - 1]?.p;
    lei(
      fim !== undefined && Math.abs(fim.ex - fim.dx) < 0.5 && fim.opE === 1 && fim.opD === 1,
      'e fecha o ( ) no fim — as duas metades juntas e opacas',
      fim ? `esq ${fim.ex} dir ${fim.dx} op ${fim.opE}/${fim.opD}` : '—',
    );

    // Conteúdo integralmente legível: os quatro cards e as quatro etapas.
    await irPara('servicos', 40);
    await sleep(700);
    const cards = await evaluate(
      `[...document.querySelectorAll('[data-card]')]
         .filter((c) => c.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length`,
    );
    lei(cards === 4, 'os quatro cards de serviço ficam legíveis ao mesmo tempo', `${cards}`);

    /*
     * As quatro etapas continuam sendo quatro `[data-no]` com uma descrição
     * dentro, e o seletor continua o mesmo — o que mudou por baixo é o que cada
     * um É. Eram painéis vazados sobre uma régua; são estados de imagem num
     * painel só. Sob movimento reduzido os quatro viram sequência vertical, em
     * fluxo, e por isso continuam legíveis ao mesmo tempo.
     */
    const etapas = await evaluate(`(() => {
      const d = [...document.querySelectorAll('[data-no] [class*="descricao"]')];
      return d.filter((e) => +getComputedStyle(e).opacity > 0.5).length;
    })()`);
    lei(etapas === 4, 'as quatro etapas do Processo ficam legíveis ao mesmo tempo', `${etapas}`);

    /*
     * O campo SAI DE CENA no Método, em estados discretos (§14: sem rolagem
     * presa, a narrativa vira degrau em vez de dissolução).
     *
     * Esta é a afirmação que a seção faz depois da Fase 15, e ela precisa valer
     * também para quem pede movimento reduzido: sem ela, o Método seria uma
     * nuvem de cubos parada por cima de quatro imagens que existem justamente
     * para substituí-la.
     *
     * As MESMAS instâncias continuam montadas — isso é lei do
     * `check-processo.mjs`, e é o que separa "o campo saiu" de "o campo foi
     * desmontado". Aqui só se mede a presença.
     */
    await irPara('problema', 40);
    await sleep(800);
    const cheio = await evaluate(PRESENCA);
    await irPara('processo', 40);
    await sleep(1000);
    const saiu = await evaluate(PRESENCA);
    lei(
      cheio !== null && saiu !== null && cheio.op > 0.5 && saiu.op < 0.08,
      'o campo de cubos sai de cena no Processo, em estados discretos',
      `presença ${cheio?.op} para ${saiu?.op}, com ${saiu?.n} unidades ainda montadas`,
    );

    console.log(`\n${leis - falhas}/${leis} leis passam`);
    if (falhas) {
      console.log(`${falhas} FALHA(S)`);
      process.exitCode = 1;
    }
  },
  { port: Number(argv.port ?? 9556), profile: '.shots/.chrome-check-a11y' },
);
