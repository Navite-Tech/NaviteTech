/**
 * Dados institucionais da Navite Tech.
 *
 * REGRA DURA: nada aqui pode ser inventado. Campos ainda não definidos
 * permanecem `null`, e todo consumidor deve emitir condicionalmente — nunca um
 * placeholder visível, nunca um domínio de demonstração, nunca contato falso.
 *
 * O parágrafo acima não cita nenhum domínio de exemplo de propósito:
 * `scripts/check-contato.mjs` varre este diretório procurando FORMATOS, e um
 * comentário que ensina o que não fazer seria reprovado por escrever o que
 * proíbe.
 *
 * Preencher estes campos liga metadata, JSON-LD, sitemap e rodapé
 * sem alterar nenhum componente.
 */
export type SiteConfig = {
  name: string;
  shortName: string;
  locale: string;
  /** Origem absoluta, ex.: 'https://…'. `null` até o domínio ser definido. */
  url: string | null;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  social: readonly string[];
};

export const site: SiteConfig = {
  name: 'Navite Tech',
  shortName: 'Navite',
  locale: 'pt-BR',
  url: 'https://tech.navite.com.br',
  legalName: null,
  taxId: null,
  email: null,
  phone: null,
  address: null,
  social: [],
};

/** `true` quando há dados suficientes para emitir metadata absoluta. */
export const hasAbsoluteUrl = site.url !== null;
