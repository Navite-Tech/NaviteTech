/**
 * Captura o hero com a ÁREA ÚTIL exatamente igual à da referência.
 *
 * A referência é um render sem barra de rolagem. A página real tem uma, e com
 * `scrollbar-gutter: stable` ela estreita a área de conteúdo — que é contra a
 * qual todo percentual do CSS se resolve. Capturar em 1672 de janela daria
 * 1657 de conteúdo, e cada marco sairia deslocado por um erro que é do
 * instrumento, não do layout.
 *
 * Então: mede a calha, recompõe a janela para que a área útil dê 1672, e
 * recorta a captura nessa largura.
 *
 *   node scripts/shoot-hero.mjs --url=http://localhost:3360
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);
const out = argv.out ?? '.shots/fase-5/hero.png';
mkdirSync(dirname(out), { recursive: true });

await run(
  async ({ evaluate, setViewport, navigate, screenshot, send }) => {
    await setViewport(W, H);
    await navigate(url, 1200);
    const calha = await evaluate('innerWidth - document.documentElement.clientWidth');
    console.log(`calha da barra de rolagem: ${calha}px`);

    await setViewport(W + calha, H);
    await navigate(url, 1200);
    const util = await evaluate(
      '({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight })',
    );
    console.log(`área útil: ${util.w}x${util.h}`);

    // A entrada dura ~1,5s somando o atraso dos marcadores. Espera assentar.
    await sleep(Number(argv.settle ?? 2600));

    const png = await screenshot({ clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    writeFileSync(out, png);
    console.log(`→ ${out}  (recortado em ${W}x${H})`);
    void send;
  },
  { port: Number(argv.port ?? 9440), profile: '.shots/.chrome-hero' },
);
