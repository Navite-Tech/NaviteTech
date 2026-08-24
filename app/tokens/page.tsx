import type { Metadata } from 'next';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Rule } from '@/components/ui/Rule';
import { PillButton } from '@/components/ui/PillButton';
import { Wordmark } from '@/components/chrome/Wordmark';
import styles from './tokens.module.css';

/** Referência interna do design system. Fora dos buscadores e do sitemap. */
export const metadata: Metadata = {
  title: 'Design tokens',
  robots: { index: false, follow: false },
};

const SURFACES = [
  ['--navy-900', 'fundo dominante'],
  ['--navy-800', 'superfície de seção'],
  ['--navy-700', 'card / elevado'],
] as const;

const INK = [
  ['--bone', 'tipografia principal e símbolo'],
  ['--text-muted', 'corpo secundário'],
  ['--text-faint', 'legal e rótulos de apoio'],
] as const;

const ACCENTS = [
  ['--brass', 'institucional: wordmark TECH, micro-UI, indicadores, réguas, tags'],
  ['--sage', 'editorial: palavras destacadas em headline e momentos conceituais'],
] as const;

const SYMBOL = [
  ['--bone-lit', 'aresta iluminada do relevo'],
  ['--bone-dim', 'lado sombreado'],
  ['--extrude-mid', 'banda de extrusão'],
] as const;

function Swatch({ token, note }: { token: string; note: string }) {
  return (
    <li className={styles.swatch}>
      <span className={styles.chip} style={{ backgroundColor: `var(${token})` }} />
      <code className={styles.token}>{token}</code>
      <span className={styles.note}>{note}</span>
    </li>
  );
}

export default function TokensPage() {
  return (
    <main id="conteudo" tabIndex={-1} className={styles.root}>
      <header className={styles.head}>
        <Eyebrow>Referência interna</Eyebrow>
        <h1 className="title">Design tokens</h1>
        <Rule />
        <p className="lead">
          Valores medidos dos arquivos de referência aprovados. Esta página existe para conferência
          — não faz parte da narrativa do site.
        </p>
      </header>

      <section className={styles.block}>
        <h2 className={styles.h}>Cor</h2>
        <div className={styles.cols}>
          <div>
            <Eyebrow>Superfície</Eyebrow>
            <ul className={styles.list}>
              {SURFACES.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>Tipografia</Eyebrow>
            <ul className={styles.list}>
              {INK.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>Acentos — não intercambiáveis</Eyebrow>
            <ul className={styles.list}>
              {ACCENTS.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>Relevo do símbolo</Eyebrow>
            <ul className={styles.list}>
              {SYMBOL.map(([t, n]) => (
                <Swatch key={t} token={t} note={n} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h}>Escala tipográfica</h2>
        <div className={styles.type}>
          <p className={styles.spec}>display · 5,1vw · lh 0,95 · tracking -0,025em</p>
          <p className="display">
            Tecnologia para <span className="u-editorial-accent">funcionar melhor.</span>
          </p>

          <p className={styles.spec}>title · 3,6vw · lh 1,06</p>
          <p className="title">Antes da tecnologia, existe algo para entender.</p>

          <p className={styles.spec}>subtitle · 2,4vw · lh 1,18</p>
          <p className="subtitle">Web &amp; Experiências Digitais</p>

          <p className={styles.spec}>numeral · Jost 300 · tabular</p>
          <p className="numeral">01</p>

          <p className={styles.spec}>lead · 17px · lh 1,55</p>
          <p className="lead">
            Produtos digitais, sistemas e automações construídos a partir do problema — não da
            tecnologia.
          </p>

          <p className={styles.spec}>micro · Jost · 11px · tracking 0,18em</p>
          <p className="micro">O que construímos</p>
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h}>Componentes de chrome</h2>
        <div className={styles.chrome}>
          <div className={styles.demo}>
            <Eyebrow>Wordmark</Eyebrow>
            <Wordmark height={48} />
          </div>
          <div className={styles.demo}>
            <Eyebrow>Botão pílula</Eyebrow>
            <div className={styles.row}>
              <PillButton href="#">Conte o problema</PillButton>
              <PillButton href="#" variant="solid">
                Conte o problema
              </PillButton>
            </div>
          </div>
          <div className={styles.demo}>
            <Eyebrow>Régua</Eyebrow>
            <Rule />
          </div>
        </div>
      </section>
    </main>
  );
}
