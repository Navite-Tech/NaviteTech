import { CUBES, type CubePlane } from '@/lib/content/cubes';
import { CUBE_FIELD, PLANES } from '@/lib/content/cube-field';
import { FIELD_INITIAL } from '@/lib/cubes/states';
import styles from './cubes.module.css';

/**
 * O campo de cubos. Componente de SERVIDOR: não anima nada, só descreve o
 * campo. Quem escreve é `lib/cubes/choreography.ts`, e só ele.
 *
 * NASCIMENTO — a mecânica que torna isto barato.
 *
 * O §9.3 pede que cada cubo saia de `scale(0)` no centro do vão e viaje até sua
 * posição final. Escrito cubo a cubo, seriam 168 transformações por quadro. Mas
 * "sair do centro e ir até a posição final, crescendo de 0 a 1" é exatamente o
 * que UMA escala aplicada ao GRUPO faz, com a origem no centro do vão: cada
 * filho se afasta na proporção da própria distância e cresce junto.
 *
 * São três transformações por quadro — uma por plano de profundidade — em vez
 * de 168. O escalonamento por profundidade e o parallax do mesmo parágrafo
 * entram na MESMA transformação, sem custo adicional.
 *
 * DISSOLUÇÃO — e por que ela cabe na mesma conta.
 *
 * Até a Fase 14 havia uma segunda mecânica aqui: cada cubo carregava quatro
 * constantes — cluster, coluna, linha e fator de escala — porque levar 168
 * unidades dispersas a quatro retículas não é uma transformação de grupo, e
 * nenhuma similaridade leva uma nuvem a uma grelha.
 *
 * Desaparecer, sim, é. A Fase 15 trocou a convergência por uma dissolução, e
 * com ela as quatro constantes por cubo desapareceram do DOM: o que sai de cena
 * é a OPACIDADE do plano, escalonada pela janela de cada um. Um `<i>` agora
 * carrega três propriedades — onde está e quanto mede — e nada sobre para onde
 * iria.
 */
export function CubeField() {
  const porPlano = (p: CubePlane) => CUBES.map((c, id) => ({ ...c, id })).filter((c) => c.p === p);

  return (
    <div className={styles.field}>
      {PLANES.map((plano) => (
        <div
          key={plano.id}
          data-plane={plano.id}
          className={styles.plane}
          style={
            {
              transformOrigin: `${CUBE_FIELD.cx}% ${CUBE_FIELD.cy}%`,
              /*
               * Estado inicial em CSS, antes de qualquer JS — como o do
               * símbolo. Sem isto o campo apareceria já espalhado e encolheria
               * para o centro no primeiro quadro do escritor.
               */
              '--t': FIELD_INITIAL.nasce,
              '--py': `${(plano.parallax * FIELD_INITIAL.py).toFixed(2)}px`,
              '--f': FIELD_INITIAL.fade * (1 - FIELD_INITIAL.dissolve),
            } as React.CSSProperties
          }
        >
          {porPlano(plano.id).map((c) => {
            const pos = {
              '--x': `${(CUBE_FIELD.cx + c.u * CUBE_FIELD.halfW).toFixed(3)}vw`,
              '--y': `${(CUBE_FIELD.cy + c.v * CUBE_FIELD.halfH).toFixed(3)}vh`,
              '--s': `${(c.s * CUBE_FIELD.halfW).toFixed(3)}vw`,
            } as React.CSSProperties;

            /*
             * O plano distante vira quadrado CHAPADO, não cubo de três faces.
             * O §9.3 pedia `blur(1.5px)` para afastá-lo; filtro está proibido em
             * nó que a rolagem transforma (§13.3), e a 3px de lado as três faces
             * não se distinguem de qualquer forma. A profundidade vem da forma
             * simplificada e da opacidade.
             */
            const classe = plano.id === 'far' ? styles.speck : styles.cube;
            return (
              <i
                key={c.id}
                data-cube-id={c.id}
                className={`${classe} ${styles[c.m]}`}
                style={pos}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
