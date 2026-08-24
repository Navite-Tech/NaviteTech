import { FAQ } from '@/lib/content/faq';
import styles from './faq.module.css';

/**
 * A lista de perguntas. Componente de SERVIDOR: não anima nada e não lê a
 * rolagem.
 *
 * `<details>`/`<summary>` NATIVOS, sem uma linha de ARIA (§14). O elemento já
 * entrega estado, foco, teclado e o anúncio correto em leitor de tela; toda
 * reimplementação disso em `div` + `aria-expanded` é uma chance a mais de
 * errar. O aceite da Fase 10 verifica justamente a operação por teclado.
 *
 * O `<div>` extra entre o `<summary>` e o texto existe para a abertura animada
 * (§9.6: `grid-template-rows: 0fr → 1fr`): é preciso um elemento cuja ALTURA
 * possa ser interpolada e outro, dentro, que recorte o excedente. Nenhum dos
 * dois carrega semântica — a semântica inteira está no `<details>`.
 */
export function FaqList() {
  return (
    <ul className={styles.lista}>
      {FAQ.map((item, i) => (
        <li key={item.id} className={styles.item} style={{ '--i': i } as React.CSSProperties}>
          <details className={styles.details} name="faq" id={`faq-${item.id}`}>
            <summary className={styles.pergunta}>
              <span>{item.pergunta}</span>
              {/*
               * O `+` que gira 45° e vira `×` (§9.6). Dois traços em SVG, não
               * um glifo: um `+` tipográfico não fica centrado na caixa e a
               * rotação expõe isso imediatamente.
               */}
              <svg
                className={styles.mais}
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M8 1v14M1 8h14" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </summary>

            <div className={styles.painel}>
              <div className={styles.painelInterno}>
                {item.resposta.map((p, k) => (
                  <p key={k} className={styles.resposta}>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
