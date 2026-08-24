import Image from 'next/image';
import styles from './visuals.module.css';

type Props = {
  /** id do serviço. É o nome do arquivo em public/art/servicos. */
  id: string;
  /**
   * Carrega junto com o documento, em vez de esperar a aproximação.
   *
   * Vale para a arte do PRIMEIRO card e só para ela. Os quatro cards existem no
   * DOM desde o início, mas três deles esperam deslocados para fora do recorte
   * do trilho, e o observador de proximidade do `next/image` respeita
   * transform: eles carregam enquanto sobem, com folga de centenas de pixels de
   * rolagem. O card 01 não tem essa folga — ele entra pela lateral no mesmo
   * instante em que a seção assume a tela, e uma arte que chega depois disso
   * aparece como um piscar dentro de um card já lido.
   *
   * Não é `priority`: isso injetaria um `<link rel=preload>` e faria 28KB de
   * imagem abaixo da dobra disputarem banda com o LCP, que é o lead do hero.
   */
  ansioso?: boolean;
};

/**
 * A arte de um card de serviço.
 *
 * Uma imagem só, sangrando pelo card inteiro. Nada de painel, moldura ou
 * miniatura: a Fase 14 trocou as quatro maquetes de interface por arte porque
 * uma maquete dentro de uma caixinha lê como placeholder, por melhor que seja
 * desenhada — e as quatro eram bem desenhadas.
 *
 * O que a Fase 15 trocou não foi a estrutura, foi a COR: as artes deixaram de
 * ser duotonadas para a paleta da página e passam intactas, na cor de origem.
 * Ver o cabeçalho de tools/build-service-art.cjs.
 *
 * `alt=""`, e é deliberado: a imagem é ILUSTRAÇÃO. O que ela mostra já está
 * dito no título, na descrição e nas capacidades do card; um leitor de tela
 * anunciando "forma de vidro esmeralda" no meio de um card de serviços só
 * atrapalha. O slot inteiro é `aria-hidden` pelo mesmo motivo (ServiceCard.tsx).
 *
 * O enquadramento sai de `--arte-pos`, que o card publica a partir do conteúdo
 * (lib/content/services.ts). Ver a nota em visuals.module.css.
 */
export function ServiceArt({ id, ansioso }: Props) {
  return (
    <Image
      className={styles.arte}
      src={`/art/servicos/${id}.webp`}
      alt=""
      fill
      sizes="(max-width: 900px) 94vw, 37vw"
      /*
       * 92, e não os 82 anteriores. O número parece alto e não é: o
       * `next/image` encoda AVIF em `quality - 20`, com `effort: 3`
       * (node_modules/next/dist/server/image-optimizer.js), e o next.config.ts
       * põe `image/avif` na frente. Então `quality={82}` entregava AVIF q62 —
       * sobre um intermediário que já era webp q78. Duas gerações de perda em
       * cima de renders de gradiente longo, que é o material que encoder alisa
       * primeiro.
       *
       * 92 entrega AVIF q72. O intermediário subiu junto, em
       * tools/build-service-art.cjs, onde está a conta inteira.
       */
      quality={92}
      loading={ansioso ? 'eager' : 'lazy'}
    />
  );
}
