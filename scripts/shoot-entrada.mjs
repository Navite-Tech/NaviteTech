/**
 * Captura a coreografia de ENTRADA do hero num único carregamento.
 *
 * A entrada é o §9.2 do plano: headline linha a linha sob máscara, régua em
 * scaleX, corpo e botão em fade com 18px, indicador, e os marcadores por
 * último. Uma captura só não mostra ordem nenhuma — o que se verifica aqui é a
 * SEQUÊNCIA.
 *
 * As animações são pausadas e avançadas pela Web Animations API, em vez de
 * dormir entre capturas: assim os instantes são exatos e não dependem do
 * agendador da máquina.
 *
 * NÃO pelo domínio `Animation` do CDP: habilitá-lo numa página com dezenas de
 * animações CSS despeja um evento por animação criada e por animação iniciada,
 * e o harness afoga. `getAnimations()` do próprio documento faz o mesmo
 * trabalho sem tráfego nenhum.
 *
 *   node scripts/shoot-entrada.mjs --url=http://localhost:3360
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const out = argv.out ?? '.shots/fase-5/entrada';
const marcos = (argv.t ?? '0,180,360,560,760,980,1400,2000').split(',').map(Number);
mkdirSync(out, { recursive: true });

await run(
  async ({ setViewport, navigate, screenshot, evaluate }) => {
    await setViewport(1440, 900);
    await navigate(url, 600);

    const n = await evaluate(`(() => {
      const as = document.getAnimations();
      as.forEach((a) => a.pause());
      return as.length;
    })()`);
    console.log(`${n} animações pausadas`);

    for (const t of marcos) {
      await evaluate(
        `document.getAnimations().forEach((a) => { try { a.currentTime = ${t}; } catch {} });`,
      );
      await sleep(120);
      const f = join(out, `t${String(t).padStart(4, '0')}.png`);
      writeFileSync(f, await screenshot());
      console.log(`→ ${f}`);
    }
  },
  { port: Number(argv.port ?? 9441), profile: '.shots/.chrome-entrada' },
);
