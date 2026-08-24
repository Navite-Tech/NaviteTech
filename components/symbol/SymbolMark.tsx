import { SymbolHalf } from './SymbolHalf';
import styles from './symbol.module.css';

type Props = {
  className?: string;
  /** Oculta a sombra de contato — útil quando o símbolo não "apoia" em nada. */
  shadow?: boolean;
};

/**
 * O símbolo completo `( )` em repouso: as duas metades concêntricas.
 *
 * Na Fase 4 as metades passam a ser posicionadas individualmente pela camada
 * persistente; este componente é a composição estática de referência e o que o
 * hero usa antes da coreografia entrar.
 */
export function SymbolMark({ className, shadow = true }: Props) {
  return (
    <div className={[styles.mark, className].filter(Boolean).join(' ')} aria-hidden="true">
      {shadow && <span className={styles.shadow} />}
      <SymbolHalf side="left" />
      <SymbolHalf side="right" />
    </div>
  );
}
