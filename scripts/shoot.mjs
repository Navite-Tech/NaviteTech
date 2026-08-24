/**
 * Harness de captura visual — plano §19.
 *
 * Não sobe nada por conta própria: assume que o dev server já está de pé
 * (`npm run dev`) ou recebe --url.
 *
 *   node scripts/shoot.mjs --w=1440x900
 *   node scripts/shoot.mjs --w=390x844,768x1024,1440x900 --out=.shots/fase-0
 *   node scripts/shoot.mjs --w=1440x900 --scroll=0,0.25,0.5,0.75,1
 *   node scripts/shoot.mjs --w=1440x900 --section=hero
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const outDir = resolve(argv.out ?? '.shots/latest');
const viewports = (argv.w ?? '1440x900').split(',').map((s) => {
  const [w, h] = s.split('x').map(Number);
  return { w, h };
});
const scrolls = argv.scroll ? argv.scroll.split(',').map(Number) : [0];
const section = argv.section ?? null;

mkdirSync(outDir, { recursive: true });

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    const written = [];

    for (const { w, h } of viewports) {
      await setViewport(w, h);
      await navigate(url);

      /*
       * ESPERA A COREOGRAFIA ASSUMIR, em vez de torcer para que ela tenha
       * assumido.
       *
       * O escritor do símbolo só publica depois de `despertar()` liberar e do
       * import dinâmico do GSAP chegar — e este script abre um PERFIL NOVO de
       * Chrome por diretório de saída, portanto sem cache de HTTP. Num servidor
       * de desenvolvimento isso passa de dois segundos com facilidade.
       *
       * O sintoma era mudo e mentia: a captura saía com a peça na pose inicial
       * do CSS — o `( )` aberto no lugar do hero — e parecia que o fechamento da
       * narrativa tinha sumido. A pose inline é o sinal exato de que o JS
       * assumiu, porque é ele quem a escreve.
       */
      for (let i = 0; i < 40; i++) {
        const pronto = await evaluate(`!!document.getElementById("sym-left")?.style.transform`);
        if (pronto) break;
        await sleep(250);
      }

      for (const s of scrolls) {
        // Rolar por fração da seção nomeada, ou do documento inteiro.
        const target = section
          ? `(() => {
               const el = document.getElementById(${JSON.stringify(section)});
               if (!el) throw new Error('seção ${section} não encontrada');
               const top = el.getBoundingClientRect().top + window.scrollY;
               return top + (el.offsetHeight - innerHeight) * ${s};
             })()`
          : `(document.documentElement.scrollHeight - innerHeight) * ${s}`;

        await evaluate(`(async () => {
          window.scrollTo(0, ${target});
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return window.scrollY;
        })()`);
        /*
         * 1200ms, e não 420: o scrub do símbolo tem 0,6s de inércia
         * (`SCRUB` em lib/scroll/triggers.ts), então 420ms capturavam a
         * coreografia A CAMINHO da pose, não nela. O sintoma era silencioso e
         * enganava — no fim do Contato a captura mostrava o `( )` ainda aberto,
         * como se o fechamento da narrativa não existisse.
         */
        await sleep(1200);

        const tag = [section ?? 'page', `${w}x${h}`, `p${String(s).replace('.', '')}`].join('-');
        const file = join(outDir, `${tag}.png`);
        writeFileSync(file, await screenshot());
        written.push(file);
        console.log('→', file);
      }
    }

    console.log(`\n${written.length} captura(s) em ${outDir}`);
  },
  { port: Number(argv.port ?? 9412), browser: argv.browser, profile: join(outDir, '.chrome') },
);
