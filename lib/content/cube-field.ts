import type { CubePlane } from './cubes';

/**
 * O referencial do campo de cubos — ÚNICO lugar onde estes números existem.
 *
 * `lib/content/cubes.ts` guarda cada cubo em coordenadas do VÃO (u/v/s
 * normalizados), e não em vw/vh, porque a referência tem aspecto 1,50 e o alvo
 * 1,78. É aqui que essas coordenadas encontram a viewport.
 *
 * Medido na PRÓPRIA implementação, capturando a seção Problema em 1672×941 no
 * fim do curso (`node .shots/tmp/meuvao.cjs`), que é o estado `problemOpen`:
 *
 *   vão            20,10vw de largura, centro em 63,16vw
 *   união das metades  50,72vw × 57,39vh, centro vertical em 54,20vh
 *
 * Não vale medir isso na referência: lá as metades estão degradadas em barras
 * de espessura uniforme (§3.2), e a posição delas não é a que `states.ts`
 * define. O enxame tem de encontrar o vão QUE EXISTE, não o do frame.
 */
export const CUBE_FIELD = {
  /** Centro do vão, em % da largura da viewport. */
  cx: 63.16,
  /** Centro vertical das metades, em % da altura. */
  cy: 54.2,
  /** Meia-largura do vão, em % da largura. */
  halfW: 10.05,
  /** Meia-altura das metades, em % da altura. */
  halfH: 28.7,
} as const;

export type Plane = {
  id: CubePlane;
  /** Progresso da seção em que o plano começa a nascer. */
  from: number;
  /** Progresso em que termina de nascer. */
  to: number;
  /** Deslocamento total de parallax, em px, ao longo da seção inteira. */
  parallax: number;
  /**
   * Janela de DISSOLUÇÃO deste plano, em fração de `dissolve`.
   *
   * É a contrapartida de `from`/`to`: o campo nasce escalonado, do distante
   * para o próximo, e desaparece escalonado na MESMA ordem. Não é simetria
   * decorativa — é o que faz a dissolução ler como profundidade se retirando
   * em vez de um interruptor.
   *
   * As três janelas se sobrepõem de propósito. Sem sobreposição haveria três
   * degraus visíveis; com ela, em qualquer instante há um plano saindo e outro
   * ainda inteiro, e o campo afina em vez de piscar.
   */
  some: { from: number; to: number };
};

/**
 * Os três planos de profundidade.
 *
 * Nascem escalonados, o distante primeiro (§9.3), dentro da janela de progresso
 * 0,26 a 0,66 — que contém os 0,30 a 0,60 que o plano pede, com folga para o
 * escalonamento caber sem que o último plano estoure o fim da seção.
 *
 * O parallax segue os fatores 0,25 / 0,5 / 0,85 do §9.3 sobre o teto de 60px de
 * deslocamento total. Como o valor é aplicado de −1 a +1 ao longo da seção, cada
 * número aqui é METADE do curso — 15px de fator dá 30px de ponta a ponta.
 */
export const PLANES: readonly Plane[] = [
  { id: 'far', from: 0.26, to: 0.52, parallax: 7.5, some: { from: 0.0, to: 0.55 } },
  { id: 'mid', from: 0.32, to: 0.6, parallax: 15, some: { from: 0.18, to: 0.78 } },
  { id: 'near', from: 0.38, to: 0.66, parallax: 25.5, some: { from: 0.4, to: 1.0 } },
];
