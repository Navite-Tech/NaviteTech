import { Fragment } from 'react';
import { ProgressTicks } from './ProgressTicks';
import type { Service } from '@/lib/content/services';
import styles from './services.module.css';

type Props = {
  servico: Service;
  /** Índice 0-based na pilha. Alimenta `--i`, de onde sai toda a posição. */
  indice: number;
  total: number;
  /**
   * A arte do card. Trocar por uma captura real de projeto, quando houver, é
   * trocar um nó JSX, sem mudança estrutural (§10.4).
   */
  visual?: React.ReactNode;
};

/**
 * Um card da pilha. Componente de SERVIDOR: não anima nada e não lê a rolagem.
 * Toda a posição sai de `--reveal` em CSS — ver services.module.css.
 *
 * TRÊS FAIXAS, e a do meio é vazia de propósito:
 *
 *   `.topo`   título e numeral, direto sobre a arte CRUA, sem véu nenhum. É por
 *             isso que a tinta aqui segue `data-polaridade`: navy sobre as duas
 *             artes claras, bone sobre as duas escuras.
 *   (miolo)   nada. É a imagem respirando, e é o que separa uma composição
 *             editorial de um card preenchido.
 *   `.base`   descrição e pills, sobre um véu curto de navy — o único do card.
 *             Ali a tinta é bone nas quatro, e as pills são claras nas quatro.
 */
export function ServiceCard({ servico, indice, total, visual }: Props) {
  const tituloId = `servico-${servico.id}`;
  return (
    <article
      className={styles.card}
      data-card={indice}
      data-servico={servico.id}
      data-polaridade={servico.polaridade}
      aria-labelledby={tituloId}
      style={
        {
          '--i': indice,
          '--arte-pos': servico.enquadramento,
        } as React.CSSProperties
      }
    >
      {/*
       * A arte, ao FUNDO e sangrando pelos quatro lados. `aria-hidden` porque é
       * ILUSTRAÇÃO: o que ela mostra já está dito no título, na descrição e nas
       * capacidades, e um leitor de tela anunciando "vidro esmeralda" no meio de
       * um card de serviços só atrapalha.
       *
       * A troca do visual é uma prop e nada mais (§10.4) — ver
       * components/services/visuals/index.tsx e scripts/check-visuais.mjs.
       */}
      <div className={styles.visual} data-visual aria-hidden="true">
        {visual}
      </div>

      <div className={styles.cardTexto}>
        <div className={styles.topo}>
          {/*
           * Uma linha por `<span>` de bloco, como no headline do hero. Os `{' '}`
           * explícitos não são enfeite: o JSX descarta espaço em branco que
           * contenha quebra de linha, e sem eles o `textContent` sairia
           * "Web &ExperiênciasDigitais" — que é o que um leitor de tela anuncia.
           */}
          <h3 id={tituloId} className={`subtitle ${styles.titulo}`}>
            {servico.titulo.map((linha, l) => (
              <Fragment key={l}>
                {l > 0 && ' '}
                <span className={styles.tituloLinha}>
                  {linha.map((t, s) => (
                    <Fragment key={s}>
                      {s > 0 && ' '}
                      {t.acento ? <span className="u-editorial-accent">{t.texto}</span> : t.texto}
                    </Fragment>
                  ))}
                </span>
              </Fragment>
            ))}
          </h3>

          <p className={`numeral ${styles.numeral}`}>
            <span>{servico.numero}</span>
            <ProgressTicks total={total} ativo={indice} />
          </p>
        </div>

        <div className={styles.base}>
          <p className={styles.descricao}>{servico.descricao}</p>

          <ul className={styles.capacidades}>
            {servico.capacidades.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
