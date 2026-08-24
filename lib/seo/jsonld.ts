import { FAQ } from '@/lib/content/faq';
import { site } from '@/lib/config/site';

/**
 * Dados estruturados (§15) — e a regra dura vale aqui como em todo o resto:
 * **só entra o que é verdadeiro e verificável na própria página**.
 *
 * Sem `Review`, sem `AggregateRating`, sem `Service`, sem `foundingDate`, sem
 * `numberOfEmployees`. Nada disso existe, e schema inventado é pior do que
 * schema ausente: ele afirma ao buscador algo que a página não sustenta.
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
export function faqJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
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
 * Hoje isso são dois: `name` e `logo`. `url`, `legalName`, `taxId`, `sameAs` e
 * `contactPoint` entram sozinhos no dia em que `lib/config/site.ts` for
 * preenchido, sem que nada aqui precise mudar.
 *
 * `logo` só é emitido junto com `url`: o campo pede URL absoluta, e um caminho
 * relativo ali seria um dado inválido em vez de um dado ausente.
 */
export function organizationJsonLd(): Json | null {
  const org: Json = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    alternateName: site.shortName,
  };

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
export function serializar(dados: Json): string {
  return JSON.stringify(dados).replace(/</g, '\\u003c');
}
