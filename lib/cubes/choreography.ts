import gsap from 'gsap';
import type { Boundaries } from '@/lib/scroll/boundaries';
import * as track from '@/lib/scroll/track';
import { PLANES } from '@/lib/content/cube-field';
import { ENCOLHE, FIELD_STATES, FIELD_TRACK, REDUCED_FIELD_TRACK, type FieldState } from './states';

/**
 * O ÚNICO escritor do campo de cubos.
 *
 * Até a Fase 8 quem escrevia era `SectionProgress`, dentro da seção Problema —
 * e funcionava enquanto o campo pertencia a uma seção só. O §11 pede as MESMAS
 * instâncias convergindo no Processo, três seções adiante; um escritor preso à
 * primeira delas não tem como fazer isso. O campo subiu para uma camada de
 * página, como o símbolo, e ganhou o escritor que uma camada de página exige.
 *
 * São ONZE escritas por quadro para 168 cubos:
 *   • `--t`, `--py` e `--f` em cada um dos três planos — nascimento, parallax
 *     e presença, por uma transformação de grupo em vez de 168;
 *   • `--fade` e `--d` no palco, que são diagnóstico e herança.
 *
 * NENHUM CUBO É TOCADO INDIVIDUALMENTE, e depois da Fase 15 nenhum cubo sequer
 * lê a rolagem: a dissolução acontece inteira no plano. Até a 14 cada uma das
 * 168 unidades reconstruía em `calc`, por quadro, o destino dentro de uma
 * retícula e o próprio fator de escala. Isso saiu junto com os clusters.
 */

export type Segment = track.Segment<FieldState>;

export type FieldNodes = {
  /** O palco. Recebe `--fade` e `--d`. */
  stage: HTMLElement;
  /** Os três planos de profundidade, na ordem de PLANES. */
  planes: HTMLElement[];
};

const lerp = track.lerp;

function lerpField(a: FieldState, b: FieldState, t: number): FieldState {
  return {
    nasce: lerp(a.nasce, b.nasce, t),
    dissolve: lerp(a.dissolve, b.dissolve, t),
    fade: lerp(a.fade, b.fade, t),
    py: lerp(a.py, b.py, t),
  };
}

/**
 * Resolve a trilha do campo em trechos com fronteiras em pixel.
 *
 * Sob movimento reduzido vale a trilha discreta — ver a nota longa em
 * `states.ts`. A consulta é feita a cada refresh, e não uma vez na montagem,
 * pelo mesmo motivo da coreografia do símbolo.
 */
export function resolveTrack(boundaries: Boundaries, viewportHeight: number): Segment[] {
  const reduzido =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return track.resolveTrack(
    reduzido ? REDUCED_FIELD_TRACK : FIELD_TRACK,
    FIELD_STATES,
    boundaries,
    viewportHeight,
  );
}

export function stateAt(segments: Segment[], y: number): FieldState {
  return track.stateAt(segments, y, lerpField, FIELD_STATES.ausente);
}

export function snapAt(segments: Segment[], y: number): FieldState {
  return track.snapAt(segments, y, FIELD_STATES.ausente);
}

/**
 * Cria o escritor.
 *
 * O nascimento de cada plano é derivado AQUI, e não no CSS, porque a curva é
 * `power2.out` sobre uma janela própria por plano — as duas coisas que `calc`
 * não faz. É o mesmo cálculo da Fase 6, com `nasce` no lugar do progresso da
 * seção; os números de nascimento em `lib/content/cube-field.ts` não mudaram.
 *
 * A DISSOLUÇÃO usa exatamente a mesma máquina, com a janela `some` de cada
 * plano e uma curva `power2.inOut` — que entra e sai macia, enquanto a do
 * nascimento só sai. Um plano que começa a sumir de repente denuncia a
 * mecânica; um que afina e depois assenta em zero, não.
 */
export function createWriter(nodes: FieldNodes) {
  const saida = gsap.parseEase('power2.out');
  const suave = gsap.parseEase('power2.inOut');

  const planos = PLANES.map((p, i) => ({ ...p, el: nodes.planes[i] })).filter(
    (p): p is (typeof PLANES)[number] & { el: HTMLElement } => p.el !== undefined,
  );

  function write(s: FieldState) {
    for (const g of planos) {
      const bruto = (s.nasce - g.from) / (g.to - g.from);
      const t = bruto <= 0 ? 0 : bruto >= 1 ? 1 : saida(bruto);

      const cru = (s.dissolve - g.some.from) / (g.some.to - g.some.from);
      const d = cru <= 0 ? 0 : cru >= 1 ? 1 : suave(cru);

      /* o encolhimento entra na escala do grupo: nenhuma propriedade nova */
      g.el.style.setProperty('--t', (t * (1 - ENCOLHE * d)).toFixed(4));
      g.el.style.setProperty('--py', `${(g.parallax * s.py).toFixed(2)}px`);
      g.el.style.setProperty('--f', (s.fade * (1 - d)).toFixed(3));
    }
    nodes.stage.style.setProperty('--fade', s.fade.toFixed(3));
    nodes.stage.style.setProperty('--d', s.dissolve.toFixed(4));
  }

  return { write };
}
