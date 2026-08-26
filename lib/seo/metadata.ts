import type { Metadata } from 'next';
import { site } from '@/lib/config/site';
import type { RotaPublica } from './rotas';

export const HOME_TITLE = 'Navite Tech — Tecnologia para o que precisa funcionar melhor';
export const HOME_DESCRIPTION =
  'Produtos digitais, sistemas e automações construídos a partir do problema — não da tecnologia.';

/**
 * URL absoluta sem barra no final, alinhada ao `<loc>` do sitemap.
 * `null` enquanto `site.url` não existir — o caller não emite canonical.
 */
export function urlAbsoluta(path: RotaPublica | string): string | null {
  if (!site.url) return null;
  return path === '/' ? site.url : `${site.url}${path}`;
}

/**
 * Metadata por rota: canonical, og:url e og/twitter title+description juntos.
 *
 * No App Router o `alternates` do layout é herdado se a page não declarar o
 * seu. `openGraph` da page **substitui** o do layout neste Next 15.5 — por
 * isso type, locale, siteName, url e imagem saem daqui juntos, nunca só a
 * URL da home no root layout.
 *
 * `title` string usa o template `%s — Navite Tech`. A home passa
 * `{ absolute }` para não duplicar o nome.
 */
export function metadataDePagina(opts: {
  path: RotaPublica;
  title: string | { absolute: string };
  description: string;
}): Metadata {
  const absolute = urlAbsoluta(opts.path);
  const titleOg = typeof opts.title === 'string' ? opts.title : opts.title.absolute;

  return {
    title: opts.title,
    description: opts.description,
    ...(absolute
      ? {
          alternates: { canonical: absolute },
          openGraph: {
            type: 'website',
            locale: 'pt_BR',
            siteName: site.name,
            title: titleOg,
            description: opts.description,
            url: absolute,
            images: [
              {
                url: '/opengraph-image',
                width: 1200,
                height: 630,
                alt: HOME_TITLE,
              },
            ],
          },
          twitter: {
            title: titleOg,
            description: opts.description,
            images: ['/opengraph-image'],
          },
        }
      : {}),
  };
}
