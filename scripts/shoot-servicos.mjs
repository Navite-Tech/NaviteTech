/**
 * Captura a seção Serviços ao longo do curso dela.
 *
 * Mesma correção de calha do `shoot-hero.mjs`: a referência é um render sem
 * barra de rolagem, e com `scrollbar-gutter: stable` a área útil encolhe — que
 * é contra o que todo percentual do CSS se resolve. A janela é aumentada pela
 * largura da calha e a captura é recortada de volta, para que os marcos caiam
 * onde a medição diz.
 *
 *   node scripts/shoot-servicos.mjs --url=http://localhost:3396
 *   node scripts/shoot-servicos.mjs --p=0,0.3,0.52,0.74,0.96
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');
const { encodePNG } = require('../tools/png-write.cjs');

/**
 * Recorta a calha da barra de rolagem DEPOIS da captura, em vez de passar
 * `clip` ao CDP.
 *
 * O `clip` do Page.captureScreenshot é em coordenadas de PÁGINA, não de tela.
 * Com a página rolada até Serviços, um clip em y=0 captura o topo do documento
 * — onde não há nada, porque tanto o conteúdo preso quanto o símbolo e o header
 * estão em `sticky`/`fixed` e já saíram dali. A primeira rodada saiu em navy
 * chapado por causa disso.
 */
function recortar(arquivo, largura) {
  const img = decodePNG(arquivo);
  const rgb = Buffer.alloc(largura * img.h * 3);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * img.w + x) * 4;
      const o = (y * largura + x) * 3;
      rgb[o] = img.rgba[i];
      rgb[o + 1] = img.rgba[i + 1];
      rgb[o + 2] = img.rgba[i + 2];
    }
  }
  return encodePNG(largura, img.h, rgb);
}

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);
const dir = argv.out ?? '.shots/fase-7';
const pontos = String(argv.p ?? '0,0.16,0.3,0.41,0.52,0.74,0.96,1')
  .split(',')
  .map(Number);
mkdirSync(dir, { recursive: true });

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    await setViewport(W, H);
    await navigate(url, 1200);
    const calha = await evaluate('innerWidth - document.documentElement.clientWidth');
    await setViewport(W + calha, H);
    await navigate(url, 1800);
    const util = await evaluate(
      '({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight })',
    );
    console.log(`calha ${calha}px · área útil ${util.w}x${util.h}`);

    const geo = await evaluate(`(() => {
      const s = document.getElementById('servicos');
      return { topo: s.getBoundingClientRect().top + scrollY, curso: s.offsetHeight - innerHeight };
    })()`);

    for (const p of pontos) {
      await evaluate(`(async () => {
        window.scrollTo(0, ${geo.topo + p * geo.curso});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      await sleep(700);
      const nome = `${dir}/servicos-p${String(Math.round(p * 100)).padStart(3, '0')}.png`;
      writeFileSync(nome, await screenshot());
      writeFileSync(nome, recortar(nome, W));
      const reveal = await evaluate(
        `getComputedStyle(document.getElementById('servicos')).getPropertyValue('--reveal').trim()`,
      );
      console.log(`→ ${nome}   reveal=${reveal}`);
    }
  },
  { port: Number(argv.port ?? 9478), profile: '.shots/.chrome-servicos-shot' },
);
