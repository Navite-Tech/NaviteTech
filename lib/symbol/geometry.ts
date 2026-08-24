// GERADO por tools/build-symbol.cjs — não editar à mão.
// Vetor canônico de implementação, traçado de references/logoNavite.png.
// Ver public/brand/README.md para procedência e fidelidade medida.

/** Lado do viewBox quadrado do símbolo. */
export const SYMBOL_VIEWBOX = 1000;

/** Centro de simetria, em unidades de viewBox. As duas metades são a MESMA
 *  crescente — a segunda é esta rotacionada 180° em torno deste ponto. */
export const SYMBOL_CENTER = 500;

/** Caixa da crescente esquerda dentro do viewBox. */
export const CRESCENT_BBOX = { x: 18.57, y: 2.41, w: 476.25, h: 917.1 } as const;

/** Contorno da crescente ESQUERDA. */
export const CRESCENT_PATH =
  'M 494.6 3.71 L 494.82 115.24 C 477.04 116.74 459.16 116.71 441.38 119.43 C 402.27 125.42 364.65 138.4 329.62 156.7 C 210.01 219.19 130.96 345.99 115.51 478.59 C 108.42 539.43 115.1 600.89 132.88 659.38 C 155.56 733.99 197.33 801.77 251.86 857.32 C 266.52 872.26 282.18 886.2 298.38 899.44 C 306.58 906.14 316.13 912.13 323.58 919.51 C 302.75 914.43 282.01 903.47 263.34 892.93 C 218.45 867.61 178.38 834.36 144.96 795.14 C 115.04 760.03 90.76 720.4 72.51 678.06 C 52.15 630.83 39.59 580.27 35.24 529.04 C 18.57 333.03 126.96 136.96 302.65 48.25 C 345.73 26.5 393.01 11.88 440.95 6.11 C 458.63 3.98 476.8 2.41 494.6 3.71 Z';

/**
 * Crescente DIREITA — a mesma forma rotacionada 180°, com a geometria já
 * assada nas coordenadas.
 *
 * Não troque isto por `transform="rotate(180 …)"`: o relevo sintético pinta
 * luz em coordenadas globais (gradiente vindo do topo-esquerdo, banda de
 * extrusão deslocada no sentido oposto). Rotacionar o elemento giraria a
 * iluminação junto, e a metade direita ficaria acesa por baixo.
 */
export const CRESCENT_PATH_ROTATED =
  'M 505.4 996.29 L 505.18 884.76 C 522.96 883.26 540.84 883.29 558.62 880.57 C 597.73 874.58 635.35 861.6 670.38 843.3 C 789.99 780.81 869.04 654.01 884.49 521.41 C 891.58 460.57 884.9 399.11 867.12 340.62 C 844.44 266.01 802.67 198.23 748.14 142.68 C 733.48 127.74 717.82 113.8 701.62 100.56 C 693.42 93.86 683.87 87.87 676.42 80.49 C 697.25 85.57 717.99 96.53 736.66 107.07 C 781.55 132.39 821.62 165.64 855.04 204.86 C 884.96 239.97 909.24 279.6 927.49 321.94 C 947.85 369.17 960.41 419.73 964.76 470.96 C 981.43 666.97 873.04 863.04 697.35 951.75 C 654.27 973.5 606.99 988.12 559.05 993.89 C 541.37 996.02 523.2 997.59 505.4 996.29 Z';
