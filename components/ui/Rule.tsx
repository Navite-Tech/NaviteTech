import styles from './Rule.module.css';

type Props = {
  /** Largura em px. Sem isto vale a medida da referência, que é fluida. */
  width?: number;
  className?: string;
};

/**
 * Régua curta — separador editorial recorrente nas referências.
 *
 * SAGE, não brass. O §9.2 do plano pede "régua brass de 55px", mas não existe
 * régua brass em nenhuma das três referências: no hero ela mede #9fa78c no
 * núcleo (g > r, que é sage), e no frame do problema as quatro réguas medem
 * entre #7a8265 e #818969 — todas sage. Ver lib/content/ambient.ts.
 *
 * Geometria medida no hero: 56×4px sobre 1672 de largura, sem arredondamento.
 * É uma barra curta e sólida, não um fio.
 */
export function Rule({ width, className }: Props) {
  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={width === undefined ? undefined : { inlineSize: `${width}px` }}
      aria-hidden="true"
    />
  );
}
