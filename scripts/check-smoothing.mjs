/**
 * Os quatro critérios do gate da Fase 4b, verificados no navegador.
 *
 * A decisão sobre o Lenis está registrada em lib/scroll/smoothing.ts. Este
 * script é o que a torna re-verificável: se alguma condição deixar de valer —
 * uma atualização do Lenis que passe a interceptar o toque, por exemplo — ele
 * reprova, em vez de a regressão sobreviver escondida.
 *
 * O critério (a), a redução do tremor, mora em scripts/scroll-quality.mjs, que
 * precisa dos dois builds para comparar. Aqui ficam os outros três, que se
 * verificam num build só.
 *
 *   node scripts/check-smoothing.mjs --url=http://localhost:3350
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';

/**
 * A sonda é registrada DEPOIS que a página assentou, então na mesma fase de
 * borbulhamento ela roda por último e enxerga o que os outros ouvintes fizeram.
 *
 * Gesto de toque sintetizado não serve para isto: `Input.synthesizeScrollGesture`
 * com origem `touch` rola 0px neste harness até numa página sem símbolo nenhum,
 * então mediria o harness. `defaultPrevented` mede o que importa — se alguém
 * tomou o evento do navegador.
 */
const PROBE = `(() => {
  window.__pv = {
    touchmove: null,
    wheel: null,
    lenis: document.documentElement.classList.contains('lenis'),
  };
  addEventListener('touchmove', (e) => { window.__pv.touchmove = e.defaultPrevented; }, { passive: true });
  addEventListener('wheel', (e) => { window.__pv.wheel = e.defaultPrevented; }, { passive: true });
})()`;

await run(
  async ({ evaluate, setViewport, navigate, send }) => {
    const falhas = [];
    const linha = (ok, texto) => {
      console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
      if (!ok) falhas.push(texto);
    };

    // --- (d) movimento reduzido: a suavização não pode nem subir --------------
    await setViewport(1440, 900);
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await navigate(url, 2400);
    const reduzido = await evaluate("document.documentElement.classList.contains('lenis')");
    console.log('movimento reduzido');
    linha(!reduzido, 'suavização desligada sob prefers-reduced-motion');

    // --- estado normal --------------------------------------------------------
    await send('Emulation.setEmulatedMedia', { features: [] });
    await navigate(url, 2400);

    /*
     * ESPERA a suavização subir, em vez de torcer para que ela já tenha subido.
     *
     * O Lenis é iniciado dentro da coreografia do símbolo, depois de
     * `despertar()` liberar e do import dinâmico do GSAP chegar. Num servidor de
     * desenvolvimento, com perfil de Chrome novo e sem cache de HTTP, isso passa
     * dos 2400ms com facilidade — e a lei reprovava dizendo "suavização inativa"
     * quando o que faltava era tempo. A espera é limitada a 6s: se ela estourar,
     * a reprovação volta a significar o que sempre significou.
     */
    let ligado = false;
    for (let i = 0; i < 24; i++) {
      ligado = await evaluate("document.documentElement.classList.contains('lenis')");
      if (ligado) break;
      await sleep(250);
    }
    console.log('\ndesktop, movimento pleno');
    linha(ligado, 'suavização ativa');

    // --- (c) toque continua nativo -------------------------------------------
    await setViewport(390, 844);
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await navigate(url, 2400);

    /* mesma espera do bloco anterior, pelo mesmo motivo: sem o Lenis de pé, a
       lei da roda mede a ausência dele em vez do comportamento dele. */
    for (let i = 0; i < 24; i++) {
      if (await evaluate("document.documentElement.classList.contains('lenis')")) break;
      await sleep(250);
    }

    await evaluate(PROBE);
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 195, y: 500, id: 1 }],
    });
    await send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 195, y: 420, id: 1 }],
    });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 195,
      y: 500,
      deltaX: 0,
      deltaY: 120,
    });
    await sleep(500);
    const pv = await evaluate('window.__pv');
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });

    console.log('\ntoque (390×844)');
    linha(pv.touchmove === false, `touchmove chega sem defaultPrevented (foi ${pv.touchmove})`);
    if (ligado) {
      linha(pv.wheel === true, `a roda é interceptada, como esperado (foi ${pv.wheel})`);
    }

    // --- âncora do menu -------------------------------------------------------
    await setViewport(1440, 900);
    await navigate(url, 2400);
    const anc = await evaluate(`(async () => {
      const alvo = document.getElementById('contato').getBoundingClientRect().top + scrollY;
      document.querySelector('a[href="#contato"]').click();
      await new Promise((r) => setTimeout(r, 2500));
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      return { alvo: Math.round(alvo), chegou: Math.round(scrollY), pad: Math.round(pad) };
    })()`);
    const erro = Math.abs(anc.alvo - anc.pad - anc.chegou);
    console.log('\nâncora do menu → #contato');
    linha(
      erro <= 8,
      `para a ${anc.pad}px acima da seção, que é o scroll-padding-top (erro ${erro}px)`,
    );

    if (falhas.length) throw new Error(`${falhas.length} critério(s) reprovado(s)`);
    console.log('\nOK — a suavização atende às condições sob as quais foi adotada.');
  },
  { port: Number(argv.port ?? 9434), profile: '.shots/.chrome-smoothing' },
);
