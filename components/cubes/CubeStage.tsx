import { FIELD_INITIAL } from '@/lib/cubes/states';
import { CubeLayer } from './CubeLayer';
import styles from './cubes.module.css';

/**
 * A camada persistente do campo de cubos.
 *
 * Irmã de `<main>`, como a do símbolo, e pelo mesmo motivo: o campo DISPERSO no
 * Problema tem de chegar ao Processo, duas seções adiante, sendo as MESMAS
 * instâncias. Enquanto ele era o fundo de uma seção, saía de cena com ela —
 * reencontrá-lo depois seria montar um segundo enxame e torcer para que
 * ninguém percebesse.
 *
 * Aqui existem 168 nós, montados uma vez, que atravessam a narrativa inteira.
 * `data-cube-id` os torna verificáveis de fora (scripts/check-processo.mjs).
 *
 * NÃO HÁ MAIS GEOMETRIA PUBLICADA AQUI. Até a Fase 14 este componente emitia
 * uma tag `<style>` com nove propriedades — centro do primeiro cluster, passo
 * entre clusters, célula da retícula, decaimento, centros de coluna e linha,
 * escalonamento e o inverso dele — todas lidas de `lib/content/process.ts` e
 * consumidas por 168 elementos em `calc`. Era o que sustentava a convergência
 * em quatro grelhas. A Fase 15 trocou a convergência por uma dissolução, e o
 * bloco inteiro saiu: o campo desaparece por opacidade, no plano, e nada disso
 * precisa ser dito a cada cubo.
 */
export function CubeStage() {
  return (
    <div
      className={styles.stage}
      data-cube-stage
      aria-hidden="true"
      /*
       * O canal do ESCRITOR: `--fade` e `--d` são reescritos aqui a cada
       * quadro. Nenhum dos dois é consumido por regra de estilo — quem pinta é
       * o `--f` de cada plano, que já chega multiplicado. Eles ficam porque são
       * o que um instrumento externo lê para saber em que ponto da jornada o
       * campo está (scripts/check-processo.mjs).
       */
      style={
        {
          '--fade': FIELD_INITIAL.fade,
          '--d': FIELD_INITIAL.dissolve,
        } as React.CSSProperties
      }
    >
      <CubeLayer />
    </div>
  );
}
