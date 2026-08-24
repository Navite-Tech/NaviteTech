/**
 * Verificações do hero que não são geométricas — o que `tools/compare-hero.cjs`
 * não cobre.
 *
 *   (a) `prefers-reduced-motion` deixa o hero INTEIRO legível de imediato:
 *       nenhuma animação de entrada rodando, nada com opacidade zero, nada
 *       cortado por clip-path.
 *   (b) o texto acessível do h1 é uma frase só, apesar de estar partido em três
 *       spans para a máscara de entrada.
 *   (c) a ordem de pintura é ambiente → marcadores → símbolo → conteúdo, que é
 *       o que faz a peça estar DENTRO do campo e não sobre ele.
 *
 *   node scripts/check-hero.mjs --url=http://localhost:3370
 */
import { args, run } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';

await run(
  async ({ evaluate, setViewport, navigate, send }) => {
    const falhas = [];
    const linha = (ok, texto) => {
      console.log(`  ${ok ? '✓' : '✗'} ${texto}`);
      if (!ok) falhas.push(texto);
    };

    // --- (a) movimento reduzido --------------------------------------------
    await setViewport(1440, 900);
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await navigate(url, 1800);

    const red = await evaluate(`(() => {
      // Só CONTEÚDO. Decoração translúcida de propósito (o anel do indicador
      // está medido em 0,85) não é sintoma de animação presa.
      const alvos = [...document.querySelectorAll('#hero h1 span, #hero p, #hero a')];
      const invisiveis = alvos.filter((el) => {
        const cs = getComputedStyle(el);
        return parseFloat(cs.opacity) < 0.99;
      }).length;
      const cortados = alvos.filter((el) => {
        const cp = getComputedStyle(el).clipPath;
        return cp && cp !== 'none' && /100%/.test(cp);
      }).length;
      return {
        animando: document.getAnimations().filter((a) => a.playState === 'running').length,
        invisiveis,
        cortados,
        marcadores: document.querySelectorAll('#hero i').length,
      };
    })()`);
    console.log('movimento reduzido (1440×900)');
    linha(red.animando === 0, `nenhuma animação rodando (foram ${red.animando})`);
    linha(red.invisiveis === 0, `nada com opacidade < 1 (foram ${red.invisiveis})`);
    linha(red.cortados === 0, `nada cortado por clip-path (foram ${red.cortados})`);
    linha(red.marcadores > 0, `campo de ambientação presente (${red.marcadores} marcas)`);

    // --- (b) texto acessível ------------------------------------------------
    await send('Emulation.setEmulatedMedia', { features: [] });
    await navigate(url, 2600);
    /*
     * A normalizacao acontece AQUI, no Node, e nao na pagina.
     *
     * Mandar uma expressao com barra invertida pelo fio e frágil por dois
     * motivos somados: um heredoc de shell come uma barra, e um literal de
     * template em JS come a outra. O sintoma e silencioso — a regra /\s+/g
     * chegou ao navegador como /s+/g e a verificacao passou a apagar a letra
     * "s" do texto que estava conferindo, acusando "preci a" no lugar de
     * "precisa".
     */
    const bruto = await evaluate(`document.getElementById('hero-titulo').textContent`);
    const h1 = bruto.replace(/\s+/g, ' ').trim();
    const esperado = 'Tecnologia para o que precisa funcionar melhor.';
    console.log('\ntexto acessível');
    linha(h1 === esperado, `h1 lê "${h1}"`);

    // --- (c) ordem de pintura ----------------------------------------------
    const z = await evaluate(`(() => {
      const zi = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).zIndex : null;
      };
      const empilha = (sel) => {
        // sobe a árvore procurando um ancestral que crie contexto de empilhamento
        let el = document.querySelector(sel)?.parentElement;
        while (el && el !== document.body) {
          const cs = getComputedStyle(el);
          if (cs.zIndex !== 'auto' && cs.position !== 'static') return el.className;
          if (cs.position === 'sticky') return el.className;
          el = el.parentElement;
        }
        return null;
      };
      return {
        ambiente: zi('[class*="Environment"]'),
        marcadores: zi('#hero > div:first-child'),
        // Por atributo, e nao por nome de classe: um seletor de subcadeia
        // "stage" casava primeiro com o envelope de entrada, cujo z-index e
        // auto, e o teste media o elemento errado.
        simbolo: zi('[data-symbol-stage]'),
        conteudoPreso: empilha('#hero h1'),
      };
    })()`);
    console.log('\nordem de pintura');
    linha(z.ambiente === '0', `ambiente em z-index ${z.ambiente} (esperado 0)`);
    linha(z.marcadores === '0', `campo de marcadores em z-index ${z.marcadores} (esperado 0)`);
    linha(z.simbolo === '1', `símbolo em z-index ${z.simbolo} (esperado 1)`);
    linha(z.conteudoPreso !== null, `conteúdo dentro do contexto preso ("${z.conteudoPreso}")`);

    if (falhas.length) throw new Error(`${falhas.length} verificação(ões) reprovada(s)`);
    console.log('\nOK — hero atende às verificações não geométricas.');
  },
  { port: Number(argv.port ?? 9453), profile: '.shots/.chrome-hero-check' },
);
