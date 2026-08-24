'use client';

import { useId, useState } from 'react';
import { PillButton } from '@/components/ui/PillButton';
import type { ErrosContato } from '@/lib/contact/schema';
import { enviarContato } from '@/lib/contact/submit';
import { CONTATO_COPY } from '@/lib/content/contato';
import styles from './contato.module.css';

/**
 * Os cinco estados do §9.7. A máquina inteira vive aqui, e é uma máquina de
 * verdade — não um booleano `carregando` com nomes bonitos:
 *
 *   idle        nada enviado ainda
 *   validating  o schema está sendo aplicado ao que foi digitado
 *   submitting  a requisição está em voo
 *   success     o servidor aceitou
 *   error       o conteúdo não passou, ou a rede falhou
 *
 * `validating` cobre a chegada do schema, que vem por import dinâmico para não
 * pesar no primeiro carregamento da home — é trabalho de verdade, não um estado
 * decorativo. É também onde uma verificação assíncrona futura entra sem
 * redesenhar nada. A rota `/contato/estados` renderiza os cinco.
 */
export type EstadoFormulario = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

type Props = {
  /**
   * Fixa o estado, os erros e os valores. Existe só para a rota de diagnóstico
   * — é o que torna os cinco estados capturáveis em screenshot, que é o aceite
   * do §18. Em produção nada passa estas props.
   */
  estadoFixo?: EstadoFormulario;
  errosFixos?: ErrosContato;
  erroGeralFixo?: string | null;
  valoresFixos?: Partial<Record<'nome' | 'email' | 'empresa' | 'problema', string>>;
};

const VAZIO = { nome: '', email: '', empresa: '', problema: '' };

