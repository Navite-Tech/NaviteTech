import type { Metadata } from 'next';
import { SymbolDefs } from '@/components/symbol/SymbolDefs';
import { SymbolMark } from '@/components/symbol/SymbolMark';
import { SymbolHalf } from '@/components/symbol/SymbolHalf';
import { Eyebrow } from '@/components/ui/Eyebrow';
import styles from './simbolo.module.css';

/** Página de conferência do relevo do símbolo. Fora dos buscadores. */
export const metadata: Metadata = {
  title: 'Relevo do símbolo',
  robots: { index: false, follow: false },
};

export default function SimboloPage() {
  return (
    <main id="conteudo" className={styles.root}>
      <SymbolDefs />

      <header className={styles.head}>
        <Eyebrow>Referência interna</Eyebrow>
        <h1 className="title">Relevo do símbolo</h1>
        <p className="lead">
          Quatro camadas de pintura estática: parede de extrusão (varredura pré-calculada), face com
          gradiente na direção da luz, grão do material e highlight de aresta mascarado. Nenhum
          filtro SVG — eles re-rasterizam a cada mudança de escala.
        </p>
      </header>

      <section className={styles.block}>
        <h2 className={styles.h}>Símbolo completo sobre o fundo do site</h2>
        <div className={styles.stage}>
          <SymbolMark className={styles.big} />
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h}>Camada por camada</h2>
        <div className={styles.layers}>
          <figure className={styles.layer}>
            <div className={`${styles.cell} ${styles.onlyExtrude}`}>
              <SymbolHalf side="left" />
            </div>
            <figcaption>1 · parede de extrusão</figcaption>
          </figure>
          <figure className={styles.layer}>
            <div className={`${styles.cell} ${styles.onlyFace}`}>
              <SymbolHalf side="left" />
            </div>
            <figcaption>2 · face com gradiente</figcaption>
          </figure>
          <figure className={styles.layer}>
            <div className={`${styles.cell} ${styles.onlyGrain}`}>
              <SymbolHalf side="left" />
            </div>
            <figcaption>3 · grão do material</figcaption>
          </figure>
          <figure className={styles.layer}>
            <div className={`${styles.cell} ${styles.onlyEdge}`}>
              <SymbolHalf side="left" />
            </div>
            <figcaption>4 · highlight de aresta</figcaption>
          </figure>
          <figure className={styles.layer}>
            <div className={styles.cell}>
              <SymbolHalf side="left" />
            </div>
            <figcaption>as quatro somadas</figcaption>
          </figure>
          <figure className={styles.layer}>
            <div className={styles.cell}>
              <SymbolHalf side="right" />
            </div>
            <figcaption>metade direita — mesma luz, âncora própria</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h}>Nitidez em escala</h2>
        <p className={styles.note}>
          O mesmo vetor em quatro tamanhos. Sem rasterização intermediária: a ponta continua uma
          cúspide e o corte reto continua reto em qualquer escala.
        </p>
        <div className={styles.scales}>
          {[64, 128, 260, 520].map((s) => (
            <figure key={s} className={styles.scaleItem} style={{ inlineSize: `${s}px` }}>
              <SymbolMark shadow={false} />
              <figcaption className={styles.scaleLabel}>{s}px</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
