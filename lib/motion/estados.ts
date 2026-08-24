/**
 * O ritmo do Método — ÚNICO lugar onde estes números existem.
 *
 * A FASE 16 TROCOU O QUE ESTE ARQUIVO DESCREVE, e a troca é a notícia.
 *
 * Até a 15 aqui moravam quatro ESTADOS sequenciais: `de` 0,28, `passo` 0,18,
 * `troca` 0,05 e `apagado` 0,45 — uma imagem por vez, 01 assumindo em 0,28 e 04
 * fechando exatamente em 1,00, mais a opacidade dos numerais que não eram o da
 * vez. Aquilo pedia quatro janelas de leitura IGUAIS, e era por isso que a
 * seção precisava de 3,8 telas de rolagem.
 *
 * A sequência saiu. O Método agora é uma composição EDITORIAL: as quatro artes
 * convivem, e o que a rolagem conduz é a RECOMPOSIÇÃO que leva a elas. O ritmo,
 * então, deixou de ser "quatro janelas" e passou a ser quatro fases:
 *
 *   0,00 → 0,14   campo de cubos cheio; headline e lead encostados na esquerda
 *   0,14 → 0,40   os cubos dissolvem, a crescente sai, o texto migra ao centro
 *   0,40 → 0,59   as quatro peças entram, escalonadas
 *   0,59 → 1,00   repouso: as quatro permanecem, nada se move
 *
 * `0,40` é escrito aqui e em `lib/cubes/states.ts` — a mesma fração nos dois
 * lugares, pelo mesmo motivo de sempre: as peças não podem dividir a própria
 * chegada com o desaparecimento dos cubos. E é por isso que `pecaDe` não é uma
 * constante independente de `recompoe`: ele É `recompoe`, escrito uma vez.
 */

/**
 * Os inversos são PRÉ-COMPUTADOS aqui, e não em `calc`.
 *
 * Mesma convenção que `--e-troca-inv` estabeleceu na Fase 15: o CSS multiplica,
 * nunca divide. Divisão por expressão em `calc` funciona nos navegadores atuais,
 * mas mantê-la fora da folha é o que garante que o número exista uma vez só — em
 * TypeScript, onde ele pode ser lido por um teste.
 */
const inverso = (x: number) => Number((1 / x).toFixed(4));

export const METODO = {
  /**
   * Fração do curso em que a recomposição COMEÇA.
   *
   * A espera existe e é deliberada (§1 do briefing): não se pode pôr a headline
   * centralizada sobre o campo cheio de cubos. Nestes 0,14 — cerca de 184px de
   * rolagem numa tela de 941 — o leitor vê a matéria bruta e lê o título na
   * pose de entrada, à esquerda, antes de qualquer coisa se mover.
   */
  espera: 0.14,

  /**
   * Fração do curso em que a recomposição TERMINA.
   *
   * Aqui os cubos já dissolveram, a crescente já apagou e o texto já está
   * centralizado. O espaço está visualmente limpo, que é a condição que o §1
   * põe para as quatro artes entrarem.
   */
  recompoe: 0.4,

  /**
   * Deslocamento entre a entrada de uma peça e a da seguinte.
   *
   * Curto de propósito: 0,03 do curso são ~40px de rolagem, o que põe as quatro
   * dentro de um gesto de roda. É um stagger de REVELAÇÃO — a ordem 01 → 04 se
   * percebe uma vez e nunca mais —, não uma sequência a ser navegada.
   */
  pecaPasso: 0.03,

  /** Fração do curso que a entrada de UMA peça consome. */
  pecaDur: 0.1,
} as const;

/** Fração em que a primeira peça começa a entrar. É o fim da recomposição. */
export const PECA_DE = METODO.recompoe;

/** Fração em que a última peça termina de entrar: 0,40 + 3×0,03 + 0,10 = 0,59. */
export const PECA_ATE = PECA_DE + 3 * METODO.pecaPasso + METODO.pecaDur;

/**
 * As propriedades que a página publica no `.processo`.
 *
 * Num objeto só porque DOIS irmãos as consomem — o bloco de texto, que deriva a
 * migração de `--m-de`/`--m-inv`, e a linha de peças, que deriva a entrada de
 * `--p-de`/`--p-passo`/`--p-dur-inv`. Publicadas no pai comum, as duas derivam
 * do mesmo número sem que ele exista duas vezes.
 */
export const METODO_VARS = {
  '--m-de': METODO.espera,
  '--m-inv': inverso(METODO.recompoe - METODO.espera),
  '--p-de': PECA_DE,
  '--p-passo': METODO.pecaPasso,
  '--p-dur-inv': inverso(METODO.pecaDur),
} as const;
