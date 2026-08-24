import Image from 'next/image';
import { PROCESS_STEPS } from '@/lib/content/process';
import styles from './process.module.css';

/**
 * A linha das quatro peças do Método — todas ao mesmo tempo.
 *
 * Componente de SERVIDOR: não anima nada e não lê a rolagem. A entrada
 * escalonada sai de `--reveal` em CSS, como tudo nesta página.
 *
 * O QUE ESTE COMPONENTE SUBSTITUIU. A Fase 15 tinha UM painel e quatro estados
 * empilhados nele, um visível por vez, trocando ao longo de 3,8 telas de
 * rolagem. Funcionava, e era o problema: com a mesma caixa dos cards de
 * Serviços, a mesma coluna de texto à esquerda e a mesma arte sangrando com o
 * texto na base, o Método virou o vizinho da seção anterior. Duas seções
 * seguidas contando a mesma coisa do mesmo jeito.
 *
 * Agora as quatro convivem como uma PRANCHA: quatro peças retrato lado a lado,
 * cada uma com o seu numeral no topo e a sua linha na base. O que as separa dos
 * cards de Serviços não é o conteúdo — é a forma: sem fio de brass em volta,
 * sem raio de canto de painel, razão 0,62 contra os 0,73..0,81 de lá, e o bloco
 * de texto centralizado ACIMA das quatro, em vez de coluna-legenda ao lado.
 *
 * CONTRATOS LIDOS DE FORA, e por isso preservados literalmente:
 *
 *   `data-no`           scripts/check-processo.mjs e check-a11y.mjs contam por ele
 *   `data-descricao`    a descrição, sem depender de posição no DOM
 *   classe `descricao`  check-a11y.mjs a alcança por `[class*="descricao"]`
 *
 * O `p:last-child` de que a Fase 15 dependia SAIU do instrumento junto com esta
 * reescrita: uma lei que quebra quando se acrescenta um elemento é uma lei que
 * mede posição, não conteúdo.
 */
export function ProcessStage() {
  return (
    <div className={styles.pecas}>
      {PROCESS_STEPS.map((etapa, i) => (
        <article
          key={etapa.numero}
          className={styles.peca}
          data-no={i}
          data-etapa={etapa.arte}
          style={
            {
              '--i': i,
              '--arte-pos': etapa.enquadramento,
              '--veu-topo': etapa.veuTopo,
              '--veu-base': etapa.veuBase,
            } as React.CSSProperties
          }
        >
          {/*
           * `alt=""` e o slot fora da árvore acessível: a arte é ILUSTRAÇÃO. O
           * que ela mostra já está dito no título e na descrição da etapa.
           *
           * `lazy` nas QUATRO, e isto mudou na Fase 16. Antes a 01 era `eager`
           * porque entrava no mesmo instante em que a seção assumia a tela, sem
           * folga de rolagem para o observador de proximidade agir. Agora nada
           * está deslocado por transform: as quatro peças ocupam a caixa final
           * desde o início e o observador dispara quando a seção se aproxima —
           * centenas de pixels antes de `--reveal` chegar em 0,40, que é quando
           * elas aparecem.
           *
           * `quality={92}`, e o número não é exagero: o `next/image` encoda AVIF
           * em `quality - 20` com `effort: 3`
           * (node_modules/next/dist/server/image-optimizer.js), e o
           * next.config.ts põe `image/avif` na frente. 92 aqui entrega AVIF q72.
           * O `78` da Fase 15 entregava q58 — que é a maior parte da perda de
           * nitidez que esta fase corrige. Ver tools/build-process-art.cjs.
           */}
          <div className={styles.visual} aria-hidden="true">
            <Image
              className={styles.arte}
              src={`/art/processo/${etapa.arte}.jpg`}
              alt=""
              fill
              sizes="(max-width: 600px) 92vw, (max-width: 900px) 44vw, 21vw"
              quality={92}
              loading="lazy"
            />
          </div>

          <div className={styles.dadosTopo}>
            <p className={`numeral ${styles.numeral}`} aria-hidden="true">
              {etapa.numero}
            </p>
            <h3 className={styles.titulo}>
              <span className="visually-hidden">{`Etapa ${etapa.numero} — `}</span>
              {etapa.titulo}
            </h3>
          </div>

          <p className={styles.descricao} data-descricao>
            {etapa.descricao}
          </p>
        </article>
      ))}
    </div>
  );
}
