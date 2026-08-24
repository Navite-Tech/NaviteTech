import type { ComponentType } from 'react';
import { SERVICES } from '@/lib/content/services';
import { STACK } from '@/lib/motion/stack';
import { ServiceCard } from './ServiceCard';
import { VISUAIS } from './visuals';
import styles from './services.module.css';

type Props = {
  /**
   * Sobrepõe o mock de um ou mais serviços, por id.
   *
   * Existe para o §18 da Fase 8 — "cada visual trocável alterando uma prop" — e
   * é o que `scripts/check-visuais.mjs` usa para provar que a troca não mexe em
   * mais nada do card. Trocar por uma captura real de projeto, quando houver, é
   * a mesma operação.
   */
  visuais?: Record<string, ComponentType>;
};

/**
 * A pilha de cards. Componente de SERVIDOR: não anima nada e não lê a rolagem.
 *
 * Os quatro cards ficam TODOS montados, empilhados num trilho de altura fixa
 * (§10.2). Quem publica o progresso é `SectionProgress`, numa escrita por
 * quadro na seção; a posição de cada card sai daí em CSS.
 *
 * As frações do ritmo entram como propriedades customizadas, e não como números
 * na folha de estilo, para que `lib/motion/stack.ts` continue sendo o único
 * lugar onde elas existem. Os inversos são pré-calculados aqui porque
 * `calc(x / var(--p))` depende do divisor ser resolvido como número — uma
 * multiplicação por um inverso é a mesma conta sem essa dependência.
 */
export function ServiceCardStack({ visuais }: Props = {}) {
  const arred = (n: number) => Number(n.toFixed(4));

  const ritmo = {
    '--assentado': STACK.assentado,
    '--passo': STACK.passo,
    '--passo-inv': arred(1 / STACK.passo),
    '--entrada-de': arred(STACK.assentado - STACK.entrada),
    '--entrada-inv': arred(1 / STACK.entrada),
    '--espia': STACK.espia,
    '--saida-y': STACK.saida.y,
    '--saida-escala': STACK.saida.escala,
    '--saida-opacidade': STACK.saida.opacidade,
    /* início da última troca: é quando o rótulo do próximo deixa de valer */
    '--ultimo-de': arred(STACK.assentado + (SERVICES.length - 2) * STACK.passo),
  } as React.CSSProperties;

  return (
    <div className={styles.trilho} style={ritmo}>
      {SERVICES.map((servico, i) => {
        const Visual = visuais?.[servico.id] ?? VISUAIS[servico.id];
        return (
          <ServiceCard
            key={servico.id}
            servico={servico}
            indice={i}
            total={SERVICES.length}
            visual={Visual ? <Visual /> : null}
          />
        );
      })}

      <p className={styles.proximo} aria-hidden="true">
        <span className={styles.proximoSeta} />
        <span className={styles.proximoRotulo}>
          Próximo
          <span>serviço</span>
        </span>
      </p>
    </div>
  );
}
