'use client';

import { useEffect } from 'react';
import { despertar } from '@/lib/scroll/despertar';

type Props = {
  /** id da seção cujo progresso será publicado. */
  id: string;
  /**
   * Fim do curso, na notação do ScrollTrigger. O padrão `bottom bottom` faz o
   * progresso terminar quando a seção para de estar presa.
   *
   * O hero usa `bottom top`: a saída dele (§9.2) precisa acontecer DEPOIS de as
   * metades começarem a separar, e o curso preso do hero — 0,3 de tela — se
   * esgota antes disso. Medido: com `bottom bottom` o headline zerava em 0,13 da
   * janela hero→problema, e a separação só começa em 0,22. A ordem do §4.1
   * saía invertida.
   */
  fim?: string;
};

/**
 * O ÚNICO escritor de progresso de uma seção. Não renderiza nada.
 *
 * Publica `--reveal` na própria seção, de 0 a 1 ao longo do curso dela. Tudo o
 * que depende do progresso — a saída do hero, a entrada dos callouts, o
 * desenho das linhas-guia — deriva daí em CSS, sem gatilho próprio.
 *
 * `--reveal` mora na SEÇÃO, e não numa camada, porque os callouts são conteúdo
 * (z acima do símbolo) e os cubos são fundo (z abaixo): a seção é o ancestral
 * comum das duas, e uma propriedade customizada herda para os dois lados sem
 * duplicar o gatilho.
 *
 * Até a Fase 8 este componente escrevia também o nascimento e o parallax dos
 * cubos. Não escreve mais: o campo subiu para uma camada de página na Fase 9,
 * porque o §11 pede as mesmas instâncias convergindo três seções adiante, e
 * ganhou o próprio escritor em `lib/cubes/choreography.ts`. Aqui ficou o que de
 * fato pertence a uma seção — o progresso dela.
 *
 * O ScrollTrigger daqui apenas LÊ progresso, como o do símbolo.
 */
export function SectionProgress({ id, fim = 'bottom bottom' }: Props) {
  useEffect(() => {
    let cancelado = false;
    let descartar: (() => void) | null = null;

    void (async () => {
      // Cede a thread para a entrada do hero pintar. Ver lib/scroll/despertar.ts.
      await despertar();
      if (cancelado) return;

      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelado) return;

      const secao = document.getElementById(id);
      if (!secao) return;

      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          const escrever = (p: number) => secao.style.setProperty('--reveal', p.toFixed(4));

          const gatilho = ScrollTrigger.create({
            trigger: secao,
            start: 'top top',
            end: fim,
            scrub: true,
            onUpdate: (self) => escrever(self.progress),
          });

          /*
           * Uma escrita imediata, e ela NÃO é redundante.
           *
           * `onUpdate` do ScrollTrigger dispara quando a rolagem MUDA. Numa
           * página carregada já dentro da seção — recarregar no meio do
           * documento, voltar por âncora, restaurar posição — o gatilho nasce
           * com o progresso certo e nunca o publica, então os callouts ficam em
           * opacidade 0 até alguém rolar.
           *
           * Foi assim que apareceu: uma captura no fim da seção saiu sem cubo
           * nenhum, enquanto a sonda de DOM, que rolava depois de carregar, os
           * encontrava todos no lugar.
           */
          escrever(gatilho.progress);
        });

        /*
         * Movimento reduzido: o campo já está posto e os callouts já estão
         * legíveis. O conteúdo é o mesmo; só não chega em ondas.
         */
        mm.add('(prefers-reduced-motion: reduce)', () => {
          secao.style.setProperty('--reveal', '1');
        });
      }, secao);

      descartar = () => {
        ctx.revert();
        secao.style.removeProperty('--reveal');
      };
    })();

    return () => {
      cancelado = true;
      descartar?.();
    };
  }, [id, fim]);

  return null;
}
