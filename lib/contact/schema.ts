import { z } from 'zod';

/**
 * O schema do formulário de contato — ÚNICO lugar onde a regra de validação
 * existe.
 *
 * O §17 do plano justifica o zod exatamente por isto: cliente e servidor
 * validam com o MESMO objeto. Duas validações escritas à mão divergem, e a
 * divergência aparece como um campo que passa no navegador e é recusado no
 * servidor — ou, pior, o contrário.
 *
 * As mensagens vivem aqui, e não no componente, porque são conteúdo (§16).
 */
export const contatoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, 'Diga como podemos chamar você.')
    .max(80, 'Nome longo demais — 80 caracteres bastam.'),

  email: z
    .string()
    .trim()
    .min(1, 'Precisamos de um e-mail para responder.')
    .max(160, 'E-mail longo demais.')
    .pipe(z.email('Esse e-mail não parece válido.')),

  /**
   * Opcional de propósito. Quem escreve pode ser de dentro de uma empresa, de
   * uma equipe sem nome próprio ou por conta própria — exigir o campo só
   * produziria um dado inventado no lugar de um campo vazio.
   */
  empresa: z.string().trim().max(80, 'Nome longo demais.').optional().or(z.literal('')),

  problema: z
    .string()
    .trim()
    .min(20, 'Conte um pouco mais — o que está travando hoje?')
    .max(2000, 'Passou de 2000 caracteres. O resto a gente conversa.'),
});

export type ContatoPayload = z.infer<typeof contatoSchema>;

/** Campos do formulário, na ordem em que aparecem. */
export const CAMPOS = ['nome', 'email', 'empresa', 'problema'] as const;
export type CampoContato = (typeof CAMPOS)[number];

/** Erros por campo, no formato que o componente consome. */
export type ErrosContato = Partial<Record<CampoContato, string>>;

/**
 * Traduz o resultado do zod para o mapa de erros do formulário.
 *
 * Só a PRIMEIRA mensagem de cada campo: um campo com três erros ao mesmo tempo
 * não ajuda ninguém a consertá-lo.
 */
export function errosDe(erro: z.ZodError): ErrosContato {
  const saida: ErrosContato = {};
  for (const item of erro.issues) {
    const campo = item.path[0];
    if (typeof campo === 'string' && !(campo in saida)) {
      saida[campo as CampoContato] = item.message;
    }
  }
  return saida;
}
