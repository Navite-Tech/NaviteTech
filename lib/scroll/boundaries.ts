import { JOURNEY, type JourneyId } from './triggers';

/** Faixa de rolagem de uma seção, em pixels de documento. */
export type Boundary = { id: JourneyId; start: number; end: number };

export type Boundaries = {
  list: Boundary[];
  byId: Partial<Record<JourneyId, Boundary>>;
  /** Início e fim da jornada inteira. */
  start: number;
  end: number;
};

/**
 * Onde cada seção começa e termina, medido do DOM.
 *
 * ÚNICA fonte de fronteiras. A coreografia e os indicadores de seção leem daqui;
 * ninguém recalcula por conta própria. Remedido a cada `ScrollTrigger.refresh()`.
 *
 * Mede o elemento da seção direto porque o "pin" é `position: sticky` — não há
 * spacer injetado entre a seção e o fluxo, então `offsetHeight` já é o curso de
 * rolagem real. Ver a nota em lib/scroll/triggers.ts.
 */
export function measureBoundaries(doc: Document = document): Boundaries {
  const scrollY = window.scrollY;
  const list: Boundary[] = [];
  const byId: Partial<Record<JourneyId, Boundary>> = {};

  for (const section of JOURNEY) {
    const el = doc.getElementById(section.id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const b: Boundary = {
      id: section.id,
      start: rect.top + scrollY,
      end: rect.top + scrollY + el.offsetHeight,
    };
    list.push(b);
    byId[section.id] = b;
  }

  const first = list[0];
  const last = list[list.length - 1];
  return {
    list,
    byId,
    start: first ? first.start : 0,
    end: last ? last.end : 0,
  };
}

/**
 * Converte uma âncora `{ seção, fração }` em pixel de documento.
 *
 * A fração é do CURSO de rolagem da seção — `end - start - altura da viewport` —
 * e não da altura dela. Duas razões:
 *
 *   • `at: 1` passa a significar sempre a mesma coisa: o fim da seção alcançou o
 *     fim da tela. Numa seção sticky é exatamente o instante em que ela solta.
 *   • esse ponto é sempre ALCANÇÁVEL. Fracionando a altura, a última seção teria
 *     seu estado final além da rolagem máxima do documento, e o `( )` do CTA
 *     nunca fecharia.
 *
 * O preço é que toda seção precisa de `length > 1`; com exatamente uma tela o
 * curso é zero. `lib/scroll/triggers.ts` garante isso e `assertTravel` avisa.
 */
export function anchorToPixels(
  boundaries: Boundaries,
  section: JourneyId,
  at: number,
  viewportHeight: number,
): number | null {
  const b = boundaries.byId[section];
  if (!b) return null;
  return b.start + Math.max(0, b.end - b.start - viewportHeight) * at;
}

/**
 * Avisa, em desenvolvimento, sobre seções sem curso de rolagem — o defeito
 * silencioso em que âncoras diferentes caem no mesmo pixel e um trecho inteiro
 * da coreografia desaparece sem erro nenhum.
 */
export function assertTravel(boundaries: Boundaries, viewportHeight: number): string[] {
  return boundaries.list
    .filter((b) => b.end - b.start - viewportHeight < viewportHeight * 0.1)
    .map(
      (b) =>
        `seção "${b.id}" tem ${Math.round(b.end - b.start - viewportHeight)}px de curso: ` +
        'as âncoras da coreografia vão colapsar. Aumente `length` em lib/scroll/triggers.ts.',
    );
}
