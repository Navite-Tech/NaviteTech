import { SYMBOL_VIEWBOX } from '@/lib/symbol/geometry';
import styles from './symbol.module.css';

type Props = {
  side: 'left' | 'right';
  className?: string;
};

/**
 * Uma metade do símbolo, com as quatro camadas do relevo sintético:
 *
 *   1. parede de extrusão — a região varrida pelo contorno ao deslizar no
 *      sentido do ponto de vista, pintada atrás da face; é o que dá espessura
 *   2. face frontal — gradiente na direção da luz
 *   3. grão — tile em `multiply`, bem discreto
 *   4. highlight de aresta — traço fino cuja cor é um gradiente com opacidade,
 *      o que revela a aresta só do lado voltado para a luz
 *
 * São quatro `<use>` de duas geometrias definidas uma única vez em SymbolDefs.
 * Quatro operações de pintura, não dezenove: o número de operações é o que
 * determina o custo de rasterizar a peça quando a escala muda, e a escala muda
 * durante a página inteira.
 *
 * As duas metades usam o MESMO viewBox de 1000×1000 e ficam concêntricas, então
 * na posição de repouso compõem o símbolo completo sem nenhum ajuste. A metade
 * direita referencia o contorno pré-rotacionado (ver lib/symbol/geometry.ts)
 * para que a luz continue vindo do mesmo lado nas duas.
 */
export function SymbolHalf({ side, className }: Props) {
  const face = `#navite-crescent-${side}`;

  return (
    <svg
      className={[styles.half, className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${SYMBOL_VIEWBOX} ${SYMBOL_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
    >
      {/*
        `data-layer` é o gancho estável para inspeção e para isolar camadas na
        página de conferência — nomes de classe de CSS module são hasheados e
        não podem ser alcançados de fora.
      */}
      <use
        data-layer="extrude"
        href={`#navite-wall-${side}`}
        fill={`url(#navite-extrude-${side})`}
      />
      <use data-layer="face" href={face} fill={`url(#navite-face-${side})`} />
      <use data-layer="grain" className={styles.grain} href={face} />
      <use
        data-layer="edge"
        className={styles.edge}
        href={face}
        stroke={`url(#navite-edge-ramp-${side})`}
      />
    </svg>
  );
}
