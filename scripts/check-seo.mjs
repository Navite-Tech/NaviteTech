/**
 * Aceite da Fase 13 — SEO e orçamentos.
 *
 * O §18 pede, textualmente: "`site.ts` com todos os campos `null` produz build
 * válido e NENHUMA tag de metadata vazia ou com placeholder — verificado
 * inspecionando o `<head>` renderizado". É isso que este arquivo faz, e o resto
 * das leis é o §15 lido linha a linha.
 *
 * As metas de Lighthouse (§13.2) NÃO estão aqui: elas dependem da carga da
 * máquina e variaram 32 pontos entre execuções no mesmo build. Medir o que
 * oscila com o ambiente e chamar de lei permanente seria fabricar um alarme
 * falso. Elas ficam no relatório da fase, com a faixa observada.
 *
 *   node scripts/check-seo.mjs --url=http://localhost:3431
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3431').replace(/\/$/, '');

let leis = 0;
let falhas = 0;

function lei(ok, texto, detalhe = '') {
  leis++;
  if (!ok) falhas++;
  console.log(`${ok ? '  ok  ' : ' FALHA'} ${texto}${detalhe ? `   ${detalhe}` : ''}`);
}

/*
 * Formatos de placeholder — os mesmos do §21.3, procurados no `<head>` RENDERIZADO
 * e não no código. É a diferença entre "ninguém escreveu isso" e "isso não
 * chegou ao navegador": uma tag pode nascer vazia por um campo `null` que
 * alguém esqueceu de tornar condicional.
 */
