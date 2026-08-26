import { Fragment } from 'react';
import Link from 'next/link';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Rule } from '@/components/ui/Rule';
import { PillButton } from '@/components/ui/PillButton';
import { FaqList } from '@/components/sections/FaqList';
import type { PaginaServico } from '@/lib/content/servicos-pages';
import { PAGINAS_SERVICO } from '@/lib/content/servicos-pages';
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  serializar,
  serviceJsonLd,
  webPageJsonLd,
} from '@/lib/seo/jsonld';
import styles from './ServiceLanding.module.css';

type Props = { pagina: PaginaServico };

function blocosLd(pagina: PaginaServico): string[] {
  const nome = `${pagina.title} — Navite Tech`;
  const blocos = [
    webPageJsonLd({ path: pagina.path, name: nome, description: pagina.description }),
    breadcrumbJsonLd({ path: pagina.path, name: pagina.title }),
    serviceJsonLd({ name: pagina.schemaName, description: pagina.description }),
    organizationJsonLd(),
    pagina.faq.length > 0 ? faqJsonLd(pagina.faq) : null,
  ];
  return blocos.filter((b): b is NonNullable<typeof b> => b !== null).map(serializar);
}

export function ServiceLanding({ pagina }: Props) {
  const outras = PAGINAS_SERVICO.filter((p) => p.path !== pagina.path);

  return (
    <>
      {blocosLd(pagina).map((json, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
      ))}

      <main id="conteudo" tabIndex={-1} className={styles.root}>
        <header className={styles.hero}>
          <Eyebrow>{pagina.eyebrow}</Eyebrow>
          <h1 id="titulo" className={`title ${styles.h1}`}>
            {pagina.h1.map((linha, i) => (
              <Fragment key={linha}>
                {i > 0 && <br />}
                {i === pagina.h1.length - 1 ? (
                  <span className="u-editorial-accent">{linha}</span>
                ) : (
                  linha
                )}
              </Fragment>
            ))}
          </h1>
          <Rule className={styles.rule} />
          <p className={`lead ${styles.lead}`}>{pagina.lead}</p>
          <PillButton href="/#contato">Conte o problema</PillButton>
        </header>

        <section className={styles.bloco} aria-labelledby="problema-titulo">
          <h2 id="problema-titulo" className="subtitle">
            {pagina.problema.titulo.map((linha, i) => (
              <Fragment key={linha}>
                {i > 0 && <br />}
                {i === 1 ? <span className="u-editorial-accent">{linha}</span> : linha}
              </Fragment>
            ))}
          </h2>
          {pagina.problema.corpo.map((p) => (
            <p key={p} className={styles.corpo}>
              {p}
            </p>
          ))}
        </section>

        <section className={styles.bloco} aria-labelledby="oferece-titulo">
          <h2 id="oferece-titulo" className="subtitle">
            {pagina.oferece.titulo.map((linha, i) => (
              <Fragment key={linha}>
                {i > 0 && ' '}
                {i === 1 ? <span className="u-editorial-accent">{linha}</span> : linha}
              </Fragment>
            ))}
          </h2>
          <p className={styles.corpo}>{pagina.oferece.intro}</p>
          <ul className={styles.lista}>
            {pagina.oferece.itens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {pagina.extra && (
          <section className={styles.bloco} aria-labelledby="extra-titulo">
            <h2 id="extra-titulo" className="subtitle">
              {pagina.extra.titulo.map((linha, i) => (
                <Fragment key={linha}>
                  {i > 0 && ' '}
                  {i === 1 ? <span className="u-editorial-accent">{linha}</span> : linha}
                </Fragment>
              ))}
            </h2>
            {pagina.extra.corpo.map((p) => (
              <p key={p} className={styles.corpo}>
                {p}
              </p>
            ))}
            {pagina.path !== '/inteligencia-artificial' && (
              <p className={styles.corpo}>
                <Link href="/inteligencia-artificial">IA aplicada ao negócio</Link>
              </p>
            )}
          </section>
        )}

        <section className={styles.bloco} aria-labelledby="criterio-titulo">
          <h2 id="criterio-titulo" className="subtitle">
            {pagina.criterio.titulo.map((linha, i) => (
              <Fragment key={linha}>
                {i > 0 && <br />}
                {i === 1 ? <span className="u-editorial-accent">{linha}</span> : linha}
              </Fragment>
            ))}
          </h2>
          <div className={styles.criterio}>
            <div>
              <p className={`micro ${styles.rotulo}`}>Vale</p>
              <ul className={styles.lista}>
                {pagina.criterio.vale.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className={`micro ${styles.rotulo}`}>Não vale</p>
              <ul className={styles.lista}>
                {pagina.criterio.naoVale.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.bloco} aria-labelledby="metodo-titulo">
          <h2 id="metodo-titulo" className="subtitle">
            Do problema <span className="u-editorial-accent">ao que funciona.</span>
          </h2>
          <p className={styles.corpo}>{pagina.metodo}</p>
          <p className={styles.corpo}>
            <Link href="/#processo">O método completo está na home.</Link>
          </p>
        </section>

        {pagina.geo && (
          <section className={styles.bloco} aria-labelledby="onde-titulo">
            <h2 id="onde-titulo" className="subtitle">
              Onde <span className="u-editorial-accent">estamos.</span>
            </h2>
            <p className={styles.corpo}>{pagina.geo}</p>
          </section>
        )}

        {pagina.faq.length > 0 && (
          <section className={styles.bloco} aria-labelledby="faq-titulo">
            <h2 id="faq-titulo" className="subtitle">
              Antes de começar,{' '}
              <span className="u-editorial-accent">o que costumam perguntar.</span>
            </h2>
            <FaqList itens={pagina.faq} />
          </section>
        )}

        <section className={styles.cta} aria-labelledby="cta-titulo">
          <h2 id="cta-titulo" className="subtitle">
            Conte o <span className="u-editorial-accent">problema.</span>
          </h2>
          <p className={styles.corpo}>Comece pelo que está travando. O caminho é a nossa parte.</p>
          <PillButton href="/#contato">Conte o problema</PillButton>
        </section>

        <nav className={styles.outras} aria-label="Outros serviços">
          <p className="micro">Também construímos</p>
          <ul>
            {outras.map((p) => (
              <li key={p.path}>
                <Link href={p.path}>{p.navLabel}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </>
  );
}
