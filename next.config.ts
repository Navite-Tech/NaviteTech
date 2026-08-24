import type { NextConfig } from 'next';

/*
 * O build de produção local pode usar `.next-prod` para não colidir com
 * `next dev`, que também escreve em `.next`. Sem isto, um dev server rodando
 * em paralelo reescreve `static/css` com o layout dele — `static/css/app/…`
 * em vez dos arquivos com hash. O HTML pré-renderizado que o `next start`
 * serve continua apontando para os hashes antigos, que já não existem: a
 * página chega ao navegador SEM ESTILO NENHUM.
 *
 * Na Vercel o distDir tem de ser `.next` (padrão). Para builds locais em
 * paralelo com o dev server, use `npm run build:local` / `start:local`.
 */
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  // O indicador do dev server fica sobre a página e entrava nas capturas de
  // calibragem do símbolo, escurecendo as faixas de baixo em ~18 de luminância.
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  eslint: {
    // Lint roda em `npm run verify`, com o flat config próprio do projeto.
    // O detector do Next procura por `eslint-config-next`, que foi trocado por
    // @next/eslint-plugin-next (incompatível com ESLint 9.39 via rushstack patch).
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['gsap'],
  },
};

export default nextConfig;
