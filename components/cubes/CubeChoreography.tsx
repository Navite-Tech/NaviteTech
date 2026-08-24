'use client';

import { useEffect } from 'react';
import { JOURNEY_ID } from '@/lib/scroll/triggers';
import { despertar } from '@/lib/scroll/despertar';
// Só o tipo: importar o módulo aqui traria o GSAP para o bundle inicial.
import type { Segment } from '@/lib/cubes/choreography';
import type { FieldState } from '@/lib/cubes/states';

/**
 * O motor do campo de cubos. Não renderiza nada.
 *
 * Estrutura idêntica à de `SymbolChoreography`, e a semelhança é o ponto: o
 * campo virou um objeto persistente, e um objeto persistente tem trilha,
 * escritor único e remedição a cada refresh.
 *
 * `scrub: true` — SEM inércia, e é a única diferença de fundo em relação ao
 * símbolo. As anotações do Problema (callouts e linhas-guia, escritas por
 * `SectionProgress`) apontam para o enxame, e as duas coisas precisam andar no
 * mesmo passo: com 0,6s de atraso aqui, a guia chegaria a um cubo que ainda não
 * está onde ela mira. Campo e anotações são um sistema só, e um sistema só tem
 * um relógio.
 */
export function CubeChoreography() {
  useEffect(() => {
    let cancelado = false;
    let descartar: (() => void) | null = null;

    void (async () => {
      // Cede a thread para a entrada do hero pintar. Ver lib/scroll/despertar.ts.
      await despertar();
      if (cancelado) return;

      const [{ default: gsap }, { ScrollTrigger }, choreo, scroll] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('@/lib/cubes/choreography'),
        import('@/lib/scroll/boundaries'),
      ]);
      if (cancelado) return;

      const stage = document.querySelector<HTMLElement>('[data-cube-stage]');
      const journey = document.getElementById(JOURNEY_ID);
      if (!stage || !journey) return;

      gsap.registerPlugin(ScrollTrigger);

      const writer = choreo.createWriter({
        stage,
        planes: Array.from(stage.querySelectorAll<HTMLElement>('[data-plane]')),
      });

      let segments: Segment[] = [];
      const remedir = () => {
        segments = choreo.resolveTrack(
          scroll.measureBoundaries(),
          document.documentElement.clientHeight,
        );
      };

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          ScrollTrigger.create({
            trigger: journey,
            start: 'top top',
            end: 'bottom bottom',
            scrub: true,
            invalidateOnRefresh: true,
            onRefresh: () => {
              remedir();
              writer.write(choreo.stateAt(segments, window.scrollY));
            },
            onUpdate: () => writer.write(choreo.stateAt(segments, window.scrollY)),
          });
        });

        /*
         * Movimento reduzido: estados discretos, como o símbolo. O campo continua
         * contando a mesma história — disperso, recuado, agrupado — só não fica
         * preso ao dedo do usuário. A transição curta vive no CSS.
         */
        mm.add('(prefers-reduced-motion: reduce)', () => {
          let atual: FieldState | null = null;
          ScrollTrigger.create({
            trigger: journey,
            start: 'top top',
            end: 'bottom bottom',
            onRefresh: () => {
              remedir();
              atual = null;
            },
            onUpdate: () => {
              const estado = choreo.snapAt(segments, window.scrollY);
              if (estado === atual) return;
              atual = estado;
              writer.write(estado);
            },
          });
        });
      });

      remedir();
      writer.write(choreo.stateAt(segments, window.scrollY));

      // As fontes chegam depois do primeiro layout e mudam a altura das seções.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      descartar = () => ctx.revert();
    })();

    return () => {
      cancelado = true;
      descartar?.();
    };
  }, []);

  return null;
}
