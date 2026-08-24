/**
 * Capturas com `prefers-reduced-motion: reduce` — a condição do §14.
 *
 *   node scripts/shoot-reduzido.mjs --url=http://localhost:3431
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');
const dir = resolve(argv.out ?? '.shots/fase-12/reduzido');
mkdirSync(dir, { recursive: true });

const VIEWPORTS = (argv.w ?? '1440x900,390x844').split(',').map((s) => {
  const [w, h] = s.split('x').map(Number);
  return { w, h };
});

const SECOES = ['hero', 'problema', 'servicos', 'processo', 'faq', 'contato'];

await run(
  async ({ evaluate, setViewport, navigate, screenshot, send }) => {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    for (const { w, h } of VIEWPORTS) {
      await setViewport(w, h);
      await navigate(`${url}/`, 2600);

      for (const id of SECOES) {
        await evaluate(`(() => {
          const el = document.getElementById(${JSON.stringify(id)});
          const topo = el.getBoundingClientRect().top + scrollY;
          window.scrollTo(0, topo + Math.max(0, el.offsetHeight - innerHeight) / 2);
        })()`);
        await sleep(900);
        const arquivo = join(dir, `${id}-${w}x${h}.png`);
        writeFileSync(arquivo, await screenshot());
        console.log('→', arquivo);
      }
    }
  },
  { port: Number(argv.port ?? 9552), profile: '.shots/.chrome-reduzido' },
);
