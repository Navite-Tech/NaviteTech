import type { Metadata, Viewport } from 'next';
import { inter, jost } from './fonts';
import { site } from '@/lib/config/site';
import { HOME_DESCRIPTION, HOME_TITLE } from '@/lib/seo/metadata';
import { SkipLink } from '@/components/chrome/SkipLink';
import { Header } from '@/components/chrome/Header';
import { Environment } from '@/components/chrome/Environment';
import { Footer } from '@/components/chrome/Footer';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/utilities.css';

export const metadata: Metadata = {
  title: { default: HOME_TITLE, template: '%s — Navite Tech' },
  description: HOME_DESCRIPTION,
  applicationName: site.name,
  /*
   * `metadataBase` resolve caminhos relativos (ícones, OG image). Canonical e
   * `og:url` NÃO ficam aqui: o App Router herda `alternates` e faz shallow
   * merge de `openGraph` — a URL da home vazaría para as landings. Cada rota
   * pública declara os dois em `metadataDePagina`.
   */
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
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
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  /*
   * Sem `site:` nem `creator:` — não há perfil definido (§21.3).
   * A imagem sai de `app/opengraph-image.tsx` / `twitter-image.tsx`.
   */
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
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
