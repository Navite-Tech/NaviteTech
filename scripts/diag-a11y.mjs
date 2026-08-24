/**
 * Diagnóstico exploratório da Fase 12 — NÃO é o aceite.
 *
 * Roda o axe-core nas duas condições de movimento e imprime a ordem de foco
 * completa. A lista de leis permanentes vive em `check-a11y.mjs`; este arquivo
 * é o que produz essa lista.
 *
 *   node scripts/diag-a11y.mjs --url=http://localhost:3431
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');

/*
 * O axe roda no documento inteiro. Duas coisas que ele NÃO cobre — e que por
 * isso viram lei própria adiante: a ORDEM de foco (ele confere tabindex, não o
 * percurso) e o comportamento sob movimento reduzido.
 */
const RODAR_AXE = `(async () => {
  const r = await axe.run(document, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
  });
  return r.violations.map((v) => ({
    id: v.id,
    impacto: v.impact,
    ajuda: v.help,
    nos: v.nodes.slice(0, 4).map((n) => ({
      alvo: n.target.join(' '),
      resumo: (n.failureSummary || '').split('\\n').slice(1, 3).join(' | '),
    })),
    total: v.nodes.length,
  }));
})()`;

/*
 * O percurso do teclado, por Tab REAL.
 *
 * Não dá para deduzir a ordem de foco lendo o DOM: `hidden`, `display: none` e
 * elementos fora da tela mudam quem participa. A única leitura honesta é
 * apertar Tab e ver onde o foco cai.
 */
async function percorrer(cdp, limite = 60) {
  const { send, evaluate } = cdp;
  await evaluate('document.body.focus(); window.scrollTo(0, 0)');
  const visto = [];
  for (let i = 0; i < limite; i++) {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      windowsVirtualKeyCode: 9,
      key: 'Tab',
      code: 'Tab',
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 9,
      key: 'Tab',
      code: 'Tab',
    });
    await sleep(70);
    const f = await evaluate(`(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        texto: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 32),
        tabindex: el.getAttribute('tabindex'),
        anel: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
        dentro: b.top >= -1 && b.bottom <= innerHeight + 1,
      };
    })()`);
    if (!f) break;
    visto.push(f);
  }
  return visto;
}

await run(
  async (cdp) => {
    const { evaluate, setViewport, navigate, send } = cdp;

    for (const cond of [
      { nome: 'movimento pleno', valor: 'no-preference' },
      { nome: 'movimento reduzido', valor: 'reduce' },
    ]) {
      for (const [w, h] of [
        [1440, 900],
        [390, 844],
      ]) {
        await send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: cond.valor }],
        });
        await setViewport(w, h);
        await navigate(`${url}/`, 2600);
        await sleep(700);

        console.log(`\n===== ${w}x${h} — ${cond.nome} =====`);

        await evaluate(AXE);
        const v = await evaluate(RODAR_AXE);
        console.log(`axe: ${v.length} violacao(oes)`);
        for (const x of v) {
          console.log(`  [${x.impacto}] ${x.id} — ${x.ajuda}  (${x.total} no(s))`);
          for (const n of x.nos) console.log(`      ${n.alvo}   ${n.resumo}`);
        }

        const foco = await percorrer(cdp, w < 900 ? 26 : 22);
        console.log(`foco: ${foco.length} paradas`);
        for (const [i, f] of foco.entries()) {
          console.log(
            `  ${String(i + 1).padStart(2)} <${f.tag}> ${f.texto.padEnd(32)} ` +
              `${f.anel ? 'anel' : 'SEM ANEL'} ${f.dentro ? '' : 'FORA'} ${f.tabindex ? `ti=${f.tabindex}` : ''}`,
          );
        }
      }
    }
  },
  { port: Number(argv.port ?? 9550), profile: '.shots/.chrome-a11y' },
);
