import { AmbientField } from './AmbientField';
import { JOURNEY, type JourneyId } from '@/lib/scroll/triggers';
import type { AmbientMark } from '@/lib/content/ambient';
import styles from './Section.module.css';

type Props = {
  id: JourneyId;
  children: React.ReactNode;
  /** Título acessível da seção, ligado por aria-labelledby. */
  titleId: string;
  className?: string;
  /** Campo de ambientação da seção. Ver lib/content/ambient.ts. */
  ambient?: readonly AmbientMark[];
  /** Atraso de entrada do campo, em segundos. */
  ambientDelay?: number;
  /**
   * A seção NÃO prende a tela: cresce com o conteúdo, em fluxo normal.
   *
   * É o que o §8.2 pede para o FAQ — "altura natural, sem pin". Uma lista de
   * perguntas muda de altura conforme se abre e se fecha, e uma tela presa de
   * 100dvh não tem como acomodar isso: o excedente escaparia por baixo, sobre a
   * seção seguinte.
   */
  flow?: boolean;
};

/**
 * Casca de seção: âncora, rótulo acessível, ambientação e — o que importa
 * aqui — a altura de rolagem.
 *
 * A altura vem de `lib/scroll/triggers.ts`, não de CSS solto: é o mesmo número
 * que a coreografia usa para ancorar seus estados, então calibrar o ritmo
 * continua sendo editar um arquivo.
 *
 * O conteúdo fica preso com `position: sticky`. Não é `ScrollTrigger.pin`:
 * assim o ScrollTrigger só LÊ a rolagem e nunca escreve no layout, o que é o
 * que sustenta a promessa de escritor único do símbolo. A razão completa está
 * em lib/scroll/triggers.ts.
 *
 * SEM HUD. Até esta fase a casca também montava o contador `NN — 06 / RÓTULO`
 * no canto superior. Ele foi removido junto com o indicador de rolagem: os dois
 * eram interface EXPLICANDO a narrativa — dizendo em que ponto do percurso o
 * leitor está — e é a própria narrativa que tem de dizer isso. O que restou é
 * composição.
 */
export function Section({ id, children, titleId, className, ambient, ambientDelay, flow }: Props) {
  const meta = JOURNEY.find((s) => s.id === id);
  if (!meta) throw new Error(`seção "${id}" não está em JOURNEY (lib/scroll/triggers.ts)`);

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={[styles.root, flow && styles.flow, className].filter(Boolean).join(' ')}
      style={{ '--length': meta.length } as React.CSSProperties}
    >
      {ambient && (
        <div className={styles.ambient}>
          <AmbientField marks={ambient} delay={ambientDelay} />
        </div>
      )}

      <div className={styles.viewport}>{children}</div>
    </section>
  );
}
