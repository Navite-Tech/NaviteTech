/**
 * Comprimento de rolagem de cada seção da jornada.
 *
 * ÚNICO lugar onde esses números existem. Calibrar o ritmo da experiência
 * (plano §21.7) é editar esta tabela — nenhum componente precisa mudar, porque
 * as alturas viram uma custom property e as fronteiras são medidas do DOM.
 */

export type JourneySection = {
  /** id do elemento `<section>`; também é a âncora do menu. */
  id: string;
  /** Índice 1-based para o contador `NN — 06`. */
  index: number;
  /** Nome curto exibido em brass no contador. */
  label: string;
  /**
   * Altura total de rolagem, em múltiplos de 100dvh.
   *
   * O curso útil é `(length - 1) * 100dvh`: uma tela é sempre consumida por
   * estar visível. É esse curso que as âncoras da coreografia fracionam.
   *
   * TODA seção precisa de `length > 1`. Com exatamente 1 o curso é zero, as
   * âncoras colapsam num ponto — e, na última seção, o estado final ficaria
   * ALÉM da rolagem máxima do documento, portanto inalcançável.
   */
  length: number;
};

/**
 * Prender a tela é `position: sticky`, não `ScrollTrigger.pin` — desvio
 * deliberado do §8.2 do plano, por três razões concretas:
 *
 *   1. `pin` injeta um `pin-spacer` em volta do elemento. As fronteiras que
 *      alimentam a coreografia são medidas do DOM, e passariam a depender de um
 *      nó que o ScrollTrigger cria e destrói em cada refresh.
 *   2. Com sticky, o ScrollTrigger apenas LÊ o progresso e nunca escreve no
 *      layout. Isso é o que sustenta a promessa de escritor único: existe
 *      exatamente um código escrevendo transform, e é a coreografia.
 *   3. Desligar no mobile (plano §12: nenhum pin abaixo de 900px) vira uma
 *      media query, em vez de um contexto de `matchMedia` no JS.
 *
 * O critério de aceite da Fase 11 muda junto: verificar que nenhuma seção está
 * sticky abaixo de 900px, em vez de contar pins em `ScrollTrigger.getAll()`.
 */
export const JOURNEY = [
  { id: 'hero', index: 1, label: 'Início', length: 1.3 },
  { id: 'problema', index: 2, label: 'Observar', length: 2.6 },
  { id: 'servicos', index: 3, label: 'Construir', length: 4.4 },
  /*
   * 2,4, e não os 3,8 da Fase 15.
   *
   * Aqueles 3,8 existiam para dar QUATRO janelas de leitura iguais, uma por
   * arte: `4 × 0,18 + 0,28` fechava em 1,00 e cada estado precisava de curso
   * próprio. A Fase 16 pôs as quatro artes simultâneas, e a sequência que
   * consumia o curso deixou de existir.
   *
   * O que resta a conduzir são quatro fases (lib/motion/estados.ts). Numa tela
   * de 941 o curso é 1317px: 184 de abertura com o campo cheio, 342 de
   * recomposição, 250 de entrada escalonada e 541 de REPOUSO — que é o tempo em
   * que as quatro peças ficam postas para serem lidas. Manter 3,8 não daria
   * mais leitura: daria 1300px de rolagem sobre uma composição parada.
   */
  { id: 'processo', index: 4, label: 'Método', length: 2.4 },
  /*
   * O FAQ é a única seção em FLUXO (§8.2: "altura natural, sem pin"), então
   * este número é um MÍNIMO, não a altura: com as seis perguntas fechadas a
   * seção mede 1176px numa tela de 941 e a folga é o curso que a coreografia
   * usa para levar a peça a opacidade 0; com todas abertas o conteúdo passa de
   * 1200 e a seção simplesmente cresce.
   */
  { id: 'faq', index: 5, label: 'Dúvidas', length: 1.25 },
  { id: 'contato', index: 6, label: 'Contato', length: 2.2 },
] as const satisfies readonly JourneySection[];

/** Identificador de seção da jornada, com os valores conhecidos em tempo de tipo. */
export type JourneyId = (typeof JOURNEY)[number]['id'];

/** Elemento que envolve a jornada inteira; é o gatilho da coreografia. */
export const JOURNEY_ID = 'journey';

/** Altura total, em telas. Útil para conferir o orçamento de ritmo. */
export const JOURNEY_LENGTH = JOURNEY.reduce((s, x) => s + x.length, 0);

/**
 * Atraso do `scrub`, em segundos. Não é suavização de scroll (isso seria o
 * Lenis, que só entra se a Fase 4b comprovar ganho): é o quanto a coreografia
 * demora para alcançar a posição de rolagem, o que tira a aspereza dos deltas
 * brutos de roda sem tirar o controle do usuário.
 */
export const SCRUB = 0.6;
