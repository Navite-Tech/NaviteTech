/**
 * Aceite da Fase 11 — responsivo.
 *
 * O §18 pede três coisas: capturas em 390/768/1024/1440/1920, nenhum pin
 * abaixo de 900px e nenhum transbordo horizontal. As demais leis aqui são as
 * que ESTA fase precisou criar, cada uma nascida de um defeito medido — estão
 * comentadas uma a uma.
 *
 * Duas larguras fora da lista do plano entram como permanentes: 320px, porque
 * é onde as quebras fixas do headline se desfazem primeiro, e 1366x768, porque
 * é onde a composição do CTA punha o botão de envio fora da tela.
 *
 *   node scripts/check-responsivo.mjs --url=http://localhost:3431
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');

const VIEWPORTS = [
  { w: 320, h: 568, nome: 'estreito' },
  { w: 390, h: 844, nome: 'mobile' },
  { w: 768, h: 1024, nome: 'tablet-retrato' },
  { w: 1024, h: 768, nome: 'tablet-paisagem' },
  { w: 1366, h: 768, nome: 'notebook-baixo' },
  { w: 1440, h: 900, nome: 'desktop' },
  { w: 1920, h: 1080, nome: 'desktop-largo' },
];

let falhas = 0;
let leis = 0;

function lei(ok, texto, detalhe = '') {
  leis++;
  if (!ok) falhas++;
  console.log(`${ok ? '  ok  ' : ' FALHA'} ${texto}${detalhe ? `   ${detalhe}` : ''}`);
}

/*
 * O elemento culpado, não só o número.
 *
 * `scrollWidth > clientWidth` diz que existe transbordo e nada mais. Descartar
 * o que tem ancestral recortado é obrigatório: a camada do símbolo põe nós
 * fora da tela de propósito, e sem o filtro a lista vira ruído.
 */
const TRANSBORDO = `(() => {
  const de = document.documentElement;
  const limite = de.clientWidth;
  const recortado = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (o.overflowX !== 'visible' || o.overflowY !== 'visible') return true;
    }
    return false;
  };
  const fora = [];
  for (const el of document.body.querySelectorAll('*')) {
    const b = el.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    if (b.right <= limite + 0.5 && b.left >= -0.5) continue;
    if (recortado(el)) continue;
    fora.push('<' + el.tagName.toLowerCase() + '> ' + (el.getAttribute('class') || '').slice(0, 40));
  }
  return { excedente: de.scrollWidth - de.clientWidth, fora: fora.slice(0, 4) };
})()`;

/*
 * "Nenhum pin registrado" tem duas leituras, e as duas são verificadas.
 *
 * O plano escreveu o critério contando `ScrollTrigger.getAll()`, mas neste
 * projeto prender a tela é `position: sticky` (a razão está em
 * lib/scroll/triggers.ts). Então: nenhuma seção sticky E nenhum `pin-spacer`,
 * que é o nó que o ScrollTrigger injeta quando pina de verdade. Se algum dia
 * alguém trocar sticky por pin, a segunda metade pega.
 */
const PRESOS = `(() => ({
  sticky: [...document.querySelectorAll('section, section > div')]
    .filter((el) => getComputedStyle(el).position === 'sticky')
    .map((el) => el.closest('section')?.id ?? '?'),
  spacers: document.querySelectorAll('.pin-spacer').length,

}))()`;

/*
 * Contagens por faixa (§12).
 *
 * O plano conta como presente quando ele está no layout E tem tinta. A distinção
 * passou a importar na Fase 14: no tablet o plano `far` deixou de sumir com
 * `display: none` e passou a ter opacidade ligada ao agrupamento — invisível no
 * enxame, inteiro na retícula do Método, onde as 83 unidades dele são metade das
 * células (components/cubes/cubes.module.css).
 *
 * Medir só `checkVisibility` diria "três planos" com o campo disperso, que é
 * exatamente o oposto do que se vê. A lei continua sendo a mesma pergunta — "o
 * campo é mais ralo no tablet?" — feita ao que aparece, e não ao que existe.
 */
const CONTAGENS = `(() => {
  const visivel = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  const conta = (sel) => [...document.querySelectorAll(sel)].filter(visivel).length;
  const planos = ['far', 'mid', 'near'].filter((p) => {
    const plano = document.querySelector(\`[data-plane='\${p}']\`);
    if (!plano || parseFloat(getComputedStyle(plano).opacity) <= 0.01) return false;
    return [...plano.children].some(visivel);
  });
  return { cubos: conta('[data-cube-id]'), planos };
})()`;

/*
 * As três linhas do headline do hero.
 *
 * A composição inteira do hero pende delas (§9.2): quebradas, o bloco cresce e
 * régua, corpo e botão descem junto. Medido por Range, que é a TINTA — a caixa
 * do `<h1>` é a coluna e não diz onde o texto chega.
 */
