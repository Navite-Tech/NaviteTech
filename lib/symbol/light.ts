import { CRESCENT_BBOX, SYMBOL_VIEWBOX } from './geometry';

/**
 * Luz e ponto de vista do símbolo — fonte única para o gradiente da face, a
 * banda de extrusão e o highlight de aresta.
 *
 * Tudo MEDIDO em references/hero-reference.png, não escolhido. Ver
 * tools/fit-light-ramp.cjs e tools/compare-relief.cjs.
 *
 * Duas correções em relação à primeira versão, ambas achadas por medição:
 *
 *   1. O componente horizontal estava invertido. A referência clareia para a
 *      direita (nas DUAS metades: desvio médio 11,0 na mesma orientação contra
 *      24,0 espelhado, ou seja a luz é global e não gira com a peça), e a
 *      reconstrução escurecia. Passou despercebido porque a ferramenta de
 *      aceite só media o perfil vertical.
 *
 *   2. A extrusão não é o oposto da luz. Eram tratadas como o mesmo vetor; são
 *      independentes. A luz é de onde vem a iluminação; a extrusão é paralaxe
 *      entre a face da frente e a de trás, que depende do ponto de vista.
 */

/**
 * Vetor unitário apontando para a fonte de luz.
 *
 * Obtido por mínimos quadrados: ajuste do plano L = c0 + c1·x + c2·y sobre os
 * 35.263 pixels de material da referência, descartando 5px de borda (onde moram
 * a parede de extrusão e o highlight, que não pertencem à rampa da face).
 * Resultado ∇L = (+0,1341, −0,0193) por pixel — luz quase lateral, 8,2° acima da
 * horizontal.
 *
 * Perfis por faixa sugeriam algo bem mais vertical (~40°), mas eles pesam pela
 * quantidade de material em cada faixa: no topo o arco está à direita e embaixo
 * à esquerda, então o gradiente HORIZONTAL aparece disfarçado de vertical. O
 * ajuste de plano não tem esse viés.
 */
export const LIGHT_DIR = { x: 0.99, y: -0.14 } as const;

/**
 * Deslocamento da parede de extrusão, em unidades de viewBox.
 *
 * Medido pela largura da banda escura na referência: ~9px na horizontal e ~6px
 * na vertical numa crescente de 277×516px, o que dá 16,2 e 10,8 unidades. Vai
 * para baixo e para a esquerda: olhamos a peça ligeiramente de cima e da
 * direita, então a face de trás aparece embaixo e à esquerda.
 */
export const EXTRUDE_OFFSET = { x: -16.2, y: 10.8 } as const;

/**
 * Em quantos passos a parede de extrusão é varrida.
 *
 * Uma única cópia deslocada NÃO é uma parede: onde o arco é mais fino que o
 * deslocamento — ou seja, na ponta — a cópia se descola da face e a cúspide
 * aparece bifurcada, com um segundo espeto ao lado. A ponta afilada é um dos
 * dois terminais que definem a crescente (o outro é o corte reto), então
 * bifurcá-la descaracteriza a marca.
 *
 * Varrer em N cópias intermediárias resolve sem filtro e sem cálculo de união
 * de polígonos. O passo precisa ficar abaixo de um pixel no maior tamanho que a
 * coreografia usa (~1000px de lado): |offset| ≈ 19,5 unidades / 16 ≈ 1,2.
 *
 * As cópias são `<use>` do mesmo contorno, então o custo em bytes é zero e o de
 * rasterização só aparece quando a escala muda — não a cada quadro, porque o
 * scroll anima `transform` numa camada já composta.
 */
export const EXTRUDE_STEPS = 16;

/**
 * Caixa da crescente INCLUINDO a banda de extrusão — é o que de fato aparece na
 * tela, e é por ela que a peça deve ser alinhada e escalada.
 *
 * A caixa medida no hero-reference.png (277×516) também inclui a extrusão: o
 * pixel mais à esquerda do arco é parede lateral, não face. Calibrar pela caixa
 * da face sozinha desloca tudo e corta a banda fora do recorte.
 */
export const CRESCENT_RELIEF_BBOX = {
  x: CRESCENT_BBOX.x + Math.min(0, EXTRUDE_OFFSET.x),
  y: CRESCENT_BBOX.y + Math.min(0, EXTRUDE_OFFSET.y),
  w: CRESCENT_BBOX.w + Math.abs(EXTRUDE_OFFSET.x),
  h: CRESCENT_BBOX.h + Math.abs(EXTRUDE_OFFSET.y),
} as const;

/**
 * Meia-extensão do eixo do gradiente: a maior projeção da caixa do relevo de UMA
 * metade sobre a direção da luz. Garante que a rampa inteira caiba na peça, com
 * as paradas 0 e 1 nos cantos da caixa.
 */
const LIGHT_HALF_SPAN =
  (Math.abs(LIGHT_DIR.x) * CRESCENT_RELIEF_BBOX.w +
    Math.abs(LIGHT_DIR.y) * CRESCENT_RELIEF_BBOX.h) /
  2;

/**
 * Eixo do gradiente de uma metade: da parada 0 (lado iluminado) à parada 1
 * (lado na sombra), em coordenadas do viewBox global.
 *
 * A DIREÇÃO é global — as duas metades são iluminadas do mesmo lado, como um
 * objeto só. É por isso que a metade direita usa um contorno pré-rotacionado em
 * vez de `rotate(180)`: rotacionar o elemento giraria a luz junto com ele.
 *
 * Mas a ANCORAGEM é por metade, e isso importa por duas razões medidas:
 *
 *   1. Na referência cada crescente percorre sozinha ~68 níveis de luminância.
 *      Um eixo único cobrindo as duas daria meia rampa para cada uma: a
 *      esquerda modelada e a direita quase chapada.
 *
 *   2. Sob luz distante, transladar um objeto não muda o sombreamento dele. Com
 *      eixo global em userSpace, a metade mudaria de brilho ao atravessar a
 *      tela durante o scroll — pareceria defeito. Ancorada na própria caixa, a
 *      pintura viaja junto com a peça.
 */
export function lightAxisFor(side: 'left' | 'right') {
  const b = CRESCENT_RELIEF_BBOX;
  // A metade direita é a esquerda rotacionada 180° em torno do centro do viewBox.
  const cx = side === 'left' ? b.x + b.w / 2 : SYMBOL_VIEWBOX - (b.x + b.w / 2);
  const cy = side === 'left' ? b.y + b.h / 2 : SYMBOL_VIEWBOX - (b.y + b.h / 2);
  return {
    x1: cx + LIGHT_DIR.x * LIGHT_HALF_SPAN,
    y1: cy + LIGHT_DIR.y * LIGHT_HALF_SPAN,
    x2: cx - LIGHT_DIR.x * LIGHT_HALF_SPAN,
    y2: cy - LIGHT_DIR.y * LIGHT_HALF_SPAN,
  };
}
