/**
 * Captura os cinco estados do formulário — o "capturados em screenshot" do §18.
 *
 * Uma imagem por estado, recortada no bloco daquele caso da rota
 * `/contato/estados`. Recortar em Node, e não pelo `clip` do CDP, pela mesma
 * razão da Fase 8: o `clip` é em coordenadas de PÁGINA, e a página está rolada.
 *
 *   node scripts/shoot-formulario.mjs --url=http://localhost:3431
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');
const { encodePNG } = require('../tools/png-write.cjs');

function recortar(arquivo, caixa) {
  const img = decodePNG(arquivo);
  const x0 = Math.max(0, Math.floor(caixa.x));
  const y0 = Math.max(0, Math.floor(caixa.y));
  const w = Math.min(img.w - x0, Math.ceil(caixa.w));
  const h = Math.min(img.h - y0, Math.ceil(caixa.h));
  const rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y + y0) * img.w + (x + x0)) * 4;
      const o = (y * w + x) * 3;
      rgb[o] = img.rgba[i];
      rgb[o + 1] = img.rgba[i + 1];
      rgb[o + 2] = img.rgba[i + 2];
    }
  }
  return encodePNG(w, h, rgb);
}

const argv = args();
const url = (argv.url ?? 'http://localhost:3000').replace(/\/$/, '');
const dir = argv.out ?? '.shots/fase-10';
mkdirSync(dir, { recursive: true });

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    /*
     * Um caso por captura, com a janela em tamanho normal.
     *
     * Duas tentativas antes desta falharam, e as duas por motivos que valem
     * ficar escritos. Rolar o bloco até o TOPO da tela o punha atrás do header
     * fixo, que ocupa os 144px de cima. E abrir uma janela de 2600px para
     * fotografar a página inteira de uma vez devolveu uma captura em que
     * metade dos elementos não tinha sido rasterizada — títulos, rótulos e
     * molduras ausentes, campos presentes. Janela normal, uma rolagem por
     * caso, com folga para o header.
     */
    await setViewport(Number(argv.w ?? 1280), Number(argv.h ?? 1000));
    await navigate(`${url}/contato/estados`, 2400);

    const nomes = await evaluate(
      `[...document.querySelectorAll('[data-caso]')].map((s) => s.dataset.caso)`,
    );

    for (const nome of nomes) {
      const alvo = `[...document.querySelectorAll('[data-caso]')].find((e) => e.dataset.caso === ${JSON.stringify(nome)})`;
      await evaluate(`window.scrollTo(0, ${alvo}.getBoundingClientRect().top + scrollY - 190)`);
      /*
       * A caixa é medida DEPOIS da espera, e não junto da rolagem.
       *
       * A página rola com suavização, então `window.scrollTo` inicia uma
       * animação: medir dois quadros depois devolvia a posição do MEIO do
       * percurso, e a captura, meio segundo mais tarde, mostrava outro pedaço
       * da página. As duas primeiras rodadas saíram em navy chapado por isso.
       */
      await sleep(700);
      const caixa = await evaluate(`(() => { const b = ${alvo}.getBoundingClientRect();
        return { x: b.left - 14, y: b.top - 14, w: b.width + 28, h: b.height + 28 }; })()`);

      const arquivo = `${dir}/formulario-${nome
        .replace(/[^a-z]+/gi, '-')
        .replace(/-$/, '')
        .toLowerCase()}.png`;
      writeFileSync(arquivo, await screenshot());
      writeFileSync(arquivo, recortar(arquivo, caixa));
      console.log(`→ ${arquivo}   ${Math.round(caixa.w)}x${Math.round(caixa.h)}`);
    }
  },
  { port: Number(argv.port ?? 9500), profile: '.shots/.chrome-formulario' },
);
