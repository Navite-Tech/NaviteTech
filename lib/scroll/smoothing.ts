import type gsapType from 'gsap';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

/**
 * Suavização inercial da rolagem — o assunto da Fase 4b.
 *
 * LIGAR OU DESLIGAR É ESTA CONSTANTE. Nenhuma timeline, nenhum componente e
 * nenhuma âncora da coreografia sabe da existência disto: o Lenis só muda COMO a
 * posição de rolagem evolui, e o ScrollTrigger continua sendo quem lê.
 *
 * ---
 *
 * DECISÃO DA FASE 4b: ADOTADO.
 *
 * A hipótese do plano (§6.2) era que os deltas brutos de roda no Windows
 * deixariam o movimento escalonado o bastante para quebrar a ilusão de objeto
 * contínuo. Medido em quatro janelas — duas transições da coreografia, duas
 * velocidades — com três execuções cada (`npm run check:scroll`):
 *
 *   janela / velocidade          tremor sem   com     redução
 *   hero→pico, 700px, 600px/s        0,362   0,048     −87%
 *   hero→pico, 700px, 2400px/s       0,248   0,098     −60%
 *   serviços→processo, 600px/s       0,097   0,059     −39%
 *   serviços→processo, 2400px/s      0,154   0,106     −31%
 *
 * "Tremor" é a parte de alta frequência da variação do deslocamento do símbolo
 * entre quadros, normalizada pelo passo médio — o coeficiente de variação puro
 * não serve, porque as curvas de easing variam a velocidade de propósito.
 *
 * Os quatro critérios do gate:
 *
 *   (a) reduzir o tremor em ≥30%      — 31% a 87%, nas quatro janelas
 *   (b) não custar quadros            — 0,0% de quadros perdidos a 60Hz nos dois;
 *                                       custo por quadro sem vsync 10,0/10,7ms
 *                                       sem contra 9,4/10,6ms com, p95 +0,2 a
 *                                       +3,6ms — dentro do ruído
 *   (c) não degradar o toque          — com `syncTouch: false`, `touchmove`
 *                                       chega ao fim com `defaultPrevented`
 *                                       falso: o dedo continua nativo
 *   (d) desligado sob movimento reduzido — verificado: a classe `lenis` nem
 *                                       aparece no `<html>`
 *
 * Duas observações que o gate não exigia mas que pesam:
 *
 *   • A premissa parcialmente falhou. O Chrome já suaviza a roda: num gesto
 *     lento a página anda com coeficiente de variação 0,29 e nenhum quadro
 *     parado. O escalonamento só aparece em rolagem rápida, onde 47% dos quadros
 *     a página não anda — e o `scrub: 0.6` sozinho já derrubava isso para 8,6%.
 *     O Lenis não corrige um defeito: ele melhora um movimento que já era bom.
 *
 *   • A navegação por âncora continua correta com ele ligado (chega a 132px do
 *     alvo, que é exatamente o `scroll-padding-top`), então a troca por
 *     `lenis.scrollTo` prevista no §8.3 do plano não foi necessária.
 */
export const SMOOTHING_ENABLED = true;

export type Smoother = { destroy: () => void } | null;

type Gsap = typeof gsapType;
type ScrollTriggerStatic = typeof ScrollTriggerType;

/**
 * Sobe a suavização e devolve como desmontá-la.
 *
 * Duas condições barram: a constante acima e `prefers-reduced-motion`. Prender
 * a rolagem a uma inércia é exatamente o tipo de coisa que quem pede movimento
 * reduzido não quer.
 */
export async function startSmoothing(gsap: Gsap, ScrollTrigger: ScrollTriggerStatic) {
  if (!SMOOTHING_ENABLED) return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const { default: Lenis } = await import('lenis');
  const lenis = new Lenis({
    duration: 0.9,
    smoothWheel: true,
    // Toque continua NATIVO. Suavizar o dedo do usuário é o caminho mais curto
    // para a página parecer travada num celular.
    syncTouch: false,
  });

  // O Lenis passa a ser a fonte da posição; o ScrollTrigger apenas lê.
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  // Sem isto, uma pausa longa (aba em segundo plano) faria o GSAP "recuperar" o
  // tempo perdido e a página daria um salto ao voltar.
  gsap.ticker.lagSmoothing(0);

  return {
    destroy: () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // padrão do GSAP
      lenis.destroy();
    },
  };
}
