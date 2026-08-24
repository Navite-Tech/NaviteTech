/**
 * Conteúdo e geometria das anotações da seção Problema.
 *
 * REFERENCIAL HÍBRIDO, e a mistura é deliberada:
 *
 *   x do rótulo      vw — coordenada de PÁGINA. Na referência os rótulos da
 *                    direita terminam em 94,7vw, exatamente onde o contador de
 *                    seção termina: eles pertencem à margem, não à peça.
 *   v (vertical)     coordenada do VÃO, como os cubos. Um callout aponta para o
 *                    enxame; se a altura dele fosse de página, mudar a
 *                    proporção da janela o descolaria do que ele anota.
 *   alvo da guia     u/v do vão, pelo mesmo motivo — e este é o que obriga a
 *                    mistura. Com o alvo em vw, a guia de "Ferramentas
 *                    desconectadas" era desenhada por cima da crescente
 *                    esquerda: ela mirava onde o enxame está NA REFERÊNCIA, não
 *                    onde ele está aqui.
 *
 * Tudo medido em `problem-section-reference.png` — caixas de texto com
 * `.shots/tmp/callouts.cjs`, linhas-guia com `.shots/tmp/guias.cjs` — e
 * convertido pelo referencial da medição: vão em x 750..1136, metades em
 * y 292..765.
 */

export type Callout = {
  /** O problema, como aparece na página e na lista acessível. */
  texto: string;
  /** Posição horizontal do marcador, em vw (coordenada de página). */
  x: number;
  /** Posição vertical do marcador, em coordenada do vão. */
  v: number;
  /** Para que lado o rótulo cresce a partir do marcador. */
  lado: 'esq' | 'dir';
  /**
   * A linha-guia. Sai do rótulo em `de` (vw de página), corre na horizontal na
   * altura `v` (vão) e termina em `ate` (u do vão). `dobra` acrescenta a perna
   * diagonal final, quando a referência tem uma.
   */
  guia: { v: number; de: number; ate: number; dobra?: { u: number; v: number } };
};

/**
 * Os quatro problemas.
 *
 * Existem como `<ul>` de verdade na página (§9.3): a camada de cubos é
 * decorativa e `aria-hidden`, mas isto aqui é conteúdo — e é a MESMA lista que
 * o mobile mostra em fluxo.
 */
export const CALLOUTS: readonly Callout[] = [
  {
    texto: 'Processos manuais.',
    x: 33.85,
    v: -1.288,
    lado: 'esq',
    guia: { v: -1.19, de: 46.5, ate: -1.24, dobra: { u: -1.067, v: -1.072 } },
  },
  {
    texto: 'Informações espalhadas.',
    x: 87.24,
    v: -0.543,
    lado: 'dir',
    guia: { v: -0.535, de: 86.4, ate: 1.42 },
  },
  {
    texto: 'Ferramentas desconectadas.',
    x: 29.95,
    v: 0.81,
    lado: 'esq',
    guia: { v: 0.907, de: 45.4, ate: -1.28 },
  },
  {
    texto: 'Trabalho repetitivo.',
    x: 86.3,
    v: 0.886,
    lado: 'dir',
    guia: { v: 0.89, de: 85.5, ate: 1.19 },
  },
];

/**
 * Retângulos de anotação técnica (§3.5, item 5; §9.3).
 *
 * Pontilhados, não tracejados — é o que a ampliação mostra. Coordenadas do VÃO,
 * porque cada um enquadra um punhado de cubos: se ficassem em vw, deixariam de
 * enquadrar coisa alguma assim que a proporção da janela mudasse.
 */
export type Blueprint = { u: number; v: number; w: number; h: number };

export const BLUEPRINTS: readonly Blueprint[] = [
  { u: -1.078, v: -1.127, w: 0.389, h: 0.267 },
  { u: -0.896, v: 0.598, w: 0.57, h: 0.401 },
];
