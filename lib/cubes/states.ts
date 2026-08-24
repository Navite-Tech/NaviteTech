import type { JourneyId } from '@/lib/scroll/triggers';

/**
 * A coreografia do CAMPO DE CUBOS — único lugar onde estes números existem.
 *
 * Espelha `lib/symbol/states.ts` de propósito. Depois da Fase 9 o campo é, como
 * o símbolo, um objeto que atravessa a página inteira: nasce no vão do
 * Problema, recua enquanto os cards de Serviços conduzem, e DISSOLVE no
 * Processo. Um objeto persistente pede uma trilha, não um gatilho por seção.
 *
 * O QUE ELE FAZ NO PROCESSO MUDOU NA FASE 15. Até a 14 as 168 unidades
 * convergiam para quatro retículas de 6×7, uma por etapa, e ficavam lá. A
 * seção lia como um stepper: quatro painéis com borda, quatro grelhas, uma
 * régua e quatro títulos, tudo ao mesmo tempo. Agora o campo desaparece para
 * dar lugar às quatro imagens — a complexidade bruta saindo para revelar
 * clareza — e desaparece por OPACIDADE, não por trajetória. Nenhuma unidade
 * viaja, nenhuma explode, nenhuma voa.
 *
 * Nada aqui tem referência visual: `flow-symbol-transition.mp4` cobre o
 * nascimento (§4.1) e o resto é proposto pelo §11. Os valores de nascimento e
 * parallax, porém, NÃO são novos — reproduzem exatamente o que a Fase 6 mediu e
 * o `check:problema` verifica, e é por isso que o trecho do Problema é linear.
 */

export type FieldState = {
  /**
   * Nascimento, 0..1. Cada plano deriva o seu com a janela própria de
   * `lib/content/cube-field.ts`, o que preserva o escalonamento medido —
   * o distante primeiro.
   */
  nasce: number;
  /**
   * Dissolução, 0..1. Cada PLANO deriva a sua com a janela própria de
   * `lib/content/cube-field.ts` — o distante sai primeiro, na mesma ordem em
   * que nasceu.
   *
   * Substituiu `agrupa`, que levava cada unidade à célula de uma retícula. A
   * diferença de custo é o assunto: `agrupa` era consumido por 168 elementos,
   * cada um reconstruindo destino e escala em `calc` a cada quadro; `dissolve`
   * é consumido por TRÊS camadas já promovidas por `translate3d`, onde
   * opacidade é trabalho de compositor e não repinta nada.
   */
  dissolve: number;
  /** Opacidade do campo inteiro, antes da dissolução. */
  fade: number;
  /** Parallax normalizado, −1..1. Multiplicado pelo fator de cada plano. */
  py: number;
};

export type FieldStateName = keyof typeof FIELD_STATES;

export const FIELD_STATES = {
  /** Antes do vão existir. Escala 0: o campo não ocupa pixel nenhum. */
  ausente: { nasce: 0, dissolve: 0, fade: 1, py: -1 },

  /** O enxame do §9.3, nascido e espalhado pelo vão entre as metades. */
  disperso: { nasce: 1, dissolve: 0, fade: 1, py: 1 },

  /**
   * Serviços. O campo não SOME — some seria recriar um segundo enxame no
   * Processo, e a narrativa depende de ser o mesmo. Ele recua: a pilha de
   * cards, opaca, já cobre a maior parte dele, e o que sobra à esquerda fica
   * como matéria de fundo em volta da peça.
   */
  recuado: { nasce: 1, dissolve: 0, fade: 0.4, py: 0 },

  /** De volta à presença plena, ainda disperso, no início do Processo. */
  retomado: { nasce: 1, dissolve: 0, fade: 1, py: 0 },

  /**
   * O campo saiu.
   *
   * `fade` continua 1 e quem zera a presença é `dissolve`: são dois canais
   * diferentes, e mantê-los separados é o que permite que Serviços recue o
   * campo (fade 0,4) sem que isso conte como dissolução, e que o Processo o
   * dissolva por completo a partir da presença plena.
   */
  dissolvido: { nasce: 1, dissolve: 1, fade: 1, py: 0 },

  /** FAQ em diante: a seção de desaceleração não tem campo, como não tem símbolo. */
  guardado: { nasce: 1, dissolve: 1, fade: 0, py: 0 },
} as const satisfies Record<string, FieldState>;

export type FieldKeyframe = {
  section: JourneyId;
  at: number;
  state: FieldStateName;
  ease?: 'none' | 'power2.inOut' | 'power2.out' | 'power3.inOut';
};

