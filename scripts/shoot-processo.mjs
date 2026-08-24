/**
 * Captura a seção Processo ao longo do curso dela.
 *
 * Não existe referência visual para esta seção — o §11 do plano a descreve, e é
 * contra a descrição que as capturas são conferidas: os cubos chegam aos quatro
 * clusters, a linha desenha, os nós ativam em sequência.
 *
 * A correção de calha vem do `shoot-hero.mjs` e continua valendo por outra
 * razão: com `scrollbar-gutter: stable` a área útil encolhe, e é contra ela que
 * todo percentual do CSS se resolve. Sem o ajuste, uma captura de 1672 mede uma
 * composição de 1657 — o bastante para deslocar cada marco do trilho em 0,9%.
 *
 *   node scripts/shoot-processo.mjs --url=http://localhost:3431
 *   node scripts/shoot-processo.mjs --p=0,0.3,0.5,0.75,1
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
 * Com a página rolada até Processo, um clip em y=0 captura o topo do documento
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
const dir = argv.out ?? '.shots/fase-9';
const pontos = String(argv.p ?? '0,0.15,0.3,0.45,0.6,0.75,0.9,1')
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
      const s = document.getElementById('processo');
      return { topo: s.getBoundingClientRect().top + scrollY, curso: s.offsetHeight - innerHeight };
    })()`);

    for (const p of pontos) {
      await evaluate(`(async () => {
        window.scrollTo(0, ${geo.topo + p * geo.curso});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      await sleep(700);
      const nome = `${dir}/processo-p${String(Math.round(p * 100)).padStart(3, '0')}.png`;
      writeFileSync(nome, await screenshot());
      writeFileSync(nome, recortar(nome, W));
      const reveal = await evaluate(
        `getComputedStyle(document.getElementById('processo')).getPropertyValue('--reveal').trim()`,
      );
      console.log(`→ ${nome}   reveal=${reveal}`);
    }
  },
  { port: Number(argv.port ?? 9479), profile: '.shots/.chrome-processo-shot' },
);
