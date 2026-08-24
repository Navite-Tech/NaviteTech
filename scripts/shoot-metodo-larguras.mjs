/**
 * O Método EM REPOUSO, em cada largura — a varredura que decide o breakpoint.
 *
 * `shoot-responsivo.mjs` captura as seis seções no MEIO do curso de cada uma, o
 * que é certo para ver a composição em movimento e errado para decidir layout:
 * no meio do curso do Método as peças ainda estão entrando, e uma peça a 40% de
 * opacidade não deixa julgar se a descrição cabe.
 *
 * Aqui é uma seção só, sempre no repouso, em cada largura — e a saída é uma
 * imagem por largura, comparável lado a lado. O que se procura é o ponto em que
 * a peça fica comprimida: descrição quebrando em cinco ou seis linhas, título
 * requebrando, imagem lida como selo. É ali que o 2x2 tem de entrar, e o limiar
 * em components/process/process.module.css sobe até esse ponto.
 *
 * Imprime também a medida da peça e quantas linhas a descrição ocupou, que é o
 * número que responde a pergunta sem precisar contar a olho.
 *
 *   node scripts/shoot-metodo-larguras.mjs --url=http://localhost:3431
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');
const dir = resolve(argv.out ?? '.shots/fase-16/larguras');
mkdirSync(dir, { recursive: true });

const VIEWPORTS = (
  argv.w ?? '1672x941,1440x900,1366x768,1180x820,1024x768,960x900,900x900,820x1180,600x900,390x844'
)
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { w, h };
  });

/**
 * Altura de linha da descrição, para converter a altura da caixa em número de
 * linhas — que é a leitura que interessa.
 */
const MEDIDA = `(() => {
  const p = document.querySelector('[data-no="0"]');
  if (!p) return null;
  const b = p.getBoundingClientRect();
  const d = p.querySelector('[data-descricao]');
  const t = p.querySelector('h3');
  const cs = getComputedStyle(d);
  const lh = parseFloat(cs.lineHeight) || 1;
  const pecas = document.querySelector('[class*="pecas"]');
  const colunas = getComputedStyle(pecas).gridTemplateColumns.split(' ').length;
  return {
    peca: Math.round(b.width) + 'x' + Math.round(b.height),
    razao: +(b.width / b.height).toFixed(2),
    colunas,
    /*
     * Linhas de TEXTO, contadas com um Range — não a altura da caixa dividida
     * pelo line-height. A descrição carrega o véu como fundo e por isso tem
     * padding próprio; medir a caixa contava esse padding como linha e a
     * varredura passou a relatar 5 onde havia 4.
     */
    linhasDescricao: (() => {
      const range = document.createRange();
      range.selectNodeContents(d);
      return range.getClientRects().length;
    })(),
    linhasTitulo: Math.round(t.getBoundingClientRect().height / (parseFloat(getComputedStyle(t).lineHeight) || 1)),
    /*
     * A base da PEÇA, não a do contêiner. O contêiner é o item de uma faixa de
     * uma fração e se estica até o fim dela; medir a caixa dele dizia 860 numa
     * tela em que as peças terminavam em 670.
     *
     * Sem crase neste comentário: ele vive dentro de um template literal.
     */
    fundoDaLinha: Math.round(b.bottom),
    tela: innerHeight,
  };
})()`;

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    console.log('  largura     peça        razão  col  linhas(desc/tít)  base da linha / tela');
    for (const { w, h } of VIEWPORTS) {
      await setViewport(w, h);
      await navigate(`${url}/`, 2200);

      /*
       * Repouso: 0,85 do curso quando a seção prende; o topo dela quando está em
       * fluxo, onde o curso é zero e a composição já está posta.
       */
      await evaluate(`(async () => {
        const s = document.getElementById('processo');
        const topo = s.getBoundingClientRect().top + scrollY;
        const curso = Math.max(0, s.offsetHeight - innerHeight);
        window.scrollTo(0, topo + curso * 0.85);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      await sleep(1400);

      const m = await evaluate(MEDIDA);
      const nome = `${dir}/metodo-${w}x${h}.png`;
      writeFileSync(nome, await screenshot());

      console.log(
        `  ${String(w + 'x' + h).padEnd(10)}  ${String(m?.peca ?? '—').padEnd(10)}  ` +
          `${String(m?.razao ?? '—').padStart(5)}  ${String(m?.colunas ?? '—').padStart(3)}  ` +
          `${String(m?.linhasDescricao ?? '—').padStart(7)} / ${String(m?.linhasTitulo ?? '—')}` +
          `           ${m?.fundoDaLinha ?? '—'} / ${m?.tela ?? '—'}`,
      );
    }
    console.log(`\n  → ${dir}`);
  },
  { port: Number(argv.port ?? 9615), profile: '.shots/.chrome-larguras' },
);
