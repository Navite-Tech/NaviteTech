import gsap from 'gsap';
import type { Boundaries } from '@/lib/scroll/boundaries';
import * as track from '@/lib/scroll/track';
import {
  BAIXA_QUERY,
  CTA_BAIXA,
  MOBILE_QUERY,
  MOBILE_STATES,
  MOBILE_TRACK,
  REDUCED_QUERY,
  REDUCED_TRACK,
  SYMBOL_STATES,
  SYMBOL_TRACK,
  type HalfState,
  type SymbolState,
  type SymbolStateName,
} from './states';

/**
 * O ÚNICO escritor do símbolo.
 *
 * Nenhuma timeline toca `#sym-left` ou `#sym-right`. Elas informam um progresso;
 * quem escreve é este módulo, e só ele. Isso elimina de uma vez a classe de bug
 * mais comum nesse tipo de efeito — duas animações disputando o mesmo nó — e é o
 * que permite prometer continuidade em vez de torcer por ela.
 *
 * Só `transform` e `opacity` são escritos. Nada de layout, nada de filtro.
 */

export type SymbolNodes = {
  left: HTMLElement;
  right: HTMLElement;
  shadows: HTMLElement[];
};

/**
 * Um trecho já resolvido em pixels de documento.
 *
 * A resolução em si mora em `lib/scroll/track.ts`, compartilhada com o campo de
 * cubos: os dois são objetos persistentes cuja posição é uma tabela de
 * estados-chave ancorados em fração de seção, e duas cópias dessa aritmética
 * seriam duas oportunidades de divergirem.
 */
export type Segment = track.Segment<SymbolState>;

/**
 * Passo de quantização da escala.
 *
 * `translate` é gratuito: o compositor move a textura pronta. Já qualquer
 * mudança de ESCALA obriga o navegador a rasterizar o SVG de novo, e o relevo
 * tem quatro camadas de pintura — medido, isso custa ~15ms por quadro durante as
 * transições, contra ~0 nas esperas, onde a escala não muda.
 *
 * Arredondar a escala para passos de 0,5% reduz o número de rasterizações à
 * metade sem consequência visível: num símbolo de 475px, 0,5% são 2,4px de
 * largura, dentro do próprio antialiasing da peça. A POSIÇÃO continua contínua —
 * só o tamanho anda em degraus finos.
 */
const SCALE_STEP = 0.005;

const lerp = track.lerp;

