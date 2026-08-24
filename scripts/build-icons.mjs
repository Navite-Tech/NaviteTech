/**
 * Rasteriza `app/icon.svg` no `apple-icon.png` do §15.
 *
 * Rasteriza no CHROME, e não com uma biblioteca: o ícone precisa ser
 * exatamente o que o navegador desenha a partir do mesmo path que a marca usa,
 * e o Chrome já está aqui para todas as outras verificações. Uma segunda
 * implementação de rasterização de path seria uma segunda oportunidade de a
 * marca divergir de si mesma.
 *
 * O `sharp` — que o Next traz e que o `npm audit` sinaliza — NÃO participa
 * disto, e é de propósito: nenhum caminho deste projeto o invoca.
 *
 *   node scripts/build-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const LADO = Number(argv.size ?? 180);

const svg = readFileSync('app/icon.svg', 'utf8');

/*
 * O SVG é embutido numa página cujo corpo tem exatamente o tamanho do ícone e
 * nenhuma margem, para que a captura de tela SEJA o ícone — sem recorte, sem
 * meio pixel de folga.
 */
const pagina = `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  svg { display: block; width: ${LADO}px; height: ${LADO}px; }
</style>
${svg}`;

await run(
  async ({ setViewport, navigate, screenshot }) => {
    await setViewport(LADO, LADO);
    await navigate(`data:text/html;charset=utf-8,${encodeURIComponent(pagina)}`, 900);
    await sleep(300);
    const png = await screenshot();
    writeFileSync('app/apple-icon.png', png);
    console.log(`→ app/apple-icon.png   ${LADO}x${LADO}   ${png.length} bytes`);
  },
  { port: Number(argv.port ?? 9570), profile: '.shots/.chrome-icons' },
);
