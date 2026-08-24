import type { Metadata } from 'next';
import { ContactForm, type EstadoFormulario } from '@/components/sections/ContactForm';
import styles from './estados.module.css';

/**
 * Rota de diagnóstico: os CINCO estados do formulário, lado a lado.
 *
 * Existe para o aceite da Fase 10 — "os cinco estados (`idle`/`validating`/
 * `submitting`/`success`/`error`) são todos demonstráveis e capturados em
 * screenshot". Dois deles não se deixam fotografar em produção: `validating`
 * dura um quadro, porque a validação é síncrona, e `submitting` dura o tempo de
 * uma requisição local.
 *
 * É o MESMO componente da home — a única diferença é a prop que fixa o estado.
 * Se a interface de um estado quebrar, quebra aqui também, e é isso que faz
 * desta página uma prova em vez de uma maquete.
 *
 * Fora dos buscadores e do sitemap.
 */
export const metadata: Metadata = {
  title: 'Contato — estados do formulário',
  robots: { index: false, follow: false },
};

/*
 * Valores de demonstração, escolhidos para FALHAR na validação — é o que torna
 * o estado de erro fotografável. O e-mail não tem arroba de propósito: um
 * endereço plausível dentro do repositório seria um dado inventado, e o §21.3
 * não abre exceção para rota de diagnóstico.
 */
const PREENCHIDO = {
  nome: 'Marina Alencar',
  email: 'marina.alencar',
  empresa: 'Fábrica de Móveis Alencar',
  problema: 'Pedido travado',
};

type Caso = {
  estado: EstadoFormulario;
  titulo: string;
  nota: string;
  props?: Parameters<typeof ContactForm>[0];
};

/*
 * Os dois casos de `error` do §9.7 são DIFERENTES e ambos precisam existir: um
 * é do conteúdo (o servidor recusa campo a campo, o erro fica ao lado do
 * campo), o outro é do transporte (nada há para corrigir no que foi digitado, e
 * a mensagem é do formulário inteiro).
 */
const CASOS: readonly Caso[] = [
  {
    estado: 'idle',
    titulo: 'idle',
    nota: 'Estado inicial. Nada enviado, nenhum erro, botão ativo.',
    props: { estadoFixo: 'idle' },
  },
  {
    estado: 'validating',
    titulo: 'validating',
    nota: 'O schema está sendo aplicado. Campos travados, status anunciado.',
    props: { estadoFixo: 'validating', valoresFixos: PREENCHIDO },
  },
  {
    estado: 'submitting',
    titulo: 'submitting',
    nota: 'Requisição em voo. Botão desabilitado e rotulado "Enviando".',
    props: { estadoFixo: 'submitting', valoresFixos: PREENCHIDO },
  },
  {
    estado: 'error',
    titulo: 'error — validação',
    nota: 'Erro por campo, inline, ligado por aria-describedby.',
    props: {
      estadoFixo: 'error',
      valoresFixos: PREENCHIDO,
      errosFixos: {
        email: 'Esse e-mail não parece válido.',
        problema: 'Conte um pouco mais — o que está travando hoje?',
      },
    },
  },
  {
    estado: 'error',
    titulo: 'error — rede',
    nota: 'Falha de transporte. Não há campo a corrigir; a mensagem é do formulário.',
    props: {
      estadoFixo: 'error',
      valoresFixos: PREENCHIDO,
      erroGeralFixo: 'Sem conexão com o servidor. Verifique a rede e tente de novo.',
    },
  },
  {
    estado: 'success',
    titulo: 'success',
    nota: 'O servidor aceitou. A cópia diz o que de fato aconteceu — nada foi enviado.',
    props: { estadoFixo: 'success' },
  },
];

export default function Page() {
  return (
    <main id="conteudo" tabIndex={-1} className={styles.pagina}>
      <h1 className="title">Estados do formulário</h1>
      <p className={`lead ${styles.intro}`}>
        Aceite da Fase 10. O mesmo componente da home, com o estado fixado por prop.
      </p>

      <div className={styles.grade}>
        {CASOS.map((caso) => (
          <section key={caso.titulo} className={styles.caso} data-caso={caso.titulo}>
            <h2 className={`micro ${styles.rotulo}`}>{caso.titulo}</h2>
            <p className={styles.nota}>{caso.nota}</p>
            <div className={styles.moldura}>
              <ContactForm {...caso.props} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
