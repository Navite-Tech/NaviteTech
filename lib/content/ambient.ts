/**
 * O campo de ambientação — o "HUD editorial" do §3.5 do plano.
 *
 * ÚNICO lugar onde estas posições existem. Todas medidas em
 * `references/hero-reference.png` com `node tools/measure-hero.cjs`, nenhuma
 * estimada a olho.
 *
 * Unidades: `x` é % da largura da viewport, `y` é % da altura, e todo tamanho
 * horizontal é % da LARGURA. Medir numa referência de 1672px e transpor os px
 * direto seria errado por construção — o alvo de captura tem outra largura.
 *
 * ---
 *
 * O TOM É SAGE, NÃO BRASS. O §9.2 do plano pede "régua brass de 55px" e o §3.5
 * fala em "quadradinhos marcadores brass/sage". A medição decidiu: nas TRÊS
 * referências, todo elemento decorativo tem g > r, que é sage. No hero são 12
 * de 12 quadrados, com média #8c957c — o próprio token `--sage` (#8c947a) a
 * menos de 1 por canal. No frame do problema são 11 de 12. Régua brass não
 * existe em nenhuma das três.
 *
 * Brass continua sendo o acento institucional que o wordmark oficial estabelece
 * (`TECH` medido em #a49c7a) e que vale para cromo de interface — bordas,
 * indicadores de progresso, sublinhado de navegação. O campo de ambientação é
 * outra coisa, e é sage.
 */

/** Quadrado sólido solto no fundo. */
type Square = { kind: 'square'; x: number; y: number; size: number };
/** Régua fina horizontal terminada num quadrado à direita. */
type Rule = { kind: 'rule'; x: number; y: number; length: number; cap: number };
/** Tique vertical com um quadrado destacado abaixo, separado por um vão. */
type Tick = { kind: 'tick'; x: number; y: number; length: number; cap: number; gap: number };
/** Estrela de quatro pontas, muito tênue — o brilho especular do ambiente. */
type Sparkle = { kind: 'sparkle'; x: number; y: number; w: number; h: number };

export type AmbientMark = (Square | Rule | Tick | Sparkle) & {
  /**
   * `2` só aparece a partir de 900px. Mobile não é desktop reduzido (§12): o
   * campo rala em vez de encolher, senão vira sujeira sobre o texto.
   */
  tier?: 2;
};

/**
 * O campo do hero.
 *
 * Os quadrados de (15,8 / 47,1) e (41,2 / 52,3) que a varredura acusou NÃO
 * entram: caem dentro da faixa de tinta do headline em sage — são um pedaço de
 * letra e o ponto final de "melhor.", não marcadores.
 */
export const HERO_AMBIENT: readonly AmbientMark[] = [
  /*
   * A régua do canto SUPERIOR direito não está aqui de propósito: ela cai em
   * y 7,65%, dentro da faixa do header, e é o marcador técnico do próprio
   * header (components/chrome/Header.tsx). Duplicá-la aqui desenharia duas.
   */

  // tique vertical com quadrado destacado, à direita
  { kind: 'tick', x: 89.77, y: 19.66, length: 10.41, cap: 0.66, gap: 1.75, tier: 2 },

  /*
   * `tier: 2` some abaixo de 900px, por dois motivos que se somam:
   *
   *   • os de x entre 40% e 62% cairiam sobre a coluna de texto, que no mobile
   *     ocupa a largura inteira;
   *   • os demais são densidade de desktop — o §12 manda o campo RALAR no
   *     mobile, não encolher junto.
   *
   * Sobram dois elementos de borda. É pouco de propósito.
   */
  // quadrados soltos
  { kind: 'square', x: 49.88, y: 33.16, size: 0.42, tier: 2 },
  { kind: 'square', x: 86.57, y: 37.99, size: 0.6, tier: 2 },
  { kind: 'square', x: 47.19, y: 51.75, size: 0.42, tier: 2 },
  { kind: 'square', x: 87.71, y: 55.58, size: 0.6, tier: 2 },
  { kind: 'square', x: 84.15, y: 68.12, size: 0.9 },
  { kind: 'square', x: 44.02, y: 69.29, size: 0.9, tier: 2 },
  { kind: 'square', x: 51.82, y: 74.28, size: 0.54, tier: 2 },
  { kind: 'square', x: 48.53, y: 83.85, size: 0.6, tier: 2 },

  // estrelas de quatro pontas — pico medido +46 e +38 de luminância sobre o
  // fundo, braço de 2 a 3px que some em ~45px. São quase subliminares.
  { kind: 'sparkle', x: 47.61, y: 44.53, w: 5.4, h: 9.6, tier: 2 },
  { kind: 'sparkle', x: 86.12, y: 57.17, w: 6.0, h: 10.6, tier: 2 },

  // régua + terminal, canto inferior direito
  { kind: 'rule', x: 89.0, y: 91.07, length: 5.08, cap: 0.78 },
];
