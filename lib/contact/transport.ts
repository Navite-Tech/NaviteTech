import 'server-only';
import type { ContatoPayload } from './schema';

/**
 * O transporte da CTA — a costura que o §21.2 exige.
 *
 * A decisão vinculante do plano: construir TODA a interface e todos os estados
 * do formulário nesta entrega, **sem acoplar provedor de envio**. Ligar Resend,
 * SMTP ou outro depois tem de ser implementar esta interface e trocar UMA
 * linha, sem tocar em nenhum componente visual.
 *
 * O módulo é `server-only` e isso não é zelo: no dia em que o transporte real
 * entrar, ele carregará credencial. Um `import` acidental a partir de um
 * componente de cliente mandaria a chave para o navegador — e o erro
 * apareceria no build, não em produção, porque este import está aqui.
 */
export type ContactTransport = {
  /** Aparece no log do servidor, para que se saiba qual transporte respondeu. */
  readonly nome: string;
  /**
   * Entrega a mensagem. Lançar sinaliza falha de entrega — o Route Handler
   * traduz isso no estado `error` do formulário.
   */
  entregar(payload: ContatoPayload): Promise<void>;
};

/**
 * Transporte NO-OP, explícito e documentado (§9.7).
 *
 * Valida (isso acontece antes, no Route Handler), registra que uma mensagem
 * chegou e devolve sucesso — **sem enviar nada para lugar nenhum e sem guardar
 * nada**. O log traz só o tamanho dos campos, nunca o conteúdo: enquanto não há
 * uma política de dados definida, o corpo da mensagem de um visitante não entra
 * em log de servidor.
 *
 * A cópia de sucesso do formulário diz exatamente isto ao usuário. Não há tela
 * que prometa uma resposta que não vai acontecer.
 */
export const transporteNoop: ContactTransport = {
  nome: 'no-op',
  entregar(payload) {
    console.info(
      `[contato] mensagem válida recebida pelo transporte no-op ` +
        `(nome ${payload.nome.length} car., problema ${payload.problema.length} car.) — nada foi enviado`,
    );
    return Promise.resolve();
  },
};

/**
 * O transporte em uso. É ESTA a linha que muda quando o provedor entrar.
 *
 * Nenhum outro arquivo precisa saber qual transporte está ligado — nem o Route
 * Handler, que só chama `entregar`, nem o componente, que nem sabe que existe
 * um transporte.
 */
export const transporte: ContactTransport = transporteNoop;
