/**
 * Copy da seção de contato (§9.7).
 *
 * A CÓPIA DE SUCESSO É A DECISÃO DELICADA DESTE ARQUIVO.
 *
 * O §9.7 é explícito: "enquanto o transporte for no-op, a mensagem de sucesso
 * não promete resposta que não vai acontecer". E o transporte de hoje não envia
 * nem guarda nada — ele valida no servidor, registra que uma mensagem chegou e
 * descarta. Uma tela agradecendo pelo contato e prometendo retorno seria falsa
 * para quem escreveu.
 *
 * Então ela diz exatamente o que acontece. É uma cópia de PRÉ-LANÇAMENTO, e
 * troca por uma confirmação normal no mesmo dia em que `ContactTransport`
 * ganhar um provedor — sem tocar em componente nenhum, porque vive aqui.
 *
 * Nenhum e-mail, telefone, WhatsApp ou domínio aparece neste arquivo, e não vai
 * aparecer enquanto `lib/config/site.ts` estiver com os campos em `null`
 * (§21.3). Não há canal secundário na seção pelo mesmo motivo: inventar um
 * seria pior do que não ter.
 */
export const CONTATO_COPY = {
  /*
   * Em duas linhas EXPLÍCITAS, como todos os títulos de seção desta página. A
   * quebra aqui é geométrica além de editorial: o headline fica dentro do vão
   * do `( )`, e numa linha só ele atravessava as duas crescentes a 1280px de
   * largura.
   */
  titulo: ['Conte o', 'problema.'],
  /*
   * Encurtado em relação à primeira versão, e por medida: o lead fica DENTRO
   * do vão do `( )`, que é um círculo, e cada linha a mais o empurra para onde
   * a corda é menor. A oração que saiu — "não com um orçamento genérico" —
   * levava o bloco a três linhas em 1280px e fazia a última cruzar a crescente
   * esquerda.
   */
  lead: 'Comece pelo que está travando. O caminho é a nossa parte.',

  campos: {
    nome: 'Nome',
    email: 'E-mail',
    empresa: 'Empresa (opcional)',
    problema: 'Qual é o problema?',
  },

  enviar: 'Enviar',
  enviando: 'Enviando',

  status: {
    validando: 'Conferindo o que você escreveu…',
    enviando: 'Enviando sua mensagem…',
    revise: 'Revise os campos marcados.',
  },

  sucesso: {
    titulo: 'Formulário validado.',
    texto:
      'O envio ainda não está ligado a um canal de contato — nada foi enviado e nada foi guardado. Assim que o canal estiver definido, esta mesma tela passa a confirmar o recebimento.',
  },
} as const;