function lerpHalf(a: HalfState, b: HalfState, t: number): HalfState {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    scale: lerp(a.scale, b.scale, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

function lerpState(a: SymbolState, b: SymbolState, t: number): SymbolState {
  return {
    left: lerpHalf(a.left, b.left, t),
    right: lerpHalf(a.right, b.right, t),
    shadow: lerp(a.shadow, b.shadow, t),
  };
}

/**
 * Abaixo de 900px vale a trilha do §12 — duas poses, não dez.
 *
 * A consulta é feita a cada `remeasure()`, e não uma vez na montagem: girar o
 * aparelho atravessa os 900px, e o refresh do ScrollTrigger que vem junto já é
 * o momento em que tudo é remedido. Um `matchMedia` do GSAP por faixa também
 * resolveria, mas duplicaria o gatilho e a coreografia passaria a ter dois
 * escritores em potencial — exatamente o que a arquitetura existe para impedir.
 */
function combina(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}

function ehMobile(): boolean {
  return combina(MOBILE_QUERY);
}

/**
 * Os estados do desktop, com o CTA da tela baixa por cima quando for o caso.
 *
 * O espalhamento sobrescreve as três chaves do CTA e deixa as outras sete
 * intactas — a trilha continua sendo uma só, e nenhum quadro-chave precisa
 * saber que existe uma variante.
 */
function estadosDesktop(): Record<SymbolStateName, SymbolState> {
  return combina(BAIXA_QUERY) ? { ...SYMBOL_STATES, ...CTA_BAIXA } : SYMBOL_STATES;
}

/** Pose de repouso da faixa atual — o que vale fora de qualquer trecho. */
export function baseState(): SymbolState {
  return ehMobile() ? MOBILE_STATES.mobileFechado : SYMBOL_STATES.hero;
}

/**
 * Resolve a trilha do símbolo em trechos com fronteiras em pixel.
 *
 * Três desenhos, e a ordem da escolha importa: a LARGURA vence o movimento.
 *
 * Abaixo de 900px vale a trilha do mobile mesmo com movimento reduzido, porque
 * ali a peça é marca d'água centrada atrás do conteúdo — e isso é uma decisão
 * de composição, tomada em CSS pelo tamanho e pela opacidade do palco. Usar as
 * poses do desktop sobre esse layout punha a peça a 66,65vw, deslocada para a
 * direita, sobre uma coluna de texto que ocupa a largura toda.
 *
 * A trilha do mobile já ancora no topo de cada seção, então ela funciona nas
 * duas condições: com movimento pleno o escritor interpola entre as poses, com
 * movimento reduzido `snapAt` degrau nelas. Nada precisa ser dito duas vezes.
 */
export function resolveTrack(boundaries: Boundaries, viewportHeight: number): Segment[] {
  if (ehMobile()) {
    return track.resolveTrack(MOBILE_TRACK, MOBILE_STATES, boundaries, viewportHeight);
  }
  if (combina(REDUCED_QUERY)) {
    return track.resolveTrack(REDUCED_TRACK, estadosDesktop(), boundaries, viewportHeight);
  }
  return track.resolveTrack(SYMBOL_TRACK, estadosDesktop(), boundaries, viewportHeight);
}

/** Estado do símbolo numa posição de rolagem, em pixels de documento. */
export function stateAt(segments: Segment[], y: number): SymbolState {
  return track.stateAt(segments, y, lerpState, baseState());
}

/**
 * Cria o escritor. `measure()` precisa ser chamado antes do primeiro `write()` e
 * de novo a cada refresh — ele guarda o tamanho da viewport e o lado do símbolo,
 * que é lido do CSS (`--symbol-size`) para que a regra responsiva viva em um
 * lugar só.
 */
export function createWriter(nodes: SymbolNodes) {
  /**
   * `scale` é atalho do CSSPlugin e o `quickSetter` NÃO o resolve — escrever
   * nele não produz efeito nenhum, silenciosamente. `scaleX`/`scaleY` são as
   * propriedades reais do objeto de transform que o GSAP mantém.
   */
  const half = (el: HTMLElement) => ({
    x: gsap.quickSetter(el, 'x', 'px'),
    y: gsap.quickSetter(el, 'y', 'px'),
    scaleX: gsap.quickSetter(el, 'scaleX'),
    scaleY: gsap.quickSetter(el, 'scaleY'),
    opacity: gsap.quickSetter(el, 'opacity'),
  });
  const setters = { left: half(nodes.left), right: half(nodes.right) };
  const shadow = nodes.shadows.map((el) => gsap.quickSetter(el, 'opacity'));

  let vw = 0;
  let vh = 0;
  let side = 0;

  function measure() {
    /*
     * `clientWidth` do <html>, não `innerWidth`: com `scrollbar-gutter: stable`
     * a calha fica reservada e as unidades `vw` do CSS a excluem, enquanto
     * `innerWidth` a inclui. São ~15px de diferença — o bastante para o símbolo
     * dar um pulinho no instante em que o JS assume do CSS.
     */
    vw = document.documentElement.clientWidth;
    vh = document.documentElement.clientHeight;
    // O tamanho base vem do CSS, não de uma cópia da fórmula aqui.
    side = nodes.left.offsetWidth;
  }

  function writeHalf(target: 'left' | 'right', s: HalfState) {
    const set = setters[target];
    // O nó está ancorado com o CENTRO na origem do palco (ver stage.module.css),
    // então basta levar o centro até a posição — sem `-50%` nem margem negativa
    // dependendo da escala.
    set.x((s.x / 100) * vw);
    set.y((s.y / 100) * vh);
    const q = Math.round(s.scale / SCALE_STEP) * SCALE_STEP;
    set.scaleX(q);
    set.scaleY(q);
    set.opacity(s.opacity);
  }

  function write(state: SymbolState) {
    writeHalf('left', state.left);
    writeHalf('right', state.right);
    for (const set of shadow) set(state.shadow);
  }

  return {
    measure,
    write,
    /** Exposto só para diagnóstico; nada da aplicação depende disto. */
    get metrics() {
      return { vw, vh, side };
    },
  };
}

/**
 * O estado-chave mais próximo, sem interpolar.
 *
 * É o que `prefers-reduced-motion` usa: a narrativa `( ) → ( → ( )` continua
 * legível em estados discretos, com uma transição curta de CSS entre eles, mas
 * nada fica preso ao dedo do usuário.
 */
export function snapAt(segments: Segment[], y: number): SymbolState {
  return track.snapAt(segments, y, baseState());
}
