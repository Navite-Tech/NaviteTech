import type { AmbientMark } from '@/lib/content/ambient';
import styles from './AmbientField.module.css';

type Props = {
  marks: readonly AmbientMark[];
  /**
   * Atrasa a entrada em segundos. No hero os marcadores entram por último,
   * depois do símbolo e do texto (§9.2).
   */
  delay?: number;
};

/**
 * Campo de ambientação de uma seção — quadrados, réguas, tiques e estrelas.
 *
 * Puramente decorativo: `aria-hidden` e sem eventos. As posições vêm de
 * `lib/content/ambient.ts` e nenhuma delas é escrita aqui.
 *
 * Cada marca recebe seu próprio atraso de entrada, escalonado pela ordem em que
 * aparece nos dados — que é a ordem de cima para baixo na tela. O escalonamento
 * fica no `style` porque é um índice, não um valor de design; o resto do
 * movimento vive no CSS.
 */
export function AmbientField({ marks, delay = 0 }: Props) {
  return (
    <div className={styles.field} aria-hidden="true">
      {marks.map((m, i) => {
        const vars = {
          '--x': `${m.x}%`,
          '--y': `${m.y}%`,
          '--i': i,
          '--delay': `${delay}s`,
        } as React.CSSProperties;
        const tier = m.tier === 2 ? styles.tier2 : undefined;

        switch (m.kind) {
          case 'square':
            return (
              <i
                key={i}
                className={[styles.mark, styles.square, tier].filter(Boolean).join(' ')}
                style={{ ...vars, '--size': `${m.size}vw` } as React.CSSProperties}
              />
            );

          case 'rule':
            return (
              <i
                key={i}
                className={[styles.mark, styles.rule, tier].filter(Boolean).join(' ')}
                style={
                  {
                    ...vars,
                    '--length': `${m.length}vw`,
                    '--size': `${m.cap}vw`,
                  } as React.CSSProperties
                }
              />
            );

          case 'tick':
            return (
              <i
                key={i}
                className={[styles.mark, styles.tick, tier].filter(Boolean).join(' ')}
                style={
                  {
                    ...vars,
                    '--length': `${m.length}vh`,
                    '--size': `${m.cap}vw`,
                    '--gap': `${m.gap}vh`,
                  } as React.CSSProperties
                }
              />
            );

          case 'sparkle':
            return (
              <i
                key={i}
                className={[styles.mark, styles.sparkle, tier].filter(Boolean).join(' ')}
                style={{ ...vars, '--w': `${m.w}vw`, '--h': `${m.h}vh` } as React.CSSProperties}
              />
            );
        }
      })}
    </div>
  );
}
