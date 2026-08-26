import type { MetadataRoute } from 'next';
import { site } from '@/lib/config/site';
import { ROTAS_PUBLICAS } from '@/lib/seo/rotas';
import { urlAbsoluta } from '@/lib/seo/metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];

  const entradas: MetadataRoute.Sitemap = [];
  for (const path of ROTAS_PUBLICAS) {
    const url = urlAbsoluta(path);
    if (!url) continue;
    entradas.push({
      url,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: path === '/' ? 1 : 0.8,
    });
  }
  return entradas;
}
