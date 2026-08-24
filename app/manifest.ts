import type { MetadataRoute } from 'next';
import { site } from '@/lib/config/site';

/**
 * `manifest.webmanifest` (§15).
 *
 * Só o que é verdadeiro hoje: nome, cores e o ícone derivado da marca. Sem
 * `screenshots`, sem `shortcuts` para seções que são âncoras, sem `start_url`
 * absoluta — a relativa `/` é válida e não depende do domínio.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    lang: site.locale,
    start_url: '/',
    display: 'standalone',
    background_color: '#00101e',
    theme_color: '#00101e',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  };
}
