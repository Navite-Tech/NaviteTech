import {
  INITIAL_STATE,
  MOBILE_INITIAL_STATE,
  MOBILE_QUERY,
  type HalfState,
} from '@/lib/symbol/states';
import { SymbolDefs } from './SymbolDefs';
import { SymbolHalf } from './SymbolHalf';
import { SymbolChoreography } from './SymbolChoreography';
import styles from './stage.module.css';

const SIDES = [{ side: 'left' }, { side: 'right' }] as const;

/**
 * A camada persistente — o coração da experiência.
 *
 * As duas metades do símbolo existem UMA vez em toda a página. Não há troca de
 * imagem entre seções, nem um símbolo por seção: há dois nós, montados aqui, que
 * atravessam a narrativa inteira. `( )` → `(` → `( )` é o MESMO objeto se
 * movendo, e isso é garantido por construção — não por posicionamento
 * coincidente.
 *
 * Componente de servidor: o SVG do relevo vai no HTML e o estado inicial é
 * aplicado por CSS. O hero fica correto e nítido antes de qualquer JavaScript de
 * animação chegar; `SymbolChoreography` só assume dali em diante.
 */
export function SymbolStage() {
  return (
    <div className={styles.stage} data-symbol-stage aria-hidden="true">
      <SymbolDefs />

      {/*
       * A pose inicial das duas metades, em CSS — as duas faixas.
       *
       * NADA aqui é estilo embutido, e a razão é medida. A primeira versão
       * desta fase punha a pose de desktop no atributo `style` e a de mobile
       * numa media query; propriedade personalizada embutida vence qualquer
       * regra de folha de estilo, então abaixo de 900px a media query nunca
       * pegava. Com o JS bloqueado, a peça ficava a 66,65vw em escala 1 — a
       * pose do desktop — e saltava 70px para o centro no primeiro quadro do
       * escritor.
       *
       * Gerando as duas regras aqui, a partir de states.ts, a especificidade
       * volta a ser normal e os números continuam existindo em um arquivo só
       * (§16). O escritor segue escrevendo `transform` embutido, que vence
       * isto — como deve ser, já que a partir do primeiro quadro ele é a
       * autoridade.
       */}
      <style>{posesIniciais()}</style>

      {/*
       * Envelope de entrada. Existe para que a peça possa surgir (escala
       * 0,96 → 1 e fade, 900ms) SEM que ninguém além da coreografia escreva nas
       * metades — a promessa de escritor único vale desde o primeiro quadro.
       * Ao fim da animação este nó volta à identidade e some do caminho.
       */}
      <div className={styles.entry}>
        {SIDES.map(({ side }) => (
          <div key={side} id={`sym-${side}`} data-symbol={side} className={styles.half}>
            <span className={styles.shadow} data-symbol-shadow />
            <SymbolHalf side={side} className={styles.svg} />
          </div>
        ))}
      </div>

      <SymbolChoreography />
    </div>
  );
}

/**
 * Estado inicial em CSS puro, nas mesmas unidades de states.ts.
 *
 * Sem isto o símbolo apareceria no canto superior esquerdo e saltaria para o
 * lugar quando o JS carregasse — um deslocamento visível justamente no elemento
 * mais importante da página.
 */
function pose(id: string, s: HalfState): string {
  return (
    `#${id}{` +
    `--sym-x:${s.x}vw;--sym-y:${s.y}vh;--sym-scale:${s.scale};--sym-opacity:${s.opacity}` +
    `}`
  );
}

/**
 * As duas poses iniciais, uma por faixa.
 *
 * Abaixo de 900px as metades partem CONCÊNTRICAS — o estado inicial é o `( )`
 * fechado (§12) —, mas a regra é emitida por metade mesmo assim: se um dia a
 * pose de partida deixar de ser simétrica, isto continua correto sem que
 * ninguém precise lembrar de mudá-lo.
 */
function posesIniciais(): string {
  const sombra = (o: number) => `[data-symbol-shadow]{opacity:${o}}`;
  return (
    pose('sym-left', INITIAL_STATE.left) +
    pose('sym-right', INITIAL_STATE.right) +
    sombra(INITIAL_STATE.shadow) +
    `@media ${MOBILE_QUERY}{` +
    pose('sym-left', MOBILE_INITIAL_STATE.left) +
    pose('sym-right', MOBILE_INITIAL_STATE.right) +
    sombra(MOBILE_INITIAL_STATE.shadow) +
    `}`
  );
}
