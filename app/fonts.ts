import localFont from 'next/font/local';

/**
 * Fontes self-hosted, subset `latin` do Google Fonts.
 *
 * O subset latin (U+0000-00FF + pontuação) cobre todo o PT-BR — á à â ã ç é ê
 * í ó ô õ ú vivem em Latin-1 Supplement — então latin-ext seria peso morto.
 *
 * `next/font/local` calcula `size-adjust` a partir das métricas do arquivo e
 * gera a fallback face automaticamente, que é o que zera o CLS de fonte.
 */

/** Leitura: headlines, corpo, interface. */
export const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
  adjustFontFallback: 'Arial',
});

/**
 * Voz de marca: numerais grandes, eyebrows, labels em caixa alta.
 *
 * Continua PRÉ-CARREGADA, e isso foi testado. Tirá-la do `preload` parecia o
 * caminho óbvio para o orçamento de fontes do §13.1 — 97,8KB contra um teto de
 * 90 —, mas não muda byte nenhum: `preload: false` remove a dica de
 * carregamento, não o carregamento. A face continua sendo buscada no mesmo
 * documento, porque há texto visível usando-a desde a primeira tela. O que a
 * mudança produzia era só uma troca de face tardia na microtipografia.
 */
export const jost = localFont({
  src: './fonts/Jost-Variable.woff2',
  variable: '--font-jost',
  display: 'swap',
  weight: '200 700',
  adjustFontFallback: 'Arial',
});