const HEADLINE = `(() => {
  const linhas = [];
  for (const sp of document.querySelectorAll('h1 [class*="lineInner"]')) {
    const r = document.createRange();
    r.selectNodeContents(sp);
    linhas.push(...r.getClientRects());
  }
  const col = document.querySelector('[class*="heroText"]').getBoundingClientRect();
  const maior = linhas.reduce((a, b) => (b.width > a.width ? b : a), linhas[0]);
  return { n: linhas.length, folga: Math.round(col.right - maior.right) };
})()`;

/*
 * O botão de envio dentro da dobra — a lei que esta fase existe para não
 * perder de novo.
 *
 * A seção fica presa em 100dvh, então o que passa da base da tela não é só
 * feio: é INALCANÇÁVEL. Medido antes da correção: 87px abaixo em 1366x768,
 * 32 em 1280x800, 13 em 1024x768.
 */
const BOTAO = `(() => {
  const btn = document.querySelector('#contato form button');
  if (!btn) return null;
  const b = btn.getBoundingClientRect();
  return { base: Math.round(b.bottom), fora: Math.round(b.bottom - innerHeight) };
})()`;

/*
 * Título contra a BARRA do header, com a seção no topo da tela.
 *
 * Esta lei substitui a do contador `NN — 06`, que media a mesma coisa contra um
 * objeto que não existe mais: o contador saiu na Fase 14, junto com o indicador
 * de rolagem, porque os dois eram interface EXPLICANDO em que ponto da narrativa
 * o leitor estava.
 *
 * Trocar o objeto não foi cosmético. Deixada como estava, a lei consultava um
 * `[class*="hud"]` inexistente, devolvia `null` para as cinco seções e passava
 * com `pior: — Infinity` — uma aprovação que não verificava nada, que é a pior
 * espécie de teste.
 *
 * O que ficou no lugar é a pergunta certa para o header novo: ele FLUTUA sobre
 * o conteúdo, e o que separa a barra do título é a folga superior das cascas
 * (`--header-height` mais o espaço da seção). Encolher a reserva sem reequilibrar
 * as cascas põe o título por baixo da barra, e é aqui que isso aparece.
 */
const folgaDoTitulo = (id) => `(() => {
  const sec = document.getElementById(${JSON.stringify(id)});
  const tit = sec.querySelector('h1, h2');
  const barra = document.querySelector('header > div:first-child');
  if (!tit || !barra) return null;
  return Math.round(tit.getBoundingClientRect().top - barra.getBoundingClientRect().bottom);
})()`;

/* A peça: centro e tinta, para conferir a marca d'água do §9.2. */
const PECA = `(() => {
  const b = (id) => document.getElementById(id).getBoundingClientRect();
  const e = b('sym-left');
  const d = b('sym-right');
  return {
    esqX: +(e.left + e.width / 2).toFixed(1),
    dirX: +(d.left + d.width / 2).toFixed(1),
    y: +(e.top + e.height / 2).toFixed(1),
    lado: Math.round(e.width),
    vw: document.documentElement.clientWidth,
    vh: document.documentElement.clientHeight,
    palco: +getComputedStyle(document.querySelector('[data-symbol-stage]')).opacity,
  };
})()`;

/*
 * A pose que o CSS entrega ANTES de o JavaScript existir.
 *
 * Sem isto a peça é pintada num lugar e salta para outro no primeiro quadro do
 * escritor — no elemento mais importante da página, e justamente durante o
 * carregamento. Medido nesta fase: 70,3px de salto a 390px de largura, porque
 * a pose vinha em estilo EMBUTIDO, e propriedade personalizada embutida vence
 * qualquer media query.
 *
 * A medição bloqueia a execução de scripts durante a navegação, reabilita e só
 * então mede: os scripts da página já foram descartados, então o React não
 * hidratou e o que está na tela é o CSS puro.
 */
const POSE = `(() => {
  const b = document.getElementById('sym-left').getBoundingClientRect();
  return { cx: +(b.left + b.width / 2).toFixed(1), cy: +(b.top + b.height / 2).toFixed(1),
           lado: Math.round(b.width) };
})()`;

