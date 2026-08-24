/**
 * As seis perguntas do §9.6.
 *
 * Copy PT-BR proposta (§21.4). O critério que governou a escrita: **nenhuma
 * resposta afirma um fato que ainda não existe**. Não há prazo em semanas, não
 * há preço, não há nome de cliente, não há garantia — porque nada disso está
 * definido, e o §21.3 vale para o corpo do texto tanto quanto para o rodapé.
 *
 * As respostas descrevem o MÉTODO, que é o que de fato está decidido e está na
 * página logo acima: as etapas 01 a 04 da seção Processo aparecem aqui por
 * nome, e é o que amarra as duas seções.
 *
 * `resposta` é um array de parágrafos. A maioria tem um só; o formato existe
 * para que uma resposta possa crescer sem virar um bloco único.
 */

export type FaqItem = {
  /** Usado como âncora e como id do painel. */
  id: string;
  pergunta: string;
  resposta: readonly string[];
};

export const FAQ: readonly FaqItem[] = [
  {
    id: 'prazo',
    pergunta: 'Quanto tempo leva um projeto?',
    resposta: [
      'Depende do escopo, e a resposta honesta só existe depois de entender a operação. O que dá para prometer antes disso é o formato: o prazo entra na proposta dividido em etapas, com o que fica pronto em cada uma. Um número solto antes de olhar seria chute.',
    ],
  },
  {
    id: 'inicio',
    pergunta: 'Como começa um projeto?',
    resposta: [
      'Por uma conversa sobre o problema, não sobre tecnologia. Antes de qualquer proposta, mapeamos a rotina, onde ela trava e o que muda se destravar — é a etapa 01 do processo. Ela existe mesmo quando o pedido já chega com a solução escolhida.',
    ],
  },
  {
    id: 'sem-time',
    pergunta: 'Atendem empresa sem time técnico?',
    resposta: [
      'Sim, e é o caso mais comum. Assumimos as decisões técnicas e devolvemos em linguagem de negócio: o que foi construído, por que, e o que custa manter. Nada aqui exige que alguém do outro lado leia código.',
    ],
  },
  {
    id: 'automacao',
    pergunta: 'O que entra em “automação”?',
    resposta: [
      'Tirar o trabalho repetitivo do caminho e fazer sistemas isolados conversarem. Na prática: um formulário que alimenta o sistema de gestão sozinho, uma aprovação que anda sem alguém empurrando, dados que chegam ao relatório sem passar por planilha.',
      'Sempre sobre o processo que já existe — automatizar um processo confuso só o deixa confuso e mais rápido.',
    ],
  },
  {
    id: 'ia',
    pergunta: 'Como funciona IA aplicada na prática?',
    resposta: [
      'Ligada ao processo real, não como demonstração. Um agente que responde a partir da base de conhecimento da empresa, uma triagem que separa o que chega, um assistente que consulta o sistema e registra o resultado.',
      'O critério é sempre o mesmo: precisa resolver algo que hoje consome o tempo de alguém.',
    ],
  },
  {
    id: 'depois',
    pergunta: 'O que acontece depois da entrega?',
    resposta: [
      'Medir o que entrou em operação e ajustar — a etapa 04 do processo. Não é suporte passivo à espera de um chamado: é acompanhar o que o uso revela e continuar melhorando enquanto fizer sentido para o negócio. O formato desse acompanhamento é combinado antes da entrega, não depois.',
    ],
  },
] as const;