export function ContactForm({ estadoFixo, errosFixos, erroGeralFixo, valoresFixos }: Props = {}) {
  const [estadoInterno, setEstado] = useState<EstadoFormulario>('idle');
  const [erros, setErros] = useState<ErrosContato>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [valores, setValores] = useState(VAZIO);
  const idBase = useId();

  const fixo = estadoFixo !== undefined;
  const estado = estadoFixo ?? estadoInterno;
  const errosAtivos = fixo ? (errosFixos ?? {}) : erros;
  const geral = fixo ? (erroGeralFixo ?? null) : erroGeral;
  const campos = fixo ? { ...VAZIO, ...valoresFixos } : valores;

  const ocupado = estado === 'validating' || estado === 'submitting';

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (fixo || ocupado) return;

    setEstado('validating');
    setErroGeral(null);

    /*
     * O schema chega por import DINÂMICO, e isso não é preciosismo: o zod pesa
     * ~19 KB gz e estava entrando no primeiro carregamento da home — 110 → 129
     * KB — para validar um formulário que fica dez telas abaixo e que a maior
     * parte das visitas nunca alcança. Aqui ele chega no instante do envio, com
     * a rede ociosa.
     *
     * De quebra, `validating` deixa de ser um estado de um quadro só: ele passa
     * a cobrir a chegada do schema, que é trabalho de verdade.
     */
    const { contatoSchema, errosDe } = await import('@/lib/contact/schema');
    const analise = contatoSchema.safeParse(valores);
    if (!analise.success) {
      setErros(errosDe(analise.error));
      setEstado('error');
      return;
    }
    setErros({});

    setEstado('submitting');
    const resultado = await enviarContato(analise.data);

    if (resultado.ok) {
      setEstado('success');
      setValores(VAZIO);
      return;
    }
    if (resultado.tipo === 'validacao') setErros(resultado.erros);
    else setErroGeral(resultado.mensagem);
    setEstado('error');
  }

  const id = (campo: string) => `${idBase}-${campo}`;
  const idErro = (campo: string) => `${idBase}-${campo}-erro`;

  /*
   * Sucesso substitui o formulário no lugar dele — inline, sem modal (§9.7).
   *
   * A cópia diz o que de fato aconteceu. Enquanto o transporte for no-op, NADA
   * é enviado e nada é guardado, e uma tela que agradecesse pelo contato
   * estaria mentindo para quem escreveu. Ver lib/content/contato.ts.
   */
  if (estado === 'success') {
    return (
      <div className={styles.sucesso} role="status">
        <p className={styles.sucessoTitulo}>{CONTATO_COPY.sucesso.titulo}</p>
        <p className={styles.sucessoTexto}>{CONTATO_COPY.sucesso.texto}</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={aoEnviar} noValidate>
      <div className={styles.linha}>
        <Campo
          nome="nome"
          rotulo={CONTATO_COPY.campos.nome}
          id={id('nome')}
          idErro={idErro('nome')}
          valor={campos.nome}
          erro={errosAtivos.nome}
          ocupado={ocupado}
          aoMudar={(v) => setValores((s) => ({ ...s, nome: v }))}
          autoComplete="name"
        />
        <Campo
          nome="email"
          tipo="email"
          rotulo={CONTATO_COPY.campos.email}
          id={id('email')}
          idErro={idErro('email')}
          valor={campos.email}
          erro={errosAtivos.email}
          ocupado={ocupado}
          aoMudar={(v) => setValores((s) => ({ ...s, email: v }))}
          autoComplete="email"
        />
      </div>

      <Campo
        nome="empresa"
        rotulo={CONTATO_COPY.campos.empresa}
        id={id('empresa')}
        idErro={idErro('empresa')}
        valor={campos.empresa}
        erro={errosAtivos.empresa}
        ocupado={ocupado}
        aoMudar={(v) => setValores((s) => ({ ...s, empresa: v }))}
        autoComplete="organization"
      />

      <Campo
        nome="problema"
        rotulo={CONTATO_COPY.campos.problema}
        id={id('problema')}
        idErro={idErro('problema')}
        valor={campos.problema}
        erro={errosAtivos.problema}
        ocupado={ocupado}
        aoMudar={(v) => setValores((s) => ({ ...s, problema: v }))}
        textarea
      />

      <div className={styles.rodape}>
        <PillButton type="submit" variant="solid" disabled={ocupado}>
          {estado === 'submitting' ? CONTATO_COPY.enviando : CONTATO_COPY.enviar}
        </PillButton>

        {/*
         * O status do envio, anunciado sem roubar o foco (§9.7). Fica no DOM
         * mesmo vazio: uma região `aria-live` criada no mesmo instante em que
         * ganha texto não é anunciada por parte dos leitores de tela.
         */}
        <p className={styles.status} aria-live="polite" data-estado={estado}>
          {estado === 'validating' && CONTATO_COPY.status.validando}
          {estado === 'submitting' && CONTATO_COPY.status.enviando}
          {estado === 'error' && (geral ?? CONTATO_COPY.status.revise)}
        </p>
      </div>
    </form>
  );
}

type CampoProps = {
  nome: string;
  rotulo: string;
  id: string;
  idErro: string;
  valor: string;
  erro?: string;
  ocupado: boolean;
  aoMudar: (v: string) => void;
  tipo?: string;
  textarea?: boolean;
  autoComplete?: string;
};

/**
 * Um campo. `<label>` VISÍVEL — nada de placeholder no lugar de rótulo, que
 * some no instante em que se começa a digitar.
 *
 * O erro é ligado por `aria-describedby` e só quando existe: um
 * `aria-describedby` apontando para um parágrafo vazio faz o leitor de tela
 * anunciar silêncio no fim de cada campo.
 */
function Campo({
  nome,
  rotulo,
  id,
  idErro,
  valor,
  erro,
  ocupado,
  aoMudar,
  tipo = 'text',
  textarea,
  autoComplete,
}: CampoProps) {
  const comuns = {
    id,
    name: nome,
    value: valor,
    disabled: ocupado,
    autoComplete,
    'aria-invalid': erro ? (true as const) : undefined,
    'aria-describedby': erro ? idErro : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      aoMudar(e.target.value),
  };

  return (
    <p className={styles.campo} data-campo={nome} data-erro={erro ? '' : undefined}>
      <label className={styles.rotulo} htmlFor={id}>
        {rotulo}
      </label>
      {textarea ? (
        <textarea className={styles.entrada} rows={2} {...comuns} />
      ) : (
        <input className={styles.entrada} type={tipo} {...comuns} />
      )}
      {erro && (
        <span className={styles.erro} id={idErro}>
          {erro}
        </span>
      )}
    </p>
  );
}
