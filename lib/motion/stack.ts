/**
 * O ritmo da pilha de cards de Serviços — ÚNICO lugar onde estes números
 * existem. Nenhum deles aparece em componente ou em CSS: o componente os injeta
 * como propriedades customizadas e o CSS deriva a posição de cada card a partir
 * de `--reveal`.
 *
 * Tudo é fração do curso da seção, não pixel nem segundo, para que calibrar o
 * ritmo em `lib/scroll/triggers.ts` (plano §21.7) estique a passagem inteira
 * sem deslocar nada dentro dela.
 *
 * ---
 *
 * `assentado` é 0,30 porque é AÍ que o símbolo para.
 *
 * A trilha do símbolo (lib/symbol/states.ts) leva `servicesHandoff` até
 * `servicesLeft` entre 0,0 e 0,3 do curso desta seção, e daí até 1,0 os dois
 * extremos do trecho são o mesmo estado — a espera. O critério de aceite da
 * Fase 7 é que a metade esquerda não se mova um pixel enquanto os cards passam;
 * fazer a passagem começar exatamente onde a espera começa é o que torna isso
 * verdade por construção, e não por sorte de calibragem.
 *
 * `entrada` é a chegada do card 01, e ela é HORIZONTAL enquanto as outras três
 * são verticais. Não é inconsistência: são dois momentos diferentes, cada um
 * com sua referência. O §4.2 (higgsfield, t=2,5s) mostra a metade direita
 * saindo para a direita e o card 01 entrando pela direita logo atrás — é a
 * composição se formando. O §10.2 descreve a PILHA, onde cada card sobe por
 * baixo e cobre o anterior. O card 01 faz as duas coisas em momentos distintos:
 * chega com a seção, e depois é coberto pelo 02.
 */
export const STACK = {
  /** Fração do curso em que o card 01 está assentado. */
  assentado: 0.3,
  /** Fração do curso consumida por cada troca de card. */
  passo: 0.22,
  /** Fração do curso da entrada lateral do card 01. */
  entrada: 0.14,
  /**
   * Quanto do PRÓXIMO card fica visível em repouso (§10.2: "o próximo espia
   * 12%"). Ver a nota de geometria em components/services/services.module.css:
   * com 12% a faixa espiada cai logo ABAIXO da borda inferior do card atual, o
   * que reconcilia o §10.2 com a referência, onde o card da vez aparece
   * inteiro.
   */
  espia: 0.12,
  /** O card que sai: recuo, escala e opacidade (§10.2). */
  saida: {
    /** Fração da própria altura, para cima. */
    y: -0.06,
    escala: 0.965,
    opacidade: 0.45,
  },
} as const;

/** Fração do curso em que o card `i` fica assentado. */
export const assentadoEm = (i: number) => STACK.assentado + i * STACK.passo;

/** Fim da passagem: o último card assentado. Depois disto a seção só assenta. */
export const FIM_DA_PASSAGEM = (n: number) => assentadoEm(n - 1);
