import type { MetadataRoute } from 'next';
import { site } from '@/lib/config/site';

/**
 * `robots.txt` (§15).
 *
 * A rota de diagnóstico do formulário fica fora dos buscadores por ela mesma
 * (`robots: { index: false }` no metadata dela), mas também é barrada aqui: as
 * duas coisas protegem contra falhas diferentes — a primeira contra a indexação
 * de uma página que já foi rastreada, a segunda contra o rastreio.
 *
 * `sitemap` só é declarado quando existe host absoluto. O protocolo do
 * robots.txt exige URL absoluta nesse campo, então declará-lo sem domínio
 * produziria uma linha inválida — exatamente o placeholder que o §15 proíbe.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/contato/estados', '/simbolo', '/tokens', '/servicos/troca'],
    },
    ...(site.url ? { sitemap: `${site.url}/sitemap.xml`, host: site.url } : {}),
  };
}
