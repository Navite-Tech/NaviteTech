/**
 * Diagnóstico exploratório da Fase 11 — NÃO é o aceite.
 *
 * Varre as cinco larguras do §18 e reporta o que estiver quebrado, sem julgar:
 * transbordo horizontal (com o elemento culpado), o que continua preso abaixo
 * de 900px, e a caixa dos blocos principais de cada seção. A lista de leis
 * permanentes vive em `check-responsivo.mjs`; este arquivo é o que produz essa
 * lista.
 *
 *   node scripts/diag-responsivo.mjs --url=http://localhost:3431
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');

const VIEWPORTS = [
  { w: 390, h: 844, nome: 'mobile' },
  { w: 768, h: 1024, nome: 'tablet-retrato' },
  { w: 1024, h: 768, nome: 'tablet-paisagem' },
  { w: 1440, h: 900, nome: 'desktop' },
  { w: 1920, h: 1080, nome: 'desktop-largo' },
];

const SECOES = ['hero', 'problema', 'servicos', 'processo', 'faq', 'contato'];

/*
 * Transbordo é medido com o elemento CULPADO, não só com o número da página.
 *
 * `scrollWidth > clientWidth` diz que existe, e nada mais. A varredura abaixo
 * percorre todo elemento visível e reporta os que ultrapassam a borda direita
 * do documento — o que transforma "há 14px de transbordo" em "é este nó".
 *
 * Elementos com um ancestral de `overflow: hidden` são descartados: eles não
 * empurram a página, e sem esse filtro a lista vira ruído (a camada do símbolo
 * sozinha põe dezenas de nós fora da tela de propósito).
 */
const CULPADOS = `(() => {
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
    fora.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').slice(0, 60),
      left: Math.round(b.left),
      right: Math.round(b.right),
    });
  }
  return {
    scrollWidth: de.scrollWidth,
    clientWidth: de.clientWidth,
    fora: fora.slice(0, 8),
  };
})()`;

const PRESOS = `[...document.querySelectorAll('section, section > div')]
  .map((el) => ({
    id: el.closest('section')?.id || '?',
    cls: (el.getAttribute('class') || '').slice(0, 40),
    pos: getComputedStyle(el).position,
  }))
  .filter((x) => x.pos === 'sticky' || x.pos === 'fixed')`;

await run(
  async ({ evaluate, setViewport, navigate }) => {
    for (const vp of VIEWPORTS) {
      await setViewport(vp.w, vp.h);
      await navigate(`${url}/`, 2200);
      await evaluate('window.scrollTo(0, 0)');
      await sleep(500);

      console.log(`\n=== ${vp.w}x${vp.h} (${vp.nome}) ==========================`);

      const ov = await evaluate(CULPADOS);
      const excedente = ov.scrollWidth - ov.clientWidth;
      console.log(
        `transbordo: ${excedente}px  (scroll ${ov.scrollWidth} / client ${ov.clientWidth})`,
      );
      for (const f of ov.fora) {
        console.log(`   fora: <${f.tag}> ${f.cls}  [${f.left}..${f.right}]`);
      }

      const presos = await evaluate(PRESOS);
      console.log(`presos: ${presos.length}`);
      for (const p of presos) console.log(`   ${p.id}  ${p.pos}  ${p.cls}`);

      const doc = await evaluate(
        `({ altura: document.documentElement.scrollHeight,
            telas: +(document.documentElement.scrollHeight / innerHeight).toFixed(2) })`,
      );
      console.log(`documento: ${doc.altura}px = ${doc.telas} telas`);

      const tipo = await evaluate(`(() => {
        const h1 = document.querySelector('h1');
        const s = getComputedStyle(h1);
        return { display: s.fontSize, largura: Math.round(h1.getBoundingClientRect().width) };
      })()`);
      console.log(`headline: ${tipo.display} (caixa ${tipo.largura}px)`);

      // Caixa de cada seção — para ver se alguma colapsou ou ficou gigante.
      for (const id of SECOES) {
        const s = await evaluate(`(() => {
          const el = document.getElementById(${JSON.stringify(id)});
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { alt: Math.round(b.height), topo: Math.round(b.top + scrollY) };
        })()`);
        if (s)
          console.log(`   ${id.padEnd(9)} topo ${String(s.topo).padStart(6)}  altura ${s.alt}`);
      }

      /*
       * `checkVisibility()`, e não `display !== 'none'`.
       *
       * O afinamento do campo no mobile esconde o PLANO inteiro; o `display`
       * computado de cada cubo dentro dele continua sendo `block`, porque
       * `display: none` num ancestral não se propaga para o valor computado
       * do descendente. Medindo assim, a primeira rodada contou 148 cubos
       * visíveis a 390px onde havia 18.
       */
      const contagens = await evaluate(`(() => {
        const visivel = (el) => el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
        const conta = (sel) => [...document.querySelectorAll(sel)].filter(visivel).length;
        return {
          cubos: document.querySelectorAll('[data-cube-id]').length,
          cubosVisiveis: conta('[data-cube-id]'),
          callouts: conta('[class*="callout"]:not([class*="callouts"])'),
          cards: conta('[data-card]'),
          nos: conta('[data-no]'),
        };
      })()`);
      console.log(
        `cubos ${contagens.cubosVisiveis}/${contagens.cubos} · callouts ${contagens.callouts} · cards ${contagens.cards} · nós ${contagens.nos}`,
      );
    }
  },
  { port: Number(argv.port ?? 9520), profile: '.shots/.chrome-resp' },
);
