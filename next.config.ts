import path from 'node:path';
import type { NextConfig } from 'next';

/*
 * O build de produção tem o PRÓPRIO diretório de saída.
 *
 * Isto não é organização: é a correção de uma armadilha que custou tempo três
 * vezes neste projeto. `next dev` e `next build` escrevem no mesmo `.next` por
 * padrão, e um dev server rodando em paralelo reescreve `static/css` com o
 * layout dele — `static/css/app/…` em vez dos arquivos com hash. O HTML
 * pré-renderizado que o `next start` serve continua apontando para os hashes
 * antigos, que já não existem: a página chega ao navegador SEM ESTILO NENHUM.
 *
 * O sintoma engana. Nada falha, nada avisa, o servidor responde 200 — e a
 * medição seguinte descreve uma página que ninguém jamais verá. A última
 * ocorrência mediu o `<h1>` do hero a 3042px abaixo da dobra e um LCP de 4,9s
 * que não existe.
 *
 * `next dev` põe NODE_ENV em development; `next build` e `next start`, em
 * production. Com os dois diretórios separados por essa chave, as duas coisas
 * passam a poder rodar ao mesmo tempo sem se ver.
 */
// Na Vercel o output tem de ser `.next` — a plataforma não reconhece outro
// distDir. Localmente mantemos `.next-prod` para dev e build não se pisarem.
const distDir =
  process.env.NODE_ENV === 'development'
    ? '.next'
    : process.env.VERCEL
      ? '.next'
      : '.next-prod';

const nextConfig: NextConfig = {
  distDir,
  reactStrictMode: true,
  // Há um lockfile em diretório ancestral; sem isto o Next infere a raiz errada.
  outputFileTracingRoot: path.resolve(process.cwd()),
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
