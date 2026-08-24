import { CALLOUTS, BLUEPRINTS } from '@/lib/content/problema';
import { CUBE_FIELD } from '@/lib/content/cube-field';
import styles from './problema.module.css';

/** Coordenada do vão -> vw/vh. O mesmo referencial do campo de cubos. */
const vx = (u: number) => CUBE_FIELD.cx + u * CUBE_FIELD.halfW;
const vy = (v: number) => CUBE_FIELD.cy + v * CUBE_FIELD.halfH;

/**
 * Callouts, linhas-guia e retângulos de blueprint da seção Problema.
 *
 * Os quatro problemas são uma `<ul>` DE VERDADE, e é a MESMA lista no desktop e
 * no mobile: no desktop ela se solta em posição absoluta sobre o campo, no
 * mobile volta ao fluxo da coluna de texto. Duplicar a lista — uma posicionada
 * e outra em fluxo — faria o leitor de tela anunciar os quatro problemas duas
 * vezes.
 *
 * Por isso este componente é montado DENTRO do bloco de texto: `position:
 * absolute` resolve contra a `.viewport` presa da seção, que é o ancestral
 * posicionado, e não contra a coluna.
 *
 * As quatro linhas-guia vivem num `<svg>` só, esticado sobre a viewport com
 * `preserveAspectRatio="none"` e coordenadas em milésimos. É o que permite que
 * cada linha ligue um ponto ancorado na MARGEM a outro ancorado no ENXAME sem
 * duas tabelas de coordenadas: as duas pontas viram porcentagem da mesma caixa.
 * `non-scaling-stroke` impede que o esticamento engorde o traço.
 */
export function ProblemAnnotations() {
  return (
    <>
      <div className={styles.blueprints} aria-hidden="true">
        {BLUEPRINTS.map((b, i) => (
          <span
            key={i}
            className={styles.blueprint}
            style={{
              insetInlineStart: `${vx(b.u).toFixed(3)}vw`,
              insetBlockStart: `${vy(b.v).toFixed(3)}vh`,
              inlineSize: `${(b.w * CUBE_FIELD.halfW).toFixed(3)}vw`,
              blockSize: `${(b.h * CUBE_FIELD.halfH).toFixed(3)}vh`,
            }}
          />
        ))}
      </div>

      <svg
        className={styles.guias}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {CALLOUTS.map((c, i) => {
          /*
           * Uma ponta em coordenada de página, a outra no vão — e as duas viram
           * milésimos da mesma caixa, que é o que o viewBox esticado permite.
           */
          const y = vy(c.guia.v);
          const pontos: [number, number][] = [
            [c.guia.de, y],
            [vx(c.guia.ate), y],
            ...(c.guia.dobra
              ? ([[vx(c.guia.dobra.u), vy(c.guia.dobra.v)]] as [number, number][])
              : []),
          ];
          return (
            <polyline
              key={c.texto}
              className={styles.linha}
              style={{ '--i': i } as React.CSSProperties}
              points={pontos
                .map(([px, py]) => `${(px * 10).toFixed(1)},${(py * 10).toFixed(1)}`)
                .join(' ')}
              pathLength="1"
            />
          );
        })}
      </svg>

      <ul className={styles.callouts}>
        {CALLOUTS.map((c, i) => (
          <li
            key={c.texto}
            className={`${styles.callout} ${c.lado === 'dir' ? styles.dir : styles.esq}`}
            style={
              {
                insetInlineStart: `${c.x}vw`,
                insetBlockStart: `${vy(c.v).toFixed(3)}vh`,
                '--i': i,
              } as React.CSSProperties
            }
          >
            <span className={styles.marcador} aria-hidden="true" />
            <span className={styles.rotulo}>{c.texto}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
