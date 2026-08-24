import gsap from 'gsap';
import { anchorToPixels, type Boundaries } from '@/lib/scroll/boundaries';
import type { JourneyId } from '@/lib/scroll/triggers';

/**
 * Trilhas ancoradas em fração de seção — a mecânica compartilhada pelo símbolo
 * (§7.3) e pelo campo de cubos (§11).
 *
 * Existe porque os dois são a MESMA ideia: um objeto persistente cuja posição é
 * uma tabela de estados-chave ancorados em `{ seção, fração }`, resolvida em
 * pixels de documento a cada refresh. Escrever essa resolução duas vezes seria
 * garantir que uma das duas divergisse — e a divergência apareceria como o
 * enxame chegando fora de hora ao vão, que é exatamente o defeito que a
 * arquitetura de escritor único existe para impedir.
 *
 * Este módulo NÃO escreve no DOM. Ele só diz qual estado vale em qual pixel.
 */

export type Keyframe<N extends string> = {
  section: JourneyId;
  /** 0 = topo da seção no topo da tela; 1 = fim do curso de rolagem dela. */
  at: number;
  state: N;
  /** Curva do trecho que CHEGA aqui. `none` mantém linear com a rolagem. */
  ease?: string;
};

/** Um trecho já resolvido em pixels de documento. */
export type Segment<S> = {
  start: number;
  end: number;
  from: S;
  to: S;
  ease: (t: number) => number;
};

/**
 * Resolve a trilha em trechos com fronteiras em pixel.
 *
 * Refeito a cada refresh. Se uma âncora sair fora de ordem — o que aconteceria
 * ao encurtar demais uma seção durante a calibragem de ritmo — o trecho é
 * descartado em vez de produzir interpolação ao contrário.
 */
export function resolveTrack<N extends string, S>(
  track: readonly Keyframe<N>[],
  states: Record<N, S>,
  boundaries: Boundaries,
  viewportHeight: number,
): Segment<S>[] {
  type Point = { px: number; state: S; ease: (t: number) => number };

  const points: Point[] = [];
  for (const k of track) {
    const px = anchorToPixels(boundaries, k.section, k.at, viewportHeight);
    if (px === null) continue;
    points.push({
      px,
      state: states[k.state],
      ease: gsap.parseEase(k.ease ?? 'power2.inOut') as (t: number) => number,
    });
  }

  const segments: Segment<S>[] = [];
  let prev = points[0];
  for (let i = 1; prev && i < points.length; i++) {
    const cur = points[i];
    if (!cur || cur.px <= prev.px) continue; // âncoras coincidentes ou invertidas
    segments.push({ start: prev.px, end: cur.px, from: prev.state, to: cur.state, ease: cur.ease });
    prev = cur;
  }
  return segments;
}

/** O trecho que contém `y`. */
function segmentAt<S>(segments: Segment<S>[], y: number): Segment<S> | null {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return null;
  if (y <= first.start || y >= last.end) return null;

  // Busca binária: a trilha tem poucas dezenas de trechos, mas isto roda a cada
  // quadro do scrub e não custa nada manter O(log n).
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (y < (segments[mid]?.end ?? Infinity)) hi = mid;
    else lo = mid + 1;
  }
  return segments[lo] ?? last;
}

/** Estado interpolado numa posição de rolagem, em pixels de documento. */
export function stateAt<S>(
  segments: Segment<S>[],
  y: number,
  lerp: (a: S, b: S, t: number) => S,
  fallback: S,
): S {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return fallback;
  if (y <= first.start) return first.from;
  if (y >= last.end) return last.to;

  const s = segmentAt(segments, y) ?? last;
  const t = (y - s.start) / (s.end - s.start);
  return lerp(s.from, s.to, s.ease(Math.min(1, Math.max(0, t))));
}

/**
 * O estado-chave em vigor, sem interpolar — o que `prefers-reduced-motion` usa.
 *
 * A troca acontece AO CHEGAR na âncora, não no meio do caminho até ela. É a
 * letra do §14: "o símbolo assume o estado-chave da seção ao entrar". Como as
 * trilhas discretas ancoram no topo de cada seção, isso significa que a peça
 * muda de pose exatamente quando o topo da seção alcança o topo da tela — um
 * degrau, com a transição de 300ms do CSS fazendo a ponte.
 *
 * A primeira versão trocava no ponto médio entre duas âncoras, o que punha a
 * mudança no meio da seção ANTERIOR: a peça já estava na pose de Serviços
 * enquanto o Problema ainda ocupava meia tela.
 */
export function snapAt<S>(segments: Segment<S>[], y: number, fallback: S): S {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return fallback;
  if (y <= first.start) return first.from;
  if (y >= last.end) return last.to;

  return (segmentAt(segments, y) ?? last).from;
}

/** Interpolação linear escalar, usada pelos dois escritores. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
