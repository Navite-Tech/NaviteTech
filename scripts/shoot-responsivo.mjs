/**
 * A varredura de capturas da Fase 11 — "screenshots em 390/768/1024/1440/1920"
 * do §18.
 *
 * Uma imagem por seção por largura, com a seção no meio do curso dela: é onde a
 * composição está inteira na tela, tanto na faixa em que a seção prende quanto
 * na faixa em que ela apenas cresce com o conteúdo.
 *
 *   node scripts/shoot-responsivo.mjs --url=http://localhost:3431
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');
const dir = resolve(argv.out ?? '.shots/fase-11/sweep');
mkdirSync(dir, { recursive: true });

/* As cinco do §18, mais as duas larguras que esta fase descobriu. */
const VIEWPORTS = (argv.w ?? '320x568,390x844,768x1024,1024x768,1366x768,1440x900,1920x1080')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { w, h };
  });

const SECOES = ['hero', 'problema', 'servicos', 'processo', 'faq', 'contato'];

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    for (const { w, h } of VIEWPORTS) {
      await setViewport(w, h);
      await navigate(`${url}/`, 2400);

      for (const id of SECOES) {
        /*
         * Meio do CURSO, não meio da altura.
         *
         * Numa seção presa, o curso é `altura − uma tela`; numa seção em fluxo
         * mais baixa que a tela, o curso é zero e o alvo vira o topo dela. A
         * mesma expressão serve às duas, o que é o que permite a varredura
         * cruzar a fronteira dos 900px sem dois caminhos de código.
         */
        await evaluate(`(() => {
          const el = document.getElementById(${JSON.stringify(id)});
          const topo = el.getBoundingClientRect().top + scrollY;
          window.scrollTo(0, topo + Math.max(0, el.offsetHeight - innerHeight) / 2);
        })()`);
        await sleep(750);

        const arquivo = join(dir, `${id}-${w}x${h}.png`);
        writeFileSync(arquivo, await screenshot());
        console.log('→', arquivo);
      }
    }
  },
  { port: Number(argv.port ?? 9538), profile: '.shots/.chrome-sweep11' },
);
