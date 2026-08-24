import type { Metadata, Viewport } from 'next';
import { inter, jost } from './fonts';
import { site } from '@/lib/config/site';
import { SkipLink } from '@/components/chrome/SkipLink';
import { Header } from '@/components/chrome/Header';
import { Environment } from '@/components/chrome/Environment';
import { Footer } from '@/components/chrome/Footer';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/utilities.css';

const title = 'Navite Tech — Tecnologia para o que precisa funcionar melhor';
const description =
  'Produtos digitais, sistemas e automações construídos a partir do problema — não da tecnologia.';

export const metadata: Metadata = {
  title: { default: title, template: '%s — Navite Tech' },
  description,
  applicationName: site.name,
  // `metadataBase` e `canonical` só entram quando o domínio for definido.
  // Enquanto `site.url` for null, nada de placeholder vai para o <head>.
  ...(site.url ? { metadataBase: new URL(site.url), alternates: { canonical: '/' } } : {}),
  /*
   * Palavras-chave moderadas (§15): as quatro capacidades que a página de fato
   * descreve, e nada além. Lista longa de termos genéricos não ajuda ranqueamento
   * há anos e afirma sobre a empresa coisas que a página não sustenta.
   */
  keywords: [
    'desenvolvimento de software',
    'automação de processos',
    'integração de sistemas',
    'IA aplicada ao negócio',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: site.name,
    title,
    description,
    ...(site.url ? { url: site.url } : {}),
  },
  /*
   * `summary_large_image` sem `images` é deliberado enquanto não há domínio: o
   * cartão exige URL absoluta para a imagem, e o Next só resolve caminhos
   * relativos com `metadataBase`, que depende de `site.url`. Declarar o tipo
   * agora e a imagem depois não muda componente nenhum.
   *
   * Sem `site:` nem `creator:` — não há perfil definido (§21.3).
   */
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  formatDetection: {
    // Nada de telefone virando link automaticamente: não há telefone (§21.3), e
    // o detector do iOS transforma números do texto em `tel:` sem avisar.
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#00101e',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.locale} className={`${inter.variable} ${jost.variable}`}>
      <body>
        <SkipLink />
        {/* Antes de tudo: divide --z-bg com os campos de ambientacao das secoes,
            e a ordem entre eles se resolve por ordem de DOM. */}
        <Environment />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
