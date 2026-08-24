/**
 * Conteúdo da seção Método (§11 do plano).
 *
 * A GEOMETRIA SAIU DAQUI NA FASE 15 e não voltou. Até a 14 este arquivo era "o
 * único lugar onde a geometria do trilho existe", porque os quatro clusters de
 * cubos eram ancorados NOS NÓS e `clusterX === nodeX`. Com os clusters
 * removidos, o acoplamento deixou de existir, e uma tabela de vw/vh em
 * TypeScript sem ninguém do outro lado para mantê-la sincronizada é só uma
 * segunda folha de estilo pior.
 *
 * A FASE 16 LEVOU O ÚLTIMO NÚMERO DE GEOMETRIA QUE TINHA SOBRADO. `PAINEL_DE`
 * declarava a borda esquerda do painel — 57,78vw, a mesma em que o trilho de
 * Serviços começa — e existia porque duas folhas de estilo precisavam dele: uma
 * para posicionar o painel, outra para que a coluna de texto terminasse antes
 * dele. Não há mais painel à direita nem coluna à esquerda: a composição é
 * centralizada, e nenhuma das duas contas existe.
 *
 * O que mora aqui agora é conteúdo, e as duas decisões por imagem que só podem
 * ser tomadas olhando cada imagem: onde ela é enquadrada, e quanto véu ela
 * cobra para o texto ser legível sobre ela.
 */

export type ProcessStep = {
  /** Numeral em Jost, como nos cards de Serviços. */
  numero: string;
  titulo: string;
  /** Uma linha. Na Fase 16 as quatro ficam visíveis ao mesmo tempo. */
  descricao: string;
  /**
   * Nome do arquivo em `public/art/processo`, sem extensão.
   *
   * As quatro origens estão em references/doProblemaAoFuncionaSection e chegam
   * ao navegador SEM REENCODE NOSSO — o mesmo JPEG, byte a byte. Ver
   * tools/build-process-art.cjs.
   */
  arte: string;
  /**
   * `object-position` da arte dentro da peça.
   *
   * A caixa mudou de razão na Fase 16: era ~0,81 (painel largo, uma imagem por
   * vez) e passou a ~0,62 (peça retrato, quatro em linha). As origens medem
   * 0,47..0,57, então o descarte vertical caiu MUITO — de mais da metade da
   * imagem para quase nada. Estes valores foram recalibrados para a caixa nova.
   */
  enquadramento: string;
  /**
   * Véu sobre a arte, no topo e na base — 0 a 1, e o PADRÃO É ZERO.
   *
   * NÃO É PARTE DA COMPOSIÇÃO. É o custo de legibilidade que cada arte cobra, e
   * ele varia porque as quatro artes variam: a malha escura da 01 não cobra nada
   * no topo, as ripas de luz da 03 cobram. A regra é subir só até o texto passar
   * em contraste (tools/check-contrast.cjs) e parar ali — nunca um gradiente
   * uniforme aplicado às quatro por precaução.
   *
   * E a PRIMEIRA alavanca de contraste é `enquadramento`, não este número: pôr o
   * texto sobre uma faixa mais escura da própria imagem preserva a arte; velar a
   * imagem para acomodar o texto, não.
   *
   * O valor de cada um fica anotado com a medição que o justificou, e é o PIOR
   * CASO entre as larguras: 1672, 1366, 1024 e 820. O véu necessário varia com a
   * viewport porque o recorte visível varia — na 03, o título pede 0,65 a 820 e
   * nada a 1366, porque a faixa de imagem que cai atrás dele é outra. Um valor
   * calibrado numa largura só passa ali e reprova em duas.
   */
  veuTopo: number;
  veuBase: number;
};

/** As quatro etapas do §11. */
export const PROCESS_STEPS: readonly ProcessStep[] = [
  {
    numero: '01',
    titulo: 'Entender',
    descricao: 'A operação como ela é: a rotina, os gargalos e o objetivo por trás do pedido.',
    arte: 'entender',
    enquadramento: '50% 42%',
    /*
     * A malha escura não cobra nada no topo: 8,6:1 sem véu nenhum, e 6,9:1 na
     * pior das larguras medidas. Na base cobra pouco — as estrelas do terço de
     * baixo passam por trás das palavras.
     */
    veuTopo: 0,
    veuBase: 0.35,
  },
  {
    numero: '02',
    titulo: 'Definir',
    descricao:
      'O que realmente precisa ser construído — e, com a mesma clareza, o que não precisa.',
    arte: 'definir',
    enquadramento: '50% 46%',
    /* A única das quatro que não cobra nada: 13,8:1 no topo e 7,0:1 na base, sem véu. */
    veuTopo: 0,
    veuBase: 0,
  },
  {
    numero: '03',
    titulo: 'Construir',
    descricao: 'Design, tecnologia e integração no mesmo movimento, não em etapas separadas.',
    arte: 'construir',
    enquadramento: '50% 50%',
    /*
     * A cara. As ripas de luz correm de ponta a ponta, em toda a altura — não
     * existe faixa escura para onde reenquadrar, e o corte vertical disponível é
     * de 8% (a origem tem razão 0,571 e a peça 0,62, então o `cover` resolve
     * pela largura e quase nada é descartado). Aqui o véu não é preguiça: é a
     * única alavanca.
     *
     * Medido: no topo, 1,1:1 sem véu e 6,0:1 com 0,65. Na base, 1,3:1 sem véu e
     * 6,0:1 com 0,85.
     */
    veuTopo: 0.65,
    veuBase: 0.85,
  },
  {
    numero: '04',
    titulo: 'Evoluir',
    descricao: 'Medir o que entrou em operação, ajustar e continuar melhorando com o negócio.',
    arte: 'evoluir',
    enquadramento: '54% 44%',
    /*
     * O canto superior esquerdo é preto: 18,3:1 no topo, sem véu — e note que
     * subir o véu ali PIORA o número, porque escurecer um fundo que já é mais
     * escuro que o texto aproxima os dois. Mais uma razão para o padrão ser zero.
     *
     * A base é o oposto: o cromo líquido é quase branco. 1,1:1 sem véu, 6,3:1
     * com 0,85. O corte vertical disponível é de 9%, que não alcança nenhuma
     * faixa escura.
     */
    veuTopo: 0,
    veuBase: 0.85,
  },
] as const;
