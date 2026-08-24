import type { ContatoPayload, ErrosContato } from './schema';

/**
 * O lado do CLIENTE do envio.
 *
 * Existe separado de `transport.ts` por uma razão de empacotamento, não de
 * organização: `transport.ts` é `server-only` porque um dia carregará
 * credencial, e um componente de cliente não pode importá-lo nem por engano. O
 * que o formulário chama é isto — um `fetch` e nada mais.
 */

export type ResultadoEnvio =
  | { ok: true }
  /** O servidor recusou o conteúdo. `erros` traz a mensagem por campo. */
  | { ok: false; tipo: 'validacao'; erros: ErrosContato }
  /** Rede, servidor fora, resposta ilegível. Não é culpa do que foi digitado. */
  | { ok: false; tipo: 'rede'; mensagem: string };

/** Onde o formulário entrega. Uma constante para que o teste possa apontar aqui. */
export const ROTA_CONTATO = '/api/contato';

export async function enviarContato(payload: ContatoPayload): Promise<ResultadoEnvio> {
  try {
    const resposta = await fetch(ROTA_CONTATO, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resposta.ok) return { ok: true };

    if (resposta.status === 422) {
      const corpo = (await resposta.json()) as { erros?: ErrosContato };
      return { ok: false, tipo: 'validacao', erros: corpo.erros ?? {} };
    }

    return {
      ok: false,
      tipo: 'rede',
      mensagem: 'Não conseguimos enviar agora. Tente de novo em instantes.',
    };
  } catch {
    /*
     * `fetch` só rejeita por rede — offline, DNS, CORS, requisição abortada.
     * Erro de servidor chega como resposta com status, tratado acima.
     */
    return {
      ok: false,
      tipo: 'rede',
      mensagem: 'Sem conexão com o servidor. Verifique a rede e tente de novo.',
    };
  }
}
