import { NextResponse } from 'next/server';
import { contatoSchema, errosDe } from '@/lib/contact/schema';
import { transporte } from '@/lib/contact/transport';

/**
 * O endpoint da CTA.
 *
 * Valida com o MESMO schema do cliente (`lib/contact/schema.ts`) e entrega ao
 * transporte em uso. Não conhece qual transporte é — hoje é o no-op, amanhã
 * será um provedor, e este arquivo não muda.
 *
 * A validação do servidor não é redundante com a do cliente: a do cliente é
 * conveniência, esta é a que vale. Um POST direto, sem passar pelo formulário,
 * cai exatamente na mesma regra.
 */
export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: 'corpo inválido' }, { status: 400 });
  }

  const analise = contatoSchema.safeParse(corpo);
  if (!analise.success) {
    // 422, e não 400: a requisição está bem formada; o CONTEÚDO é que não passa.
    return NextResponse.json({ erros: errosDe(analise.error) }, { status: 422 });
  }

  try {
    await transporte.entregar(analise.data);
  } catch (erro) {
    console.error(`[contato] transporte "${transporte.nome}" falhou`, erro);
    return NextResponse.json({ erro: 'falha na entrega' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, transporte: transporte.nome });
}