const PROIBIDO = [
  /example\.(com|org|net)/i,
  /localhost/i,
  /\bTODO\b|\bTBD\b|lorem ipsum/i,
  /\+55\s?\(?\d/,
  /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, // CNPJ
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
];

const CABECA = `(() => {
  const tags = [...document.head.querySelectorAll('meta, link, title')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    nome: el.getAttribute('name') || el.getAttribute('property') || el.getAttribute('rel') || null,
    /*
     * null quando o atributo NAO EXISTE — e a distincao importa. <meta charset>
     * nao tem "content", e ler o textContent de um elemento vazio devolvia
     * string vazia: a lei das tags vazias reprovava o charset, que e exatamente
     * uma tag correta sem conteudo. (Sem crase neste bloco: ele vive dentro de
     * um template literal.)
     */
    valor: el.hasAttribute('content')
      ? el.getAttribute('content')
      : el.hasAttribute('href')
        ? el.getAttribute('href')
        : el.tagName === 'TITLE'
          ? el.textContent
          : null,
  }));
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => s.textContent);
  return { tags, ld, lang: document.documentElement.lang, html: document.head.innerHTML };
})()`;

await run(
  async ({ evaluate, navigate, setViewport }) => {
    await setViewport(1440, 900);
    await navigate(`${url}/`, 2600);
    await sleep(400);

    const h = await evaluate(CABECA);

    // ---------------------------------------------------------- §15 básico --
    console.log('\n=== CABEÇA ===');
    lei(h.lang === 'pt-BR', 'o documento declara pt-BR', h.lang);

    const titulo = h.tags.find((t) => t.tag === 'title');
    lei(!!titulo?.valor && titulo.valor.length > 20, 'title com conteúdo', titulo?.valor ?? '—');

    const desc = h.tags.find((t) => t.nome === 'description');
    lei(
      !!desc?.valor && desc.valor.length >= 60 && desc.valor.length <= 200,
      'description no tamanho útil',
      `${desc?.valor?.length ?? 0} caracteres`,
    );

    /*
     * A lei central do §18: nenhuma tag VAZIA.
     *
     * Uma `<meta content="">` é o sintoma de um campo `null` que escapou da
     * emissão condicional — e é pior do que a ausência da tag, porque afirma ao
     * buscador que a informação existe e é vazia.
     */
    const vazias = h.tags.filter((t) => t.valor !== null && String(t.valor).trim() === '');
    lei(
      vazias.length === 0,
      'nenhuma tag de metadata vazia',
      vazias.map((t) => `${t.tag}[${t.nome}]`).join(' '),
    );

    const suspeitas = [];
    for (const t of h.tags) {
      const v = String(t.valor ?? '');
      for (const re of PROIBIDO) if (re.test(v)) suspeitas.push(`${t.nome}="${v.slice(0, 40)}"`);
    }
    lei(
      suspeitas.length === 0,
      'nenhum placeholder ou dado inventado na cabeça',
      suspeitas.join(' '),
    );

    /*
     * Com `site.url` preenchido, canonical e og:url da HOME são obrigatórios
     * e têm de bater com o `<loc>` da home no sitemap — sem barra no final.
     */
    const canonical = h.tags.find((t) => t.nome === 'canonical');
    const ogUrl = h.tags.find((t) => t.nome === 'og:url');
    const ogImage = h.tags.find((t) => t.nome === 'og:image');
    lei(!!canonical?.valor, 'canonical da home presente', canonical?.valor ?? '—');
    lei(!!ogUrl?.valor, 'og:url da home presente', ogUrl?.valor ?? '—');
    lei(!!ogImage?.valor, 'og:image presente', ogImage?.valor ?? '—');

    for (const nome of ['og:title', 'og:description', 'og:type', 'og:locale', 'og:site_name']) {
      lei(
        h.tags.some((t) => t.nome === nome),
        `${nome} presente`,
      );
    }
    lei(
      h.tags.some((t) => t.nome === 'twitter:card'),
      'twitter:card presente',
    );
    lei(
      h.tags.some((t) => t.nome === 'icon'),
      'favicon declarado',
    );
    lei(
      h.tags.some((t) => t.nome === 'apple-touch-icon'),
      'apple-touch-icon declarado',
    );
    lei(
      h.tags.some((t) => t.nome === 'manifest'),
      'manifest declarado',
    );

    // ------------------------------------------------------- dados estruturados --
    console.log('\n=== DADOS ESTRUTURADOS ===');
    const blocos = h.ld.map((t) => JSON.parse(t));
    const faq = blocos.find((b) => b['@type'] === 'FAQPage');
    const org = blocos.find((b) => b['@type'] === 'Organization');
    const website = blocos.find((b) => b['@type'] === 'WebSite');

    lei(!!faq, 'FAQPage emitido');
    lei(faq?.mainEntity?.length === 6, 'com as seis perguntas', `${faq?.mainEntity?.length ?? 0}`);

    /*
     * O schema tem de bater com a PÁGINA, não com um arquivo. Se um dia alguém
     * renderizar a lista a partir de outra fonte, esta lei pega.
     */
    const naPagina = await evaluate(
      `[...document.querySelectorAll('#faq summary')].map((s) => s.textContent.trim())`,
    );
    const noSchema = (faq?.mainEntity ?? []).map((q) => q.name);
    lei(
      JSON.stringify(naPagina) === JSON.stringify(noSchema),
      'e cada pergunta do schema existe na página com o mesmo texto',
    );
    lei(
      (faq?.mainEntity ?? []).every((q) => (q.acceptedAnswer?.text ?? '').length > 40),
      'toda pergunta tem resposta com conteúdo',
    );

    lei(!!org, 'Organization emitido');
    lei(org?.name === 'Navite Tech', 'com o nome verdadeiro', org?.name);
    lei(!!org?.url && String(org.url).startsWith('https://'), 'com url absoluta', org?.url ?? '—');
    lei(!!org?.logo, 'com logo absoluto');
    lei(!!website, 'WebSite emitido');
    lei(website?.url === org?.url, 'WebSite aponta para a mesma origem');
    /*
     * Campos que só podem aparecer depois que `lib/config/site.ts` os preencher.
     * `url` e `logo` já são verdadeiros. `Service` na HOME seria inventar um
     * tipo que a homepage não descreve como serviço isolado.
     */
    const inventados = ['legalName', 'taxId', 'sameAs', 'contactPoint', 'address'].filter(
      (k) => org && k in org,
    );
    lei(
      inventados.length === 0,
      'e sem nenhum campo institucional que ainda não existe',
      inventados.join(' '),
    );
    lei(
      !blocos.some((b) => ['Review', 'AggregateRating', 'Product'].includes(b['@type'])),
      'nenhum schema de avaliação ou produto inventado',
    );
    lei(
      !blocos.some((b) => b['@type'] === 'Service'),
      'a home não emite Service — isso fica nas landings',
    );

    // ------------------------------------------------------------- rotas --
    console.log('\n=== ROTAS ===');
    for (const rota of [
      '/robots.txt',
      '/sitemap.xml',
      '/manifest.webmanifest',
      '/icon.svg',
      '/apple-icon.png',
    ]) {
      const r = await fetch(`${url}${rota}`);
      lei(r.ok, `${rota} responde`, String(r.status));
    }

    const robots = await (await fetch(`${url}/robots.txt`)).text();
    lei(
      /Sitemap:\s*https:\/\/tech\.navite\.com\.br\/sitemap\.xml/i.test(robots),
      'robots.txt declara o sitemap absoluto',
    );
    lei(/Disallow: \/contato\/estados/.test(robots), 'a rota de diagnóstico fica fora do rastreio');

    const mapa = await (await fetch(`${url}/sitemap.xml`)).text();
    const locs = [...mapa.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    const esperadas = [
      'https://tech.navite.com.br',
      'https://tech.navite.com.br/desenvolvimento-de-software',
      'https://tech.navite.com.br/criacao-de-sites',
      'https://tech.navite.com.br/automacao-e-integracoes',
      'https://tech.navite.com.br/inteligencia-artificial',
    ];
    lei(
      locs.length === esperadas.length,
      `sitemap tem ${esperadas.length} URLs públicas`,
      `${locs.length}`,
    );
    lei(
      esperadas.every((e) => locs.includes(e)),
      'e as cinco locs batem com as rotas públicas',
      locs.filter((l) => !esperadas.includes(l)).join(' '),
    );

    lei(
      canonical?.valor === esperadas[0] && ogUrl?.valor === esperadas[0],
      'canonical e og:url da home iguais ao loc da home',
      `${canonical?.valor} | ${ogUrl?.valor}`,
    );

    console.log('\n=== LANDINGS ===');
    for (const loc of esperadas.slice(1)) {
      const path = new URL(loc).pathname;
      await navigate(`${url}${path}`, 2000);
      await sleep(200);
      const lp = await evaluate(CABECA);
      const can = lp.tags.find((t) => t.nome === 'canonical')?.valor;
      const og = lp.tags.find((t) => t.nome === 'og:url')?.valor;
      const titulo = lp.tags.find((t) => t.tag === 'title')?.valor ?? '';
      lei(can === loc, `canonical próprio em ${path}`, can ?? '—');
      lei(og === loc, `og:url próprio em ${path}`, og ?? '—');
      lei(
        !!lp.tags.find((t) => t.nome === 'og:image')?.valor,
        `og:image em ${path}`,
        lp.tags.find((t) => t.nome === 'og:image')?.valor ?? '—',
      );
      lei(
        titulo.includes('Navite Tech') && !titulo.startsWith('Navite Tech — Tecnologia'),
        `title de serviço em ${path}`,
        titulo,
      );
      lei(can !== esperadas[0], `não herda canonical da home (${path})`);
      const ld = lp.ld.map((t) => JSON.parse(t));
      lei(
        ld.some((b) => b['@type'] === 'Service'),
        `Service schema em ${path}`,
      );
      lei(
        ld.some((b) => b['@type'] === 'BreadcrumbList'),
        `BreadcrumbList em ${path}`,
      );
      lei(
        !ld.some((b) => ['Review', 'AggregateRating', 'LocalBusiness'].includes(b['@type'])),
        `sem review/local inventado em ${path}`,
      );
    }

    /*
     * O navegador pede `/favicon.ico` sozinho quando o documento não declara
     * ícone nenhum, e o 404 resultante aparece no console e derruba a nota de
     * Boas Práticas do Lighthouse — foi exatamente o que aconteceu antes dos
     * ícones existirem: 96 em vez de 100, por um arquivo que ninguém vê.
     *
     * A lei não exige que `/favicon.ico` exista; exige que haja `<link
     * rel="icon">`, que é o que impede o pedido automático.
     */
    lei(
      h.tags.some((t) => t.nome === 'icon'),
      'há <link rel=icon>, então o navegador não pede /favicon.ico',
    );

    console.log(`\n${leis - falhas}/${leis} leis passam`);
    if (falhas) {
      console.log(`${falhas} FALHA(S)`);
      process.exitCode = 1;
    }
  },
  { port: Number(argv.port ?? 9590), profile: '.shots/.chrome-seo' },
);
