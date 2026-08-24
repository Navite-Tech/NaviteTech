import type { MetadataRoute } from 'next';
import { site } from '@/lib/config/site';

/**
 * `sitemap.xml` (§15).
 *
 * O site é uma página só (§21.9): a única entrada é a raiz. As seções são
 * âncoras dentro dela, e âncoras não são URLs distintas — listá-las produziria
 * seis entradas que apontam para o mesmo documento.
 *
 * Enquanto `site.url` for `null` o sitemap sai VAZIO, e isso é deliberado. O
 * protocolo exige `<loc>` absoluta; emitir uma relativa geraria um arquivo
 * inválido, e inventar um domínio é o que o §21.3 proíbe. Um sitemap vazio é
 * um arquivo correto que não afirma nada — e volta a ter conteúdo no dia em que
 * o domínio for preenchido, sem tocar em nenhum componente.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.url) return [];
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
