import styles from './Environment.module.css';

/**
 * O ambiente em que o símbolo repousa: o chão e a vinheta.
 *
 * Fica no layout, não numa seção, pelo mesmo motivo que a camada do símbolo:
 * é o espaço, e o espaço não recomeça a cada seção. Montado uma vez, nunca
 * remontado, sem custo de rolagem — é um `fixed` com dois gradientes e nada
 * mais.
 *
 * Pinta ABAIXO do campo de ambientação e do símbolo. A ordem inteira, do fundo
 * para a frente: ambiente → marcadores → símbolo → conteúdo. Os dois primeiros
 * compartilham `--z-bg` e se resolvem por ordem de DOM, o que exige que este
 * componente venha antes de qualquer seção.
 */
export function Environment() {
  return <div className={styles.root} aria-hidden="true" />;
}
