import { FAQ, type FaqItem } from '@/lib/content/faq';
import { site } from '@/lib/config/site';
import { urlAbsoluta } from './metadata';

/**
 * Dados estruturados (§15) — e a regra dura vale aqui como em todo o resto:
 * **só entra o que é verdadeiro e verificável na própria página**.
 *
 * Sem `Review`, sem `AggregateRating`, sem `foundingDate`, sem
 * `numberOfEmployees`. `Service` só sai nas landings, com nome, descrição e
 * provider — nada de oferta, avaliação ou área de atendimento inventada.
 */

type Json = Record<string, unknown>;

/**
 * `FAQPage`. Sai desde já porque as seis perguntas EXISTEM na página, com
 * exatamente este texto — que é a condição do tipo.
 *
 * O texto vem de `lib/content/faq.ts`, o mesmo que a lista renderiza. Não há
 * cópia: se uma resposta mudar, o schema muda junto, e a possibilidade de os
 * dois divergirem simplesmente não existe.
 */
export function faqJsonLd(itens: readonly FaqItem[] = FAQ): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: itens.map((item) => ({
      '@type': 'Question',
      name: item.pergunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.resposta.join(' '),
      },
    })),
  };
}

/**
 * `Organization`, com os campos que estiverem preenchidos — e só eles.
 *
 * `name` e `alternateName` sempre saem. `url` e `logo` entram com `site.url`.
 * `legalName`, `taxId`, `sameAs` e `contactPoint` entram sozinhos no dia em
 * que `lib/config/site.ts` for preenchido, sem que nada aqui precise mudar.
 *
 * `logo` só é emitido junto com `url`: o campo pede URL absoluta, e um caminho
 * relativo ali seria um dado inválido em vez de um dado ausente.
 */
function organizationId(): string | null {
  return site.url ? `${site.url}/#organization` : null;
}

export function organizationJsonLd(): Json | null {
  const org: Json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    alternateName: site.shortName,
  };
  const id = organizationId();
  if (id) org['@id'] = id;

  if (site.url) {
    org.url = site.url;
    org.logo = `${site.url}/icon.svg`;
  }
  if (site.legalName) org.legalName = site.legalName;
  if (site.taxId) org.taxId = site.taxId;
  if (site.social.length > 0) org.sameAs = [...site.social];

  const contato: Json = { '@type': 'ContactPoint', contactType: 'sales' };
  if (site.email) contato.email = site.email;
  if (site.phone) contato.telephone = site.phone;
  if (site.email || site.phone) org.contactPoint = contato;

  if (site.address) org.address = site.address;

  return org;
}

/**
 * Serializa para dentro de `<script type="application/ld+json">`.
 *
 * O escape de `<` é obrigatório e não é paranoia: uma resposta do FAQ que
 * contivesse `</script` encerraria a tag no meio do JSON e o resto do documento
 * passaria a ser interpretado como marcação. Escapando a barra, o JSON continua
 * válido — `<` é o mesmo caractere — e a sequência deixa de existir.
 */
export function webSiteJsonLd(): Json | null {
  if (!site.url) return null;
  const siteId = `${site.url}/#website`;
  const orgId = organizationId();
  const siteNode: Json = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': siteId,
    name: site.name,
    url: site.url,
  };
  if (orgId) siteNode.publisher = { '@id': orgId };
  return siteNode;
}

export function webPageJsonLd(opts: {
  path: string;
  name: string;
  description: string;
}): Json | null {
  const url = urlAbsoluta(opts.path);
  if (!url || !site.url) return null;
  const page: Json = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${site.url}/#website` },
  };
  const orgId = organizationId();
  if (orgId) page.about = { '@id': orgId };
  return page;
}

export function breadcrumbJsonLd(opts: { path: string; name: string }): Json | null {
  const url = urlAbsoluta(opts.path);
  if (!url || !site.url) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: site.name,
        item: site.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: opts.name,
        item: url,
      },
    ],
  };
}

/**
 * `Service` mínimo: nome, descrição e provider. Sem Offer, review,
 * `areaServed` ou qualquer campo que a página não sustente.
 */
export function serviceJsonLd(opts: { name: string; description: string }): Json | null {
  const orgId = organizationId();
  if (!orgId) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    provider: { '@id': orgId },
  };
}

export function serializar(dados: Json): string {
  return JSON.stringify(dados).replace(/</g, '\\u003c');
}