await run(
  async ({ evaluate, setViewport, navigate, send }) => {
    for (const vp of VIEWPORTS) {
      const mobile = vp.w < 900;
      await setViewport(vp.w, vp.h);

      console.log(`\n=== ${vp.w}x${vp.h} — ${vp.nome} ===`);

      // --- a pose de antes do JS, contra a pose depois dele ----------------
      await send('Emulation.setScriptExecutionDisabled', { value: true });
      await send('Page.navigate', { url: `${url}/` });
      await sleep(2000);
      await send('Emulation.setScriptExecutionDisabled', { value: false });
      const semJs = await evaluate(POSE);

      await navigate(`${url}/`, 2600);
      await evaluate('window.scrollTo(0, 0)');
      await sleep(700);
      const comJs = await evaluate(POSE);
      const salto = Math.hypot(semJs.cx - comJs.cx, semJs.cy - comJs.cy);
      lei(
        salto < 1 && Math.abs(semJs.lado - comJs.lado) < 2,
        'a peça não salta quando o JS assume',
        `${salto.toFixed(1)}px, lado ${semJs.lado}→${comJs.lado}`,
      );

      const t = await evaluate(TRANSBORDO);
      lei(t.excedente <= 0, 'sem transbordo horizontal', `${t.excedente}px ${t.fora.join(' | ')}`);

      const p = await evaluate(PRESOS);
      if (mobile) {
        lei(
          p.sticky.length === 0 && p.spacers === 0,
          'nenhum pin abaixo de 900px',
          `sticky ${p.sticky.length} · pin-spacer ${p.spacers}`,
        );
      } else {
        lei(p.spacers === 0, 'nenhum pin-spacer (prender é sticky)', `${p.spacers}`);
        lei(p.sticky.length >= 3, 'três seções ou mais presas', `${p.sticky.length}`);
      }

      const h = await evaluate(HEADLINE);
      lei(h.n === 3, 'headline do hero em três linhas', `${h.n} linhas, folga ${h.folga}px`);
      lei(h.folga >= 0, 'headline não invade a margem', `folga ${h.folga}px`);

      /*
       * ESPERA o campo existir antes de contá-lo.
       *
       * `CubeStage` é montado no cliente (`next/dynamic` com `ssr: false`) —
       * decisão da Fase 13, que tirou 138KB de HTML crítico. Enquanto ele não
       * hidrata não existe UM `[data-cube-id]` no documento, e a lei do campo
       * ralo media zero e reprovava. O sintoma era intermitente, que é o pior
       * tipo: a mesma execução passava numa rodada e falhava na seguinte,
       * conforme a máquina estivesse mais ou menos ocupada.
       */
      for (let i = 0; i < 24; i++) {
        if (await evaluate(`document.querySelectorAll('[data-cube-id]').length > 0`)) break;
        await sleep(250);
      }

      const c = await evaluate(CONTAGENS);
      if (mobile) {
        lei(c.cubos >= 8 && c.cubos <= 10, 'campo ralo no mobile (8 a 10)', `${c.cubos}`);
      } else if (vp.w < 1280) {
        lei(c.planos.length === 2, 'tablet com dois planos de cubos', c.planos.join('+'));
      } else {
        lei(c.planos.length === 3, 'desktop com três planos de cubos', c.planos.join('+'));
      }

      /*
       * A peça abaixo de 900px: centrada e em marca d'água (§9.2). Medida no
       * hero, onde ela está fechada — as duas metades concêntricas.
       */
      const peca = await evaluate(PECA);
      if (mobile) {
        const centro = Math.abs(peca.esqX - peca.vw / 2);
        lei(centro <= 1, 'peça centrada no mobile', `${centro.toFixed(1)}px do centro`);
        lei(peca.palco < 0.4, 'peça em marca de água', `opacidade ${peca.palco}`);
      }

      // --- contato: o botão precisa caber na tela, em qualquer altura --------
      const alvo = await evaluate(
        `(() => { const s = document.getElementById('contato');
           return s.getBoundingClientRect().top + scrollY + s.offsetHeight - innerHeight; })()`,
      );
      await evaluate(`window.scrollTo(0, ${alvo})`);
      await sleep(1200);

      const btn = await evaluate(BOTAO);
      lei(btn !== null && btn.fora < 0, 'botão de envio dentro da dobra', `${btn?.fora}px`);

      /*
       * Medido com CADA seção no topo da tela, e não uma vez com a página
       * numa posição qualquer.
       *
       * A versão anterior desta varredura media tudo depois de rolar até o fim
       * do Contato, e então o FAQ — que está em modo fluxo — aparecia 717px
       * acima do próprio título. O número não descrevia defeito nenhum:
       * descrevia o instrumento olhando para o lugar errado. A barra do header
       * é fixa, mas o título só está no lugar que interessa quando a seção dele
       * chega ao topo.
       */
      let pior = { id: '—', folga: Infinity };
      for (const id of ['problema', 'servicos', 'processo', 'faq', 'contato']) {
        const topo = await evaluate(
          `document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top + scrollY`,
        );
        await evaluate(`window.scrollTo(0, ${topo})`);
        await sleep(700);
        const folga = await evaluate(folgaDoTitulo(id));
        if (folga !== null && folga < pior.folga) pior = { id, folga };
      }
      lei(
        pior.folga >= 0,
        'nenhum título por baixo da barra do header',
        `pior: ${pior.id} ${pior.folga}px`,
      );
    }

    console.log(`\n${leis - falhas}/${leis} leis passam`);
    if (falhas) {
      console.log(`${falhas} FALHA(S)`);
      process.exitCode = 1;
    }
  },
  { port: Number(argv.port ?? 9536), profile: '.shots/.chrome-resp11' },
);
