/**
 * Os quatro serviços — ÚNICO lugar onde este texto existe (plano §16).
 *
 * O conteúdo é o do §10.4 do plano. A estrutura do título é uma lista de
 * LINHAS, e cada linha é uma lista de trechos, porque a referência quebra o
 * título em linhas fixas e destaca uma delas inteira:
 *
 *   Web &
 *   Experiências     ← sage
 *   Digitais
 *
 * Quebrar em `<br>` dentro de uma string não daria conta do destaque parcial de
 * "IA aplicada", onde só a primeira palavra é acento. Com trechos, o texto
 * acessível continua sendo uma frase só — quem monta é o componente, e ele
 * insere os espaços explicitamente (ver a nota sobre JSX em ServiceCard.tsx).
 */

export type Trecho = {
  texto: string;
  /** Acento editorial (sage). Ver a regra dos acentos em styles/tokens.css. */
  acento?: boolean;
};

/**
 * A polaridade da ARTE do card, não do card.
 *
 * As quatro origens foram escolhidas por direção de arte e não compartilham
 * luminância: 01 e 02 nascem sobre campo claro, 03 e 04 sobre preto. A Fase 14
 * resolvia isso recolorindo as quatro para a mesma paleta — e foi exatamente aí
 * que elas perderam o impacto. Agora a imagem fica como é e quem se adapta é a
 * TINTA: título e numeral em navy sobre as claras, em bone sobre as escuras.
 *
 * Vale só para a faixa de cima, que é a que pousa direto sobre a arte crua. A
 * faixa de baixo tem véu próprio e é bone nas quatro — ver services.module.css.
 */
export type Polaridade = 'clara' | 'escura';

export type Service = {
  id: string;
  /** `01`..`04`, como aparece na referência. */
  numero: string;
  titulo: readonly (readonly Trecho[])[];
  descricao: string;
  /**
   * Pills claras sobre a arte, na faixa de baixo — o tratamento da referência
   * Wonder, adaptado ao sistema (bone, texto navy, `--radius-pill`).
   *
   * Até a Fase 14 isto era uma lista vertical em brass, e o tipo dizia "nunca
   * pills nesta entrega". A regra foi revogada: com a imagem virando a
   * superfície do card, uma lista de texto solto sobre fotografia lê como
   * legenda perdida, e a pill é o que devolve a ela a qualidade de objeto.
   */
  capacidades: readonly string[];
  polaridade: Polaridade;
  /**
   * `object-position` da arte dentro do card.
   *
   * O crop 3:4 é assado em tools/build-service-art.cjs, mas o card mede de 0,73
   * a 0,81 conforme o viewport — então sempre sobra um pouco de imagem em um
   * dos eixos, e QUAL borda é sacrificada é decisão de composição, não de
   * default. Fica aqui, e não no CSS, porque é conteúdo da arte.
   */
  enquadramento: string;
};

export const SERVICES: readonly Service[] = [
  {
    id: 'web',
    numero: '01',
    titulo: [
      [{ texto: 'Web &' }],
      [{ texto: 'Experiências', acento: true }],
      [{ texto: 'Digitais' }],
    ],
    descricao:
      'Experiências digitais pensadas para comunicar valor, criar percepção e funcionar com precisão.',
    capacidades: ['Sites', 'Landing Pages', 'E-commerce', 'Experiências Interativas'],
    polaridade: 'clara',
    /* o vidro entra pela direita; quando sobra altura, é o rodapé que cede */
    enquadramento: '50% 44%',
  },
  {
    id: 'software',
    numero: '02',
    titulo: [
      [{ texto: 'Software &' }],
      [{ texto: 'Produtos', acento: true }],
      [{ texto: 'Digitais' }],
    ],
    descricao:
      'Plataformas construídas sobre a operação que existe — e preparadas para a que vem depois.',
    capacidades: ['Plataformas', 'Sistemas', 'Dashboards', 'Portais'],
    polaridade: 'clara',
    enquadramento: '50% 50%',
  },
  {
    id: 'automacao',
    numero: '03',
    titulo: [[{ texto: 'Automação', acento: true }], [{ texto: '& Integrações' }]],
    descricao:
      'O trabalho repetitivo vira processo, e os sistemas que não se falavam passam a conversar.',
    capacidades: ['Automações', 'Integrações', 'APIs', 'Workflows', 'Dados'],
    polaridade: 'escura',
    /* o agrupamento de seixos assenta abaixo do meio */
    enquadramento: '50% 54%',
  },
  {
    id: 'ia',
    numero: '04',
    titulo: [[{ texto: 'IA', acento: true }, { texto: 'aplicada ao' }], [{ texto: 'negócio' }]],
    descricao: 'Modelos e agentes ligados ao processo real: menos demonstração, mais decisão.',
    capacidades: [
      'IA generativa',
      'Assistentes',
      'Agentes',
      'Processamento de dados',
      'Integrações inteligentes',
    ],
    polaridade: 'escura',
    enquadramento: '50% 50%',
  },
] as const;
