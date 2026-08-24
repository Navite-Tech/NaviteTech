import styles from './services.module.css';

type Props = {
  total: number;
  /** Índice 0-based do card a que este indicador pertence. */
  ativo: number;
};

/**
 * Indicador de progresso da pilha: quatro traços no topo do card, o da vez em
 * brass (§10.3).
 *
 * O indicador é ESTÁTICO por card, e é isso que o sincroniza. Um indicador
 * único, escrito por quadro, teria de acompanhar qual card está à frente —
 * mais um escritor disputando o mesmo estado. Aqui cada card carrega o próprio,
 * então "o indicador mostra o card certo" não é algo a manter em sincronia: é a
 * mesma informação escrita uma vez.
 *
 * Medido em services-reference.png: quatro traços de 14×4px com vão de 7px,
 * assentados na linha de base do numeral. O ativo mede #c6c290 no pico (brass
 * clareado pelo render); os outros três resolvem como bone-dim a ~24%.
 */
export function ProgressTicks({ total, ativo }: Props) {
  return (
    <span className={styles.ticks} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={styles.tick}
          data-tick={i}
          data-ativo={i === ativo ? '' : undefined}
        />
      ))}
    </span>
  );
}
