import { site } from '@/lib/config/site';
import Link from 'next/link';
import { Wordmark } from './Wordmark';
import { ORIGEM_GEO, PAGINAS_SERVICO } from '@/lib/content/servicos-pages';
import styles from './Footer.module.css';

/**
 * Rodapé.
 *
 * Dados institucionais vêm de lib/config/site.ts e saem CONDICIONALMENTE.
 * Os links de serviço são as quatro landings públicas — o mapa do site
 * visível, o mesmo conjunto do sitemap.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const hasContact = Boolean(site.email ?? site.phone);

  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" aria-label="Navite Tech — início">
            <Wordmark height={36} title={null} />
          </Link>
        </div>

        <nav className={styles.block} aria-label="Serviços">
          <ul className={styles.servicos}>
            {PAGINAS_SERVICO.map((pagina) => (
              <li key={pagina.path}>
                <Link href={pagina.path} className={styles.link}>
                  {pagina.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {hasContact && (
          <div className={styles.block}>
            {site.email && (
              <a href={`mailto:${site.email}`} className={styles.link}>
                {site.email}
              </a>
            )}
            {site.phone && (
              <a href={`tel:${site.phone.replace(/\s/g, '')}`} className={styles.link}>
                {site.phone}
              </a>
            )}
          </div>
        )}

        {site.social.length > 0 && (
          <ul className={styles.block}>
            {site.social.map((url) => (
              <li key={url}>
                <a href={url} className={styles.link} rel="me noreferrer" target="_blank">
                  {new URL(url).hostname.replace('www.', '')}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.origem}>{ORIGEM_GEO}</p>

        <p className={styles.legal}>
          {site.legalName ?? site.name}
          {site.taxId && <span className={styles.sep}>CNPJ {site.taxId}</span>}
          <span className={styles.sep}>© {year}</span>
        </p>
      </div>
    </footer>
  );
}
