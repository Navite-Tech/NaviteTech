import type { FaqItem } from '@/lib/content/faq';
import type { RotaPublica } from '@/lib/seo/rotas';

export type PaginaServico = {
  path: Exclude<RotaPublica, '/'>;
  serviceId: 'web' | 'software' | 'automacao' | 'ia';
  navLabel: string;
  title: string;
  description: string;
  schemaName: string;
  h1: [string, string];
  lead: string;
  eyebrow: string;
  problema: { titulo: [string, string]; corpo: readonly string[] };
  oferece: { titulo: [string, string]; intro: string; itens: readonly string[] };
  criterio: { titulo: [string, string]; vale: readonly string[]; naoVale: readonly string[] };
  metodo: string;
  extra?: { titulo: [string, string]; corpo: readonly string[] };
  geo?: string;
  faq: readonly FaqItem[];
};

/** Origem verdadeira — rodapé e `/desenvolvimento-de-software`. Sem endereço. */
export const ORIGEM_GEO =
  'A Navite Tech opera a partir de Campinas e da Região Metropolitana. O trabalho não se limita à cidade: o que importa é o problema, não o CEP.';

export const PAGINAS_SERVICO: readonly PaginaServico[] = [
  {
    path: '/desenvolvimento-de-software',
    serviceId: 'software',
    navLabel: 'Software',
    title: 'Software sob medida',
    description:
      'Sistemas e plataformas construídos a partir da operação que existe — não de um template. Conte o problema.',
    schemaName: 'Desenvolvimento de software sob medida',
    h1: ['Software para a operação', 'que não cabe em ferramenta pronta.'],
    lead: 'Plataformas, sistemas, dashboards e portais desenhados sobre o processo real da empresa — e preparados para o que vem depois.',
    eyebrow: 'Software e produtos digitais',
    problema: {
      titulo: ['Antes do sistema,', 'o que está travando.'],
      corpo: [
        'Planilha que virou operação. Sistema que não conversa com o outro. Relatório que alguém monta à mão porque a ferramenta de prateleira não cobre o jeito como o trabalho acontece.',
        'Desenvolvimento de software sob medida começa aí: no processo que já existe, não na stack da moda. O sistema é a consequência.',
      ],
    },
    oferece: {
      titulo: ['O que', 'construímos.'],
      intro:
        'Software sob medida para a empresa — plataformas, sistemas internos, dashboards e portais. O nome muda; o critério não: tem de servir a operação, não o contrário.',
      itens: [
        'Sistemas e plataformas que a operação não encontra prontos',
        'Dashboards e portais sobre dados e fluxos que já existem',
        'Integração com o que não pode ser substituído de uma vez',
        'Evolução depois da entrega — medir, ajustar, continuar',
      ],
    },
    criterio: {
      titulo: ['Quando faz sentido.', 'Quando não faz.'],
      vale: [
        'O processo é específico o bastante para um SaaS genérico sobrar ou faltar',
        'Dois ou mais sistemas precisam conversar sem alguém no meio',
        'O que diferencia o negócio está no fluxo, não no que o mercado já vende',
      ],
      naoVale: [
        'A necessidade já está bem resolvida por uma ferramenta de mercado',
        'O processo ainda não está claro nem no papel',
        'O pedido é um software “completo” sem o problema ter sido entendido',
      ],
    },
    metodo:
      'O caminho é o mesmo da Navite: entender a operação, definir o que entra e o que fica de fora, construir, e evoluir com o uso. O prazo só existe depois do escopo — um número solto antes disso seria chute.',
    geo: ORIGEM_GEO,
    faq: [
      {
        id: 'sob-medida',
        pergunta: 'O que é software sob medida na prática?',
        resposta: [
          'Um sistema construído para o processo desta empresa, não uma adaptação de produto de prateleira. A operação define o software. Quando um SaaS já cobre o que precisa, o caminho honesto é não construir.',
        ],
      },
      {
        id: 'sistema-ou-software',
        pergunta: 'Sistema, plataforma ou software house — o que vocês fazem?',
        resposta: [
          'As três palavras descrevem o mesmo trabalho daqui: desenvolvimento de sistemas e produtos digitais sob medida. O rótulo que chega no primeiro contato importa menos do que o que está travando na operação.',
        ],
      },
      {
        id: 'sem-time',
        pergunta: 'Atendem empresa sem time técnico?',
        resposta: [
          'Sim, e é o caso mais comum. Assumimos as decisões técnicas e devolvemos em linguagem de negócio: o que foi construído, por que, e o que custa manter.',
        ],
      },
    ],
  },
  {
    path: '/criacao-de-sites',
    serviceId: 'web',
    navLabel: 'Sites',
    title: 'Sites e experiências digitais',
    description:
      'Sites e experiências digitais pensados para comunicar valor, criar percepção e funcionar com precisão. Conte o problema.',
    schemaName: 'Desenvolvimento de sites e experiências digitais',
    h1: ['Presença digital que comunica valor', 'e funciona com precisão.'],
    lead: 'Sites, landing pages, e-commerce e experiências interativas — não um template com a logo no topo.',
    eyebrow: 'Web e experiências digitais',
    problema: {
      titulo: ['Um site que só existe', 'não é presença.'],
      corpo: [
        'Tem empresa com site no ar que não explica o que faz, não carrega, e não leva ninguém a uma conversa. Desenvolvimento de site profissional para empresa começa pelo que a presença precisa fazer — não pela quantidade de páginas.',
        'Comunicar valor. Sustentar confiança. Funcionar com a mesma precisão que se espera do restante da operação.',
      ],
    },
    oferece: {
      titulo: ['O que', 'entra.'],
      intro:
        'Web sob medida: do institucional ao interativo. O recorte depende do problema, não de um pacote.',
      itens: [
        'Sites institucionais com narrativa e estrutura próprias',
        'Landing pages para uma oferta, um produto, uma conversa',
        'E-commerce quando a venda é o processo — não um plugin genérico',
        'Experiências interativas quando a página precisa ser mais do que texto',
      ],
    },
    criterio: {
      titulo: ['Para quem é.', 'Para quem não é.'],
      vale: [
        'A presença digital precisa representar a empresa com o mesmo rigor do resto do trabalho',
        'Há o que integrar: formulário, sistema, catálogo, operação',
        'O site é parte do produto, não um cartão de visita descartável',
      ],
      naoVale: [
        'O pedido é o site mais barato no menor prazo, sem conteúdo nem objetivo',
        'Um construtor pronto já resolve o que a empresa precisa agora',
      ],
    },
    metodo:
      'Mesmo método: entender, definir, construir, evoluir. Prazo e escopo entram na proposta depois de olhar o que a presença precisa fazer — não antes.',
    faq: [
      {
        id: 'profissional',
        pergunta: 'O que diferencia um site profissional de um modelo pronto?',
        resposta: [
          'Estrutura, conteúdo e comportamento desenhados para esta empresa. Um modelo resolve presença rápida. Um site profissional resolve comunicação, precisão e o que acontece depois do clique.',
        ],
      },
      {
        id: 'prazo',
        pergunta: 'Quanto tempo leva?',
        resposta: [
          'Depende do escopo. O prazo entra na proposta dividido em etapas, com o que fica pronto em cada uma. Um número solto antes de olhar o material e o objetivo seria chute.',
        ],
      },
    ],
  },
  {
    path: '/automacao-e-integracoes',
    serviceId: 'automacao',
    navLabel: 'Automação',
    title: 'Automação e integrações',
    description:
      'O trabalho repetitivo vira processo, e os sistemas que não se falavam passam a conversar. Conte o problema.',
    schemaName: 'Automação de processos e integração de sistemas',
    h1: ['O trabalho repetitivo vira processo.', 'Os sistemas passam a conversar.'],
    lead: 'Automações, integrações, APIs, workflows e dados — sempre sobre o processo que já existe.',
    eyebrow: 'Automação e integrações',
    problema: {
      titulo: ['Retrabalho não é', 'falta de gente.'],
      corpo: [
        'Formulário que alguém redigita no sistema de gestão. Aprovação que só anda se uma pessoa empurrar. Relatório que passa por planilha porque os sistemas não se falam.',
        'Automação de processos e integração de sistemas tratam isso: tirar o trabalho repetitivo do caminho e fazer o que já existe conversar. Automatizar um processo confuso só o deixa confuso e mais rápido.',
      ],
    },
    oferece: {
      titulo: ['O que', 'entra.'],
      intro:
        'O recorte é o fluxo, não a ferramenta. API, workflow ou integração — o nome vem depois de entender o que trava.',
      itens: [
        'Automações sobre rotinas que hoje dependem de alguém lembrar',
        'Integrações entre sistemas que operam isolados',
        'APIs e contratos para o que precisa entrar e sair com previsibilidade',
        'Workflows e dados no lugar da planilha intermediária',
      ],
    },
    criterio: {
      titulo: ['Quando vale.', 'Quando não vale.'],
      vale: [
        'Há um processo visível, repetido, e alguém paga o custo de fazê-lo à mão',
        'Dois sistemas já existem e o gap entre eles é trabalho humano',
      ],
      naoVale: [
        'O processo ainda não está combinado — primeiro vale esclarecer, depois automatizar',
        'A expectativa é “inteligência” no lugar de um fluxo que nem foi mapeado',
      ],
    },
    metodo:
      'Começa pelo fluxo como ele é. Só então entra o que conectar, o que automatizar e o que deixar quieto. A etapa 04 do método — medir e ajustar — vale mais aqui do que em qualquer outro recorte: automação que ninguém observa vira caixa-preta.',
    extra: {
      titulo: ['Quando entra', 'inteligência artificial.'],
      corpo: [
        'Há fluxos em que a regra fixa não chega. Triagem, leitura de documento, decisão com contexto. Isso é outro recorte — IA ligada ao processo, não automação com outro nome.',
      ],
    },
    faq: [
      {
        id: 'o-que-e',
        pergunta: 'O que entra em automação?',
        resposta: [
          'Tirar o trabalho repetitivo do caminho e fazer sistemas isolados conversarem. Na prática: um formulário que alimenta o sistema de gestão sozinho, uma aprovação que anda sem alguém empurrar, dados que chegam ao relatório sem passar por planilha.',
        ],
      },
      {
        id: 'ia',
        pergunta: 'Automação e IA são a mesma coisa?',
        resposta: [
          'Não. Automação executa um fluxo combinado. IA entra quando o passo pede interpretação ou decisão com contexto. Se o seu caso é o segundo, o caminho é o de inteligência artificial aplicada — não um script com outro nome.',
        ],
      },
    ],
  },
  {
    path: '/inteligencia-artificial',
    serviceId: 'ia',
    navLabel: 'Inteligência artificial',
    title: 'IA aplicada ao negócio',
    description:
      'Modelos e agentes ligados ao processo real: menos demonstração, mais decisão. Conte o problema.',
    schemaName: 'Inteligência artificial aplicada ao negócio',
    h1: ['Modelos e agentes', 'ligados ao processo real.'],
    lead: 'IA generativa, assistentes e agentes — sempre sobre algo que hoje consome o tempo de alguém. Menos demonstração, mais decisão.',
    eyebrow: 'IA aplicada ao negócio',
    problema: {
      titulo: ['IA que não entra', 'na operação não opera.'],
      corpo: [
        'Chat genérico, piloto que não chega em produção, ferramenta que a equipe abandona porque não conhece o processo. Inteligência artificial para a empresa só vale quando está ligada ao trabalho que já existe.',
        'O critério é o mesmo do restante: precisa resolver algo que hoje consome o tempo de alguém.',
      ],
    },
    oferece: {
      titulo: ['O que', 'construímos.'],
      intro:
        'Não vendemos capacidade de modelo. Ligamos modelo, dado e sistema ao fluxo em que a decisão acontece.',
      itens: [
        'Assistentes sobre a base de conhecimento da empresa',
        'Agentes que consultam sistemas, registram e encaminham — com limite',
        'Processamento de dados e documentos que hoje alguém lê um a um',
        'Integrações inteligentes no ponto em que a regra fixa não chega',
      ],
    },
    extra: {
      titulo: ['Agentes de IA', 'em produção.'],
      corpo: [
        'Um agente, aqui, não é um chatbot com personalidade. É um sistema que percebe um evento, usa ferramentas (consulta, registro, disparo) e age dentro de um limite combinado.',
        'Isso pede integração com os sistemas da operação, acesso a bases de conhecimento com fonte, workflows com dono, e guardrails: o que o agente pode fazer sozinho, o que exige alguém, o que nunca faz. Sem isso, o que existe é demonstração.',
        'Desenvolvimento de agentes de IA para empresas e operações começa pelo processo — triagem, consulta, registro — não pelo framework. A página própria existe quando esse recorte tiver profundidade própria; até lá, ele mora aqui, no mesmo critério.',
      ],
    },
    criterio: {
      titulo: ['Quando faz sentido.', 'Quando não faz.'],
      vale: [
        'Há um processo com volume, contexto e um resultado mensurável',
        'Os dados e sistemas que o agente precisaria já existem, mesmo que bagunçados',
        'Alguém na operação vai ser dono do que entrar em produção',
      ],
      naoVale: [
        'O pedido é “ter IA” sem um problema no fluxo',
        'Não há dado, sistema nem dono — só a expectativa de mágica',
      ],
    },
    metodo:
      'Mesmo método: entender o processo, definir o recorte e o limite de autonomia, construir com o sistema real, medir o que entrou em operação. Um agente sem ponto de cancelamento não deveria sair do papel.',
    faq: [
      {
        id: 'pratica',
        pergunta: 'Como funciona IA aplicada na prática?',
        resposta: [
          'Ligada ao processo real, não como demonstração. Um agente que responde a partir da base de conhecimento da empresa, uma triagem que separa o que chega, um assistente que consulta o sistema e registra o resultado.',
        ],
      },
      {
        id: 'agente',
        pergunta: 'O que vocês chamam de agente de IA?',
        resposta: [
          'Um sistema que usa ferramentas e contexto da operação para executar um recorte combinado — com limite e alguém responsável. Não é um chat genérico nem um wrapper de prompt sem integração.',
        ],
      },
    ],
  },
];

export function paginaPorPath(path: string): PaginaServico {
  const pagina = PAGINAS_SERVICO.find((p) => p.path === path);
  if (!pagina) throw new Error(`página de serviço ausente: ${path}`);
  return pagina;
}