/**
 * A trilha do campo.
 *
 * O trecho do Problema é `none` — LINEAR — e isso é uma exigência, não um
 * gosto: `nasce` é o progresso da seção, e as janelas por plano
 * (`lib/content/cube-field.ts`) foram medidas contra esse progresso. Uma curva
 * aqui deslocaria o nascimento dos três planos e o `check:problema` mudaria de
 * resposta sem que nada visível tivesse sido decidido.
 *
 * No Processo há uma ESPERA antes da dissolução: `retomado` é ancorado duas
 * vezes, em 0,06 e em 0,14. O campo volta à presença plena, e então fica —
 * cheio, disperso, imóvel — enquanto o headline é lido. Sem essa espera a
 * dissolução começa no mesmo instante em que a seção assume, e o que o leitor
 * vê não é matéria saindo de cena: é uma seção que já entra apagando.
 *
 * Ela fecha em 0,40, que é exatamente onde `lib/motion/estados.ts` põe a
 * chegada das quatro peças (`METODO.recompoe`). Não é coincidência calibrada: é
 * a mesma fração escrita nos dois lugares porque as imagens não podem dividir a
 * própria chegada com o desaparecimento dos cubos.
 *
 * O NÚMERO MUDOU NA FASE 16 — era 0,28 — e a espera em 0,14 NÃO mudou. Isso é
 * deliberado: a seção encurtou de 3,8 para 2,4 telas, então 0,14 vale hoje
 * ~184px de rolagem em vez de ~392. A abertura com o campo cheio continua
 * durando um gesto de roda, que é o que ela precisa durar; o que ganhou curso
 * foi a DISSOLUÇÃO, que agora tem 0,26 do percurso em vez de 0,14 — porque ela
 * deixou de ser só o campo saindo e passou a ser a recomposição inteira
 * acontecendo junto: cubos, crescente e a travessia do bloco de texto.
 *
 * O `disperso` fecha em 0,72 do Problema, e não em 1,0, com uma ESPERA até o
 * fim da seção. O nascimento continua linear e continua sendo o progresso da
 * seção — o que mudou é a escala: as janelas por plano de
 * `lib/content/cube-field.ts` passam a cair em 0,72 do que caíam antes, todas
 * pelo mesmo fator, então a forma relativa e o escalonamento longe→perto ficam
 * intactos. O que se ganha é o último quarto da seção com o enxame POSTO e
 * imóvel, que é onde os callouts finalmente têm tempo de ser lidos. Ver a nota
 * longa em components/sections/problema.module.css.
 */
export const FIELD_TRACK: readonly FieldKeyframe[] = [
  { section: 'hero', at: 0.0, state: 'ausente' },
  { section: 'problema', at: 0.0, state: 'ausente', ease: 'none' },
  { section: 'problema', at: 0.72, state: 'disperso', ease: 'none' },
  { section: 'problema', at: 1.0, state: 'disperso', ease: 'none' },
  { section: 'servicos', at: 0.22, state: 'recuado', ease: 'power2.inOut' },
  { section: 'servicos', at: 1.0, state: 'recuado', ease: 'none' },
  { section: 'processo', at: 0.05, state: 'retomado', ease: 'power2.out' },
  { section: 'processo', at: 0.14, state: 'retomado', ease: 'none' },
  { section: 'processo', at: 0.4, state: 'dissolvido', ease: 'power2.inOut' },
  { section: 'processo', at: 1.0, state: 'dissolvido', ease: 'none' },
  { section: 'faq', at: 0.5, state: 'guardado', ease: 'none' },
  { section: 'contato', at: 1.0, state: 'guardado', ease: 'none' },
] as const;

/**
 * A trilha do campo sob `prefers-reduced-motion: reduce`.
 *
 * Uma âncora por seção, todas em `at: 0` — pelo mesmo motivo estrutural da
 * trilha reduzida do símbolo: sem seção presa, o curso de rolagem de cada uma é
 * próximo de zero e as frações internas colapsam no mesmo pixel.
 *
 * O defeito que isso corrige era grave e silencioso. Com a trilha de cima, as
 * âncoras do Processo caíam juntas, `resolveTrack` descartava as coincidentes
 * e sobrava a PRIMEIRA — `retomado`. O estado final era descartado, e a seção
 * do Método perdia a afirmação visual que ela faz, para quem pede movimento
 * reduzido.
 *
 * `retomado` não aparece aqui porque é um passo intermediário do desktop — o
 * campo voltando à presença plena antes de sair. Em estados discretos,
 * `recuado → dissolvido` é um degrau só.
 */
export const REDUCED_FIELD_TRACK: readonly FieldKeyframe[] = [
  { section: 'hero', at: 0, state: 'ausente' },
  { section: 'problema', at: 0, state: 'disperso' },
  { section: 'servicos', at: 0, state: 'recuado' },
  { section: 'processo', at: 0, state: 'dissolvido' },
  { section: 'faq', at: 0, state: 'guardado' },
  { section: 'contato', at: 0, state: 'guardado' },
] as const;

/**
 * Quanto o campo encolhe enquanto sai, em fração da escala do plano.
 *
 * É o ÚNICO movimento da dissolução, e é quase imperceptível de propósito: 2%
 * ao longo de todo o curso. Existe para o desaparecimento não parecer um
 * interruptor — sem nenhum movimento, opacidade indo a zero em três camadas lê
 * como um corte de energia. Com 2% de recuo, lê como matéria se afastando.
 *
 * Não custa escrita nova: multiplica o `--t` que o plano já recebe por quadro.
 */
export const ENCOLHE = 0.02;

/** Estado inicial, aplicado por CSS no servidor — antes de qualquer JS. */
export const FIELD_INITIAL = FIELD_STATES[FIELD_TRACK[0]?.state ?? 'ausente'];
