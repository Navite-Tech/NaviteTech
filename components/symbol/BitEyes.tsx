'use client';

import { useEffect, useRef } from 'react';
import styles from './bit.module.css';

/** A escada de um olho: sobe (0,2) → (2,0) e desce simétrica. É bit.png. */
const ESCADA: readonly (readonly [number, number])[] = [
  [0, 2],
  [1, 1],
  [2, 0],
  [3, 1],
  [4, 2],
];

/**
 * O BIT — os olhos da marca, dentro do vão do `( )` reconstituído.
 *
 * É um easter egg, não um mascote. Não tem corpo, boca, contorno nem círculo em
 * volta: são os DOIS ARCOS PIXELADOS de `references/bit/bit.png`, cada um com
 * cinco células numa escada de 5x3, separados por uma célula. A mesma matéria
 * dos 168 cubos que atravessam a página, reduzida a dez quadrados.
 *
 * CAMADA INDEPENDENTE, e isso é uma exigência: ele não é filho das metades do
 * símbolo e não entra em transform nenhum do escritor da coreografia. A posição
 * dele deriva das MESMAS constantes que o estado `ctaClosed` usa
 * (lib/symbol/states.ts) — 50vw, 39,5vh e `--symbol-size` —, então o `( )`
 * continua sendo escrito por um só lugar e a geometria dele não muda por causa
 * daqui.
 *
 * DESVIO REGISTRADO: o centro geométrico do vão é ocupado pelo headline "Conte
 * o problema." — o bloco inteiro do contato é medido a partir do círculo (ver
 * app/page.module.css). Os olhos ficam centrados na horizontal e a 0,82 do raio
 * ACIMA do centro, na faixa vazia entre a borda de cima do vão e a primeira
 * linha do título. É o que faz a composição ler como um rosto olhando para a
 * mensagem, em vez de uma colisão; centrar na vertical exigiria recalcular a
 * medida do bloco e empurraria o formulário para cima das crescentes.
 */
export function BitEyes() {
  const raiz = useRef<HTMLDivElement>(null);

  /*
   * O olhar segue o cursor — 2px, no máximo.
   *
   * O limite não é timidez: é o que separa "espera, ele está olhando pra mim?"
   * de "tem um mascote animado no site". Dois pixels sobre um glifo de 41px são
   * 5% de deslocamento; o olho humano registra a mudança de direção sem
   * conseguir nomear o movimento.
   *
   * `pointermove` no documento, com um rAF de garganta: a escrita acontece uma
   * vez por quadro, no máximo, e são duas propriedades customizadas num
   * elemento — o mesmo orçamento de qualquer escritor desta página.
   *
   * Só sob `(pointer: fine)`: num aparelho de toque não há cursor para seguir, e
   * o ouvinte custaria sem entregar nada.
   */
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ALCANCE = 2;
    let pendente = false;
    let x = 0;
    let y = 0;

    const escrever = () => {
      pendente = false;
      const c = el.getBoundingClientRect();
      const dx = x - (c.left + c.width / 2);
      const dy = y - (c.top + c.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      // normalizado e depois amortecido: perto do olho o movimento é menor,
      // longe ele satura — é como um olho de verdade se comporta.
      const forca = Math.min(1, d / 420);
      el.style.setProperty('--bx', `${((dx / d) * ALCANCE * forca).toFixed(2)}px`);
      el.style.setProperty('--by', `${((dy / d) * ALCANCE * forca).toFixed(2)}px`);
    };

    const aoMover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(escrever);
    };

    document.addEventListener('pointermove', aoMover, { passive: true });
    return () => document.removeEventListener('pointermove', aoMover);
  }, []);

  return (
    <div ref={raiz} className={styles.bit} aria-hidden="true">
      <svg className={styles.olhos} viewBox="0 0 11 3" focusable="false">
        {/*
         * Dois arcos de cinco células. As coordenadas são as de bit.png: a
         * escada sobe (0,2) → (1,1) → (2,0) e desce simétrica, e o segundo olho
         * repete a mesma forma seis células adiante — uma de vão entre eles.
         *
         * 0,88 de lado com 0,06 de recuo: as células se tocam pelo vértice, sem
         * se fundir. É o que a ampliação da referência mostra.
         */}
        {[0, 6].flatMap((base) =>
          ESCADA.map(([cx, cy]) => (
            <rect
              key={`${base}-${cx}`}
              x={base + cx + 0.06}
              y={cy + 0.06}
              width={0.88}
              height={0.88}
            />
          )),
        )}
      </svg>
    </div>
  );
}
