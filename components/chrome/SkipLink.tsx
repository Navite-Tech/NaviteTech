import styles from './SkipLink.module.css';

/** Primeiro elemento focável da página. */
export function SkipLink() {
  return (
    <a href="#conteudo" className={styles.root}>
      Pular para o conteúdo
    </a>
  );
}
