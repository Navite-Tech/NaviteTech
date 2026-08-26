/**
 * URLs públicas indexáveis. Sitemap, metadata e testes leem daqui —
 * uma lista só, para canonical e `<loc>` não divergirem.
 *
 * Rotas de diagnóstico NÃO entram. Elas têm `robots: { index: false }` e
 * `Disallow` em `app/robots.ts`.
 */
export const ROTAS_PUBLICAS = [
  '/',
  '/desenvolvimento-de-software',
  '/criacao-de-sites',
  '/automacao-e-integracoes',
  '/inteligencia-artificial',
] as const;

export type RotaPublica = (typeof ROTAS_PUBLICAS)[number];
