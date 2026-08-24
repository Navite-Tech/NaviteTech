'use client';

import { useEffect } from 'react';
import { JOURNEY_ID, SCRUB } from '@/lib/scroll/triggers';
import { despertar } from '@/lib/scroll/despertar';
// Só o tipo: importar o módulo aqui traria o GSAP para o bundle inicial, que é
// exatamente o que o import dinâmico lá embaixo evita.
import type { Segment } from '@/lib/symbol/choreography';
import type { SymbolState } from '@/lib/symbol/states';

/**
 * O motor da coreografia. Não renderiza nada.
 *
 * Carrega GSAP e o ScrollTrigger DEPOIS do primeiro paint, por import dinâmico:
 * o hero já está legível e o símbolo já está no lugar (por CSS) quando estes
 * ~38 KB chegam. Nada da página depende deles para existir.
 *
 * O ScrollTrigger aqui apenas LÊ progresso — nunca escreve no DOM. Quem escreve
 * é `lib/symbol/choreography.ts`, e só ele.
 */
export function SymbolChoreography() {
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | null = null;

    void (async () => {
      // Cede a thread para a entrada do hero pintar. Ver lib/scroll/despertar.ts.
      await despertar();
      if (cancelled) return;

      const [{ default: gsap }, { ScrollTrigger }, choreo, scroll, smoothing] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('@/lib/symbol/choreography'),
        import('@/lib/scroll/boundaries'),
        import('@/lib/scroll/smoothing'),
      ]);
      if (cancelled) return;

      const left = document.getElementById('sym-left');
      const right = document.getElementById('sym-right');
      const journey = document.getElementById(JOURNEY_ID);
      if (!left || !right || !journey) return;

      gsap.registerPlugin(ScrollTrigger);

      // A suavização, se ligada, só muda COMO a posição de rolagem evolui. O
      // ScrollTrigger continua sendo quem lê e a coreografia nem toma ciência.
      const smoother = await smoothing.startSmoothing(gsap, ScrollTrigger);
      if (cancelled) {
        smoother?.destroy();
        return;
      }

      const writer = choreo.createWriter({
        left,
        right,
        shadows: Array.from(document.querySelectorAll<HTMLElement>('[data-symbol-shadow]')),
      });

      let segments: Segment[] = [];

      /** Remede tudo. Chamado em todo refresh do ScrollTrigger. */
      function remeasure() {
        writer.measure();
        segments = choreo.resolveTrack(
          scroll.measureBoundaries(),
          document.documentElement.clientHeight,
        );
        if (process.env.NODE_ENV !== 'production') {
          for (const msg of scroll.assertTravel(
            scroll.measureBoundaries(),
            document.documentElement.clientHeight,
          )) {
            console.warn(`[coreografia] ${msg}`);
          }
        }
      }

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        // --- movimento pleno: o símbolo acompanha a rolagem continuamente -----
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          const p = { t: 0 };
          let start = 0;
          let length = 1;

          // O tween é só um portador de progresso suavizado: o `scrub` faz a
          // coreografia alcançar a rolagem em SCRUB segundos, o que tira a
          // aspereza dos deltas brutos de roda sem tirar o controle do usuário.
          const carrier = gsap.to(p, {
            t: 1,
            ease: 'none',
            onUpdate: () => writer.write(choreo.stateAt(segments, start + p.t * length)),
          });

          ScrollTrigger.create({
            animation: carrier,
            trigger: journey,
            start: 'top top',
            end: 'bottom bottom',
            scrub: SCRUB,
            invalidateOnRefresh: true,
            onRefresh: (self) => {
              remeasure();
              start = self.start;
              length = Math.max(1, self.end - self.start);
              writer.write(choreo.stateAt(segments, window.scrollY));
            },
          });
        });

        // --- movimento reduzido: estados discretos, sem scrub ----------------
        mm.add('(prefers-reduced-motion: reduce)', () => {
          let current: SymbolState | null = null;
          ScrollTrigger.create({
            trigger: journey,
            start: 'top top',
            /*
             * ATÉ O FIM DO DOCUMENTO, e não até o fim da jornada.
             *
             * O `#journey` acaba onde o rodapé começa, e `onUpdate` só dispara
             * enquanto o PROGRESSO do gatilho muda. Da base da jornada até a
             * base do documento o progresso fica cravado em 1 — nenhuma
             * atualização, e a última pose escrita continua sendo a anterior.
             *
             * No percurso contínuo isso nunca apareceu, porque lá a pose é
             * interpolada e o trecho final já havia chegado ao fim. Em estados
             * DISCRETOS a última troca acontece exatamente na última âncora, e
             * ela caía nesse ponto cego.
             */
            end: 'max',
            onRefresh: remeasure,
            /*
             * A ROLAGEM DE VERDADE, e não uma reconstruída do progresso.
             *
             * Este ramo não tem scrub — não há inércia a modelar —, então
             * `window.scrollY` é o número exato que a trilha espera. A versão
             * anterior calculava `self.start + self.progress * (self.end -
             * self.start)`, o que é a mesma coisa APENAS dentro do gatilho: o
             * `#journey` termina antes do rodapé, e no fim do documento a conta
             * satura exatamente na última âncora.
             *
             * "Exatamente" foi o problema. Quando a seção do Contato mede uma
             * tela cravada — o que passou a acontecer na Fase 14, com o header
             * flutuante devolvendo 60px ao conteúdo —, o fim do gatilho e a
             * âncora do Contato caem no MESMO pixel, e o erro de ponto flutuante
             * decidia o desempate: 6454,9999 contra 6455. Medido, a última pose
             * alcançada em toda a página era `faqHidden` — as duas metades
             * invisíveis. Para quem pede movimento reduzido, o `( )` não se
             * reconstituía, e a página terminava em branco.
             *
             * O campo de cubos já lia `window.scrollY` nos dois ramos
             * (components/cubes/CubeChoreography.tsx). Agora o símbolo também.
             */
            onUpdate: () => {
              const state = choreo.snapAt(segments, window.scrollY);
              if (state === current) return;
              current = state;
              writer.write(state);
            },
          });
        });
      });

      remeasure();
      writer.write(choreo.stateAt(segments, window.scrollY));

      // As fontes chegam depois do primeiro layout e mudam a altura das seções.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      dispose = () => {
        ctx.revert();
        smoother?.destroy();
      };
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return null;
}
