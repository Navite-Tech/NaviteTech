import { site } from '@/lib/config/site';
import { Wordmark } from './Wordmark';
import styles from './Footer.module.css';

/**
 * Rodapé.
 *
 * Todos os dados institucionais vêm de lib/config/site.ts e são emitidos
 * CONDICIONALMENTE: enquanto forem `null`, o bloco simplesmente não aparece.
 * Nada fictício entra no HTML — ver §21.3 do plano.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const hasContact = Boolean(site.email ?? site.phone);

  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Wordmark height={36} title={null} />
        </div>

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

        <p className={styles.legal}>
          {site.legalName ?? site.name}
          {site.taxId && <span className={styles.sep}>CNPJ {site.taxId}</span>}
          <span className={styles.sep}>© {year}</span>
        </p>
      </div>
    </footer>
  );
}
