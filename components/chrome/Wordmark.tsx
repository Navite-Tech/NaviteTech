import { NAVITE_PATHS, TECH_PATHS, WORDMARK_VIEWBOX } from '@/lib/brand/wordmark';
import styles from './Wordmark.module.css';

type Props = {
  /** Altura em px. A largura segue a proporção da arte (8,75 : 1 com o TECH). */
  height?: number;
  className?: string;
  /** Rótulo acessível. `null` quando um texto vizinho já nomeia a marca. */
  title?: string | null;
};

/**
 * Wordmark NAVITE / TECH.
 *
 * Inline (não <img>) para herdar os tokens de cor: NAVITE usa `currentColor`,
 * TECH usa `--brass`. Os paths são gerados por tools/build-wordmark.cjs a
 * partir do PNG aprovado — proporções, espaçamento e a hierarquia entre as
 * duas palavras vêm da medição, não de redesenho.
 */
export function Wordmark({ height = 46, className, title = 'Navite Tech' }: Props) {
  const width = (height * WORDMARK_VIEWBOX.w) / WORDMARK_VIEWBOX.h;
  return (
    <svg
      className={[styles.root, className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${WORDMARK_VIEWBOX.w} ${WORDMARK_VIEWBOX.h}`}
      width={width}
      height={height}
      role={title ? 'img' : 'presentation'}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        {NAVITE_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className={styles.tech}>
        {TECH_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
