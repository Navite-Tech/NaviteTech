import type { JourneyId } from '@/lib/scroll/triggers';

/**
 * A coreografia do símbolo — ÚNICO lugar onde estes números existem.
 *
 * Todos medidos, nenhum estimado. As fontes, em ordem da hierarquia aprovada:
 *
 *   • `references/hero-reference.png` e o frame 0 de `flow-symbol-transition.mp4`
 *     (que são a MESMA composição: as duas medições batem em 0,01vw) dão o
 *     estado `hero`;
 *   • os 21 frames de `flow-symbol-transition.mp4` dão a curva inteira de
 *     `hero` → `problemOpen`, incluindo a ultrapassagem;
 *   • `higgsfield-services-motion.mp4` e `services-reference.png` dão
 *     `servicesLeft` — concordam em x (55,4 e 56,6) e em escala (1,05 e 1,09);
 *   • `processDrop`/`processGone` e os estados do CTA são PROPOSTOS: não existe
 *     referência para eles. Ficam marcados abaixo e são calibrados nas fases 9,
 *     10 e 16.
 *
 * Ferramenta: `node tools/measure-composition.cjs <png|diretório>`.
 *
 * ---
 *
 * Unidades. `x` é % da LARGURA da viewport, `y` é % da ALTURA, `scale` é
 * relativo a `--symbol-size` (o tamanho do estado `hero`).
 *
 * `x` e o tamanho vivem na largura porque foi isso que a medição mostrou: entre
 * duas referências de aspectos diferentes (1,50 e 1,78) o símbolo bate em vw
 * — 32,6 contra 32,5 — e diverge 18% em vh.
 *
 * `x`/`y` são o CENTRO DO VIEWBOX de cada metade, não o centro da caixa
 * desenhada. As duas não coincidem: a caixa do relevo é excêntrica dentro do
 * viewBox, e confundir uma com a outra produziu, numa primeira medição, um
 * desencaixe vertical de 3,8vh entre as metades que não existe.
 *
 * ---
 *
 * Sem `rotY`. O §7.2 do plano propunha ±14° ao abrir, com a justificativa de que
 * "a banda de extrusão está sempre do lado interno". A medição derrubou a
 * premissa: a extrusão é global (embaixo e à esquerda nas DUAS metades), então
 * girar cada metade para um lado encurtaria as bandas em sentidos opostos —
 * exatamente o contrário do que um objeto sólido faz sob um ponto de vista só.
 *
 * O vídeo também não sustenta rotação: a caixa de cada metade estreita 30%
 * durante a separação, mas os frames finais mostram que o render degradou a
 * forma para uma BARRA de espessura uniforme com pontas arredondadas — a
 * degradação que o §3.2 do plano já havia sinalizado. Não é perspectiva.
 */

export type HalfState = {
  /** Centro do viewBox da metade, em % da largura da viewport. */
  x: number;
  /** Centro do viewBox da metade, em % da altura da viewport. */
  y: number;
  /** Relativo a `--symbol-size`. 1 = tamanho do hero. */
  scale: number;
  opacity: number;
};

export type SymbolState = {
  left: HalfState;
  right: HalfState;
  /** Opacidade da sombra de contato das duas metades. */
  shadow: number;
};

export type SymbolStateName = keyof typeof SYMBOL_STATES;

export const SYMBOL_STATES = {
  /**
   * `( )` completo, à direita do centro. Medido no hero-reference.png:
   * esquerda (66,13 / 53,53) e direita (67,17 / 52,84), tamanho 33,3vw.
   *
   * As duas metades ficam CONCÊNTRICAS aqui, embora a referência mostre 1,04vw
   * de desencaixe. O `logoNavite.png` — que é a marca oficial e vence pela
   * hierarquia — é exatamente simétrico, e 1vw num render 3D medido a ±2px é
   * ruído de pose. O hero precisa ler como a marca.
   */
  hero: {
    left: { x: 66.65, y: 53.2, scale: 1.0, opacity: 1 },
    right: { x: 66.65, y: 53.2, scale: 1.0, opacity: 1 },
    shadow: 0.55,
  },

  /**
   * Pico da abertura: t=2,80s do flow, onde a escala é máxima (1,126) e a
   * separação já percorreu 72% do caminho. Medido: esquerda 59,23, direita
   * 74,00, tamanho 66,76vh de 59,27vh em repouso.
   *
   * Existe como estado próprio porque escala e separação atingem o máximo em
   * instantes DIFERENTES (2,8s e 4,4s). Uma curva de easing só não reproduz
   * isso; um keyframe no meio reproduz.
   */
  problemPeak: {
    left: { x: 59.2, y: 53.9, scale: 1.126, opacity: 1 },
    right: { x: 74.0, y: 53.9, scale: 1.126, opacity: 1 },
    shadow: 0.34,
  },

  /**
   * Metades afastadas, com o vão hospedando os cubos. t=7,98s do flow:
   * esquerda 53,75, direita 74,19, tamanho 57,78vh (escala 0,975).
   *
   * As duas ficam na MESMA altura. A medição dá 54,4 e 49,0, mas nesse ponto o
   * render já deformou a crescente em barra uniforme, e a conversão para centro
   * do viewBox depende da forma. A lei do §4.1 do plano — "a separação é
   * horizontal, mantendo o centro vertical" — é o que a metade esquerda, que
   * continua legível, confirma: ela deriva só 0,9vh no vídeo inteiro.
   */
  problemOpen: {
    left: { x: 53.8, y: 54.0, scale: 0.975, opacity: 1 },
    right: { x: 74.2, y: 54.0, scale: 0.975, opacity: 1 },
    shadow: 0.38,
  },

  /**
   * A metade direita a caminho de sair. O fade termina antes de ela cruzar a
   * borda, para não haver corte visível (plano §7.4).
   *
   * Do higgsfield: a direita translada 67,5 → 91,3 sem mudar de tamanho e some
   * por volta de t=2,0s, enquanto a esquerda cresce e se assenta.
   */
  servicesHandoff: {
    left: { x: 55.0, y: 53.8, scale: 1.03, opacity: 1 },
    right: { x: 90.0, y: 53.5, scale: 1.02, opacity: 0.12 },
    shadow: 0.32,
  },

  /**
   * `(` sozinha, ancorada centro-esquerda, com a pilha de cards à direita.
   * Duas fontes independentes concordam: higgsfield final (55,35 / 52,84 /
   * 35,0vw) e services-reference.png (56,63 / 54,61 / 36,3vw).
   */
  servicesLeft: {
    left: { x: 56.0, y: 53.7, scale: 1.07, opacity: 1 },
    right: { x: 110, y: 53.0, scale: 1.07, opacity: 0 },
    shadow: 0.3,
  },

  /**
   * A ÚLTIMA POSE VISÍVEL da crescente no Método: descida pela direita, rente ao
   * pé da tela. PROPOSTO — não há referência de vídeo.
   *
   * A DESCIDA EXISTE POR UMA COLISÃO MEDIDA. A peça vem de `servicesLeft` (56 /
   * 53,7vw). Levá-la ao canto inferior ESQUERDO em linha reta a fazia atravessar
   * a coluna de texto na diagonal: medido a reveal 0,22, a tinta cobria x
   * 304..452 por y 396..540, exatamente onde o lead terminava. Não é problema de
   * camada — o texto pinta por cima —, é de contraste, e bone sobre bone não se
   * resolve com opacidade. Daí descer primeiro, pela direita, onde não há texto.
   *
   * O QUE MUDOU NA FASE 16 é que não há mais "depois". Na 15 esta era a primeira
   * metade de um trajeto que seguia para a borda esquerda (`processEdge`, agora
   * removido); aqui ela é o fim do caminho, e a peça apaga onde parou. Ver
   * `processGone`.
   *
   * Os números foram conferidos nas três larguras da bateria, e a lei que eles
   * atendem é a de não tocar o texto:
   *
   *   1672×941   tinta de 62vh para baixo
   *   1440×900   tinta de 60vh para baixo
   *   1366×768   tinta de 62vh para baixo
   *
   * O bloco de texto centralizado da Fase 16 termina em ~38vh nas três — folga
   * maior que a da composição anterior, cuja coluna descia até 50vh.
   *
   * A escala é 1,15 e não 1,3: em 1,3 a peça media 724px de caixa numa tela de
   * 941 e, empurrada para 96vh, sobrava dela só um fio no canto — enquadrar
   * virava esconder.
   */
  processDrop: {
    left: { x: 56.0, y: 96.0, scale: 1.15, opacity: 1 },
    right: { x: 110, y: 96.0, scale: 1.15, opacity: 0 },
    shadow: 0.26,
  },

  /**
   * A crescente SAI DE CENA no Método — estado novo da Fase 16.
   *
   * Ela existiu no canto inferior esquerdo enquanto havia canto vazio para
   * ocupar: com a composição de duas colunas, a coluna de texto terminava em
   * ~50vh e a metade de baixo da tela era fundo. A composição editorial acabou
   * com esse vazio — a linha das quatro peças ocupa de ~46vh a ~96vh EM TODA A
   * LARGURA, e não sobra canto onde a peça caiba.
   *
   * As alternativas foram consideradas e descartadas. Mantê-la por baixo das
   * peças põe tinta bone atrás de uma arte que precisa passar intacta, que é
   * exatamente a contaminação que o item 3 do briefing proíbe. Estreitar a
   * linha de peças para abrir espaço para ela seria encolher a afirmação da
   * seção para acomodar um enquadramento.
   *
   * Então ela cumpre o papel de continuidade DURANTE a recomposição — é o
   * objeto que atravessa a tela enquanto os cubos somem — e apaga quando a
   * prancha assume. O arco `( ) → ( → ( )` não perde nada: a peça se reconstitui
   * no Contato, como já fazia.
   *
   * GEOMETRIA IDÊNTICA a `processDrop`, e isso é exigência, não descuido. O
   * `verify-symbol-continuity.mjs` mede a caixa em 240 posições SEM olhar
   * opacidade: um estado que apagasse e ao mesmo tempo saltasse de lugar seria
   * um teleporte escondido, e seria reprovado — como deve ser. Aqui só a tinta
   * some; a peça continua onde estava.
   *
   * `processEdge` FOI REMOVIDO junto com este estado, e a remoção tem uma razão
   * medida. Ele levava a peça de x 56 para x 16 — rente à borda esquerda,
   * cortada — para enquadrar o canto inferior esquerdo vazio da composição de
   * duas colunas. Esse canto não existe mais: a linha das quatro peças ocupa a
   * metade de baixo da tela em toda a largura. E como a crescente agora apaga
   * ali mesmo, a travessia lateral seria movimento que ninguém vê chegar a
   * lugar nenhum — 40vw de deslocamento gastando curso que a descida precisa.
   */
  processGone: {
    left: { x: 56.0, y: 96.0, scale: 1.15, opacity: 0 },
    right: { x: 110, y: 96.0, scale: 1.15, opacity: 0 },
    shadow: 0,
  },

  /**
   * PROPOSTO — o símbolo sai de cena no FAQ, que é a seção de desaceleração.
   *
   * A posição continua andando mesmo invisível, em vez de saltar enquanto
   * ninguém vê. Isso custa nada e mantém a verificação de continuidade honesta:
   * ela mede a caixa em 240 posições sem olhar a opacidade, então um "teleporte
   * escondido" seria reprovado — como deve ser.
   */
  faqHidden: {
    left: { x: 24.0, y: 48.0, scale: 1.14, opacity: 0 },
    right: { x: 92.0, y: 48.0, scale: 1.14, opacity: 0 },
    shadow: 0,
  },

  /**
   * As metades voltando a se encontrar. A altura é a mesma dos dois estados
   * seguintes: o reencontro é HORIZONTAL, como a separação do §4.1 foi.
   */
  ctaReturn: {
    left: { x: 34.0, y: 39.5, scale: 0.89, opacity: 1 },
    right: { x: 72.0, y: 39.5, scale: 0.89, opacity: 0.55 },
    shadow: 0.3,
  },

  /**
   * A ULTRAPASSAGEM do §9.7 — "um leve overshoot de 1,5% com assentamento em
   * power3.out marca o encaixe".
   *
   * As metades já estão juntas aqui; o que passa do ponto é a ESCALA, 1,5%
   * acima da final. Sem isso o `( )` chega ao lugar e para, o que lê como uma
   * imagem trocada; com isso, lê como uma peça que encaixa.
   *
   * 0,812 = 0,80 × 1,015. A quantização de escala do escritor é de 0,5%, então
   * a ultrapassagem tem três degraus para percorrer — visível, e nem um a mais.
   */
  ctaEncaixe: {
    left: { x: 50.0, y: 39.5, scale: 0.812, opacity: 1 },
    right: { x: 50.0, y: 39.5, scale: 0.812, opacity: 1 },
    shadow: 0.42,
  },

  /**
   * `( )` reconstituído. Exatamente concêntrico — como o `logoNavite.png`, que
   * é a marca oficial e vence pela hierarquia.
   *
   * `y: 39,5` e escala 0,80 — e as duas coisas são GEOMETRIA da composição, não
   * gosto. O §7.3 propunha 0,86 no centro da tela; a captura mostrou por que
   * não dá.
   *
   * Medido em 1672×941: a peça fecha em cima, com o headline e o lead DENTRO do
   * vão dela, e o formulário logo abaixo em fundo limpo. A conta é vertical e
   * não tem folga: entre a base do header (144px) e a base da tela sobram
   * 797px, o formulário mede 309 e o vão útil da peça precisa comportar 222 de
   * headline, régua e lead. Em 0,86 a tinta ocupava 482px e a soma dava 824 —
   * os dois primeiros campos atravessavam as crescentes, que foi exatamente o
   * que a primeira captura mostrou. Em 0,80 ela ocupa 448 e a soma fecha em
   * 786, com a peça começando 6px abaixo do header.
   */
  ctaClosed: {
    left: { x: 50.0, y: 39.5, scale: 0.8, opacity: 1 },
    right: { x: 50.0, y: 39.5, scale: 0.8, opacity: 1 },
    shadow: 0.45,
  },
} as const satisfies Record<string, SymbolState>;

/**
 * Um instante da coreografia, ancorado a uma fração da rolagem de uma seção.
 *
 * Ancorar em fração de seção — e não em pixels de documento — é o que faz a
 * calibragem de ritmo (`lib/scroll/triggers.ts`) não mexer na coreografia:
 * alongar a seção Serviços estica o trecho correspondente sem deslocar nada.
 */
export type Keyframe<N extends string = SymbolStateName> = {
  section: JourneyId;
  /** 0 = topo da seção entra no topo da tela; 1 = fim da rolagem dela. */
  at: number;
  state: N;
  /**
   * Curva do trecho que CHEGA aqui. `none` mantém linear com a rolagem — usado
   * nos trechos de espera, onde os dois extremos são o mesmo estado.
   */
  ease?: 'none' | 'power2.inOut' | 'power3.inOut' | 'power2.out' | 'power3.out';
};

/**
 * A trilha. Trechos com o mesmo estado nas duas pontas são ESPERAS: o símbolo
 * fica imóvel enquanto outra coisa conduz a narrativa — os cubos no Problema,
 * os cards em Serviços.
 *
 * A espera de Serviços é o critério de aceite da Fase 7: a metade esquerda não
 * pode se mover um pixel enquanto os quatro cards passam.
 *
 * O Problema ganhou a sua na Fase 14. A peça alcança `problemOpen` em 0,72 e
 * fica parada até o fim da seção: sem isso ela continuava se afastando por
 * baixo dos callouts durante a leitura deles, e uma composição que ainda se
 * mexe não é uma composição que se lê. A pose final é a mesma, e `servicos
 * at: 0` continua partindo dela — nada a jusante muda.
 */
export const SYMBOL_TRACK: readonly Keyframe[] = [
  { section: 'hero', at: 0.0, state: 'hero' },
  { section: 'hero', at: 1.0, state: 'hero', ease: 'none' },
  { section: 'problema', at: 0.0, state: 'problemPeak', ease: 'power2.inOut' },
  { section: 'problema', at: 0.72, state: 'problemOpen', ease: 'power2.inOut' },
  { section: 'problema', at: 1.0, state: 'problemOpen', ease: 'none' },
  { section: 'servicos', at: 0.0, state: 'servicesHandoff', ease: 'power2.inOut' },
  { section: 'servicos', at: 0.3, state: 'servicesLeft', ease: 'power2.inOut' },
  { section: 'servicos', at: 1.0, state: 'servicesLeft', ease: 'none' },
  /*
   * A DESCIDA GANHOU CURSO, e o número saiu de uma reprovação.
   *
   * A primeira versão da Fase 16 punha `processDrop` em 0,10 — herdado dos 0,16
   * da Fase 15, quando a seção tinha 3,8 telas. Com 2,4, os mesmos 42vh de
   * descida passaram a caber em 132px de rolagem em vez de 421, e o
   * `check:continuity` reprovou: 27,8% de variação entre amostras vizinhas, 4,2x
   * o entorno. Movimento que a rolagem não acompanha lê como salto.
   *
   * Agora a descida ocupa a JANELA DA RECOMPOSIÇÃO — 0,05 a 0,30 —, os mesmos
   * 329px em que os cubos dissolvem e o texto migra. É o que o item 1 do
   * briefing descreve: uma transformação só, com tudo acontecendo junto, em vez
   * de a peça cair antes de a cena começar a mudar.
   *
   * E não há colisão com o texto, apesar de os dois se moverem ao mesmo tempo:
   * a tinta da crescente nunca sobe de 62vh e o bloco de texto termina em 38vh.
   * `check:processo` mede a interseção dos retângulos em 33 amostras.
   *
   * A APAGADA FECHA EM 0,40, que é `METODO.recompoe` — a mesma fração em que os
   * cubos terminam de dissolver e em que a primeira peça começa a entrar. Ela
   * fechava em 0,48, e a captura mostrou o custo: a reveal 0,40 a crescente
   * ainda estava a ~30% de opacidade enquanto a 01 chegava, deixando um
   * fantasma de bone atrás da linha de artes. O item 1 do briefing é explícito
   * — as artes entram QUANDO o espaço está limpo —, e "limpo" tem de valer para
   * a peça também, não só para os cubos.
   */
  { section: 'processo', at: 0.05, state: 'servicesLeft', ease: 'none' },
  { section: 'processo', at: 0.3, state: 'processDrop', ease: 'power2.inOut' },
  { section: 'processo', at: 0.4, state: 'processGone', ease: 'power2.inOut' },
  { section: 'processo', at: 1.0, state: 'processGone', ease: 'none' },
  { section: 'faq', at: 0.5, state: 'faqHidden', ease: 'power2.inOut' },
  { section: 'faq', at: 1.0, state: 'faqHidden', ease: 'none' },
  { section: 'contato', at: 0.0, state: 'ctaReturn', ease: 'power2.inOut' },
  { section: 'contato', at: 0.82, state: 'ctaEncaixe', ease: 'power3.inOut' },
  { section: 'contato', at: 1.0, state: 'ctaClosed', ease: 'power3.out' },
] as const;

/* ------------------------------------------------------ movimento reduzido -- */

/**
 * A trilha sob `prefers-reduced-motion: reduce` — §14: "o símbolo assume o
 * estado-chave da seção AO ENTRAR, por transição de 300ms; sem scrub".
 *
 * Uma âncora por seção, todas em `at: 0`, exatamente como a do mobile — e pelo
 * mesmo motivo estrutural: sob movimento reduzido nenhuma seção fica presa
 * (§14), a altura de cada uma é a do conteúdo e o curso de rolagem
 * (`altura − uma tela`) é próximo de zero. Frações internas colapsam todas no
 * mesmo pixel.
 *
 * ISSO NÃO ERA UM DETALHE. Com a trilha do desktop, as três âncoras do Contato
 * caíam no mesmo pixel, `resolveTrack` descartava as coincidentes e as duas
 * últimas poses sumiam: medido, a última pose alcançada em toda a página era
 * `ctaReturn`, com a metade direita a 55% de opacidade a caminho. O `( )`
 * NUNCA se reconstituía — o fechamento da narrativa simplesmente não existia
 * para quem pede movimento reduzido.
 *
 * As seis poses cobrem o arco inteiro `( ) → ( → ( )`, que é o que o §18 pede
 * ("o símbolo ainda conta a narrativa em estados discretos"). São os cinco
 * estados-chave do §7.3 mais o `faqHidden`, que entrou depois.
 */
export const REDUCED_TRACK: readonly Keyframe[] = [
  { section: 'hero', at: 0, state: 'hero' },
  { section: 'problema', at: 0, state: 'problemOpen' },
  { section: 'servicos', at: 0, state: 'servicesLeft' },
  { section: 'processo', at: 0, state: 'processGone' },
  { section: 'faq', at: 0, state: 'faqHidden' },
  { section: 'contato', at: 0, state: 'ctaClosed' },
] as const;

/** A condição em que a coreografia deixa de acompanhar a rolagem. */
export const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/* -------------------------------------------------------------- tela baixa -- */

/**
 * O CTA quando a tela é larga mas BAIXA (≥900px de largura, <880px de altura).
 *
 * Só a altura muda; a peça continua com a escala 0,80 e o reencontro continua
 * horizontal. O que muda é a LINHA em que ela fecha.
 *
 * Os 39,5vh do `ctaClosed` foram calibrados numa tela de 941px, onde a peça
 * fecha em cima e o formulário fica abaixo dela. Numa de 768 essa composição
 * não cabe — o botão "Enviar" ficava 87px abaixo da dobra, e como a seção fica
 * presa em 100dvh isso o tornava inalcançável. A composição passa a se apoiar
 * na largura: chamada à esquerda, peça no meio, formulário à direita
 * (app/page.module.css).
 *
 * Com as três coisas lado a lado, a peça deixa de ter razão para ficar alta: em
 * 39,5vh de 768 a tinta dela começava em 121px e os 23 primeiros ficavam atrás
 * do header. Em 50vh ela fica centrada na mesma linha em que a casca centra as
 * duas colunas — a folga da casca é simétrica justamente para que as duas
 * coincidam em qualquer altura, sem número mágico dos dois lados.
 */
export const CTA_BAIXA = {
  ctaReturn: {
    left: { x: 34.0, y: 50.0, scale: 0.89, opacity: 1 },
    right: { x: 72.0, y: 50.0, scale: 0.89, opacity: 0.55 },
    shadow: 0.3,
  },
  ctaEncaixe: {
    left: { x: 50.0, y: 50.0, scale: 0.812, opacity: 1 },
    right: { x: 50.0, y: 50.0, scale: 0.812, opacity: 1 },
    shadow: 0.42,
  },
  ctaClosed: {
    left: { x: 50.0, y: 50.0, scale: 0.8, opacity: 1 },
    right: { x: 50.0, y: 50.0, scale: 0.8, opacity: 1 },
    shadow: 0.45,
  },
} as const satisfies Partial<Record<SymbolStateName, SymbolState>>;

/** A faixa em que o CTA troca de eixo. Igual à do §12 e à do CSS. */
export const BAIXA_QUERY = '(width >= 900px) and (height < 880px)';

/* ------------------------------------------------------------------ mobile -- */

/**
 * A coreografia abaixo de 900px — §12: "marca d'água atrás do conteúdo, 2
 * estados apenas (aberto/fechado)".
 *
 * São DUAS poses, e só duas, contra as dez do desktop. Não é a coreografia
 * grande com menos quadros: é outro desenho, porque abaixo de 900px nada fica
 * preso, a coluna de texto ocupa a largura toda e a peça deixa de ser
 * protagonista para virar fundo. O §12 abre o capítulo dizendo exatamente isso
 * — "mobile não é desktop reduzido".
 *
 * CENTRADA, e não à direita. No desktop a peça vive na metade direita porque a
 * coluna de texto ocupa a esquerda; numa tela de 390px não há duas colunas, e
 * uma marca d'água descentrada lê como recorte mal posicionado. O §9.2 já
 * pedia "centralizado".
 *
 * ESCALA 1,25, o número do §9.2 — mas relativa a um `--symbol-size` que é
 * outro abaixo de 900px (ver styles/tokens.css). A escala do desktop nasce de
 * 33,33vw medidos nas referências; a 390px isso são 130px de peça, que sobre
 * uma tela inteira de texto não lê como marca d'água e sim como um glifo
 * perdido — foi o que a captura da Fase 11 mostrou. O que muda é a base; o
 * 1,25 do plano continua valendo sobre ela.
 */
export const MOBILE_STATES = {
  /** `( )` inteiro, centrado. Hero e CTA. */
  mobileFechado: {
    left: { x: 50, y: 50, scale: 1.25, opacity: 1 },
    right: { x: 50, y: 50, scale: 1.25, opacity: 1 },
    shadow: 0.34,
  },

  /**
   * Metades afastadas, o vão hospedando o texto. Problema, Serviços e Processo.
   *
   * A separação é HORIZONTAL e simétrica, como a do §4.1. ±14vw sobre o centro
   * põe cada crescente encostada na sua margem sem que nenhuma das duas saia
   * inteira de tela — o que aconteceria com a separação do desktop (53,8 e
   * 74,2vw), medida numa tela três vezes mais larga.
   */
  mobileAberto: {
    left: { x: 36, y: 50, scale: 1.25, opacity: 1 },
    right: { x: 64, y: 50, scale: 1.25, opacity: 1 },
    shadow: 0.24,
  },
} as const satisfies Record<string, SymbolState>;

export type MobileStateName = keyof typeof MOBILE_STATES;

/**
 * A trilha do mobile. Uma âncora por seção, e todas em `at: 0`.
 *
 * Isso NÃO é preguiça — é a consequência de não haver tela presa. Abaixo de
 * 900px a seção tem a altura do conteúdo, quase sempre uma tela, e o curso de
 * rolagem (`altura − uma tela`, ver lib/scroll/boundaries.ts) é próximo de
 * zero. Frações internas colapsariam todas no mesmo pixel e trechos inteiros da
 * trilha sumiriam sem erro nenhum. Ancorando no TOPO de cada seção, cada
 * transição ganha exatamente uma seção de rolagem para acontecer.
 *
 * SEM o `faqHidden` do desktop. O §9.6 tira a peça de cena no FAQ porque lá a
 * composição é de duas colunas e a peça não tem onde ficar; abaixo de 900px é
 * uma coluna só, e o FAQ é a única seção com curso suficiente para o reencontro
 * das metades ser VISTO. Escondê-la ali faria o `( )` se reconstituir atrás de
 * uma opacidade 0 e reaparecer pronto — o fechamento da narrativa acontecendo
 * onde ninguém olha. Ver o desvio registrado no relatório da fase.
 */
export const MOBILE_TRACK: readonly Keyframe<MobileStateName>[] = [
  { section: 'hero', at: 0, state: 'mobileFechado' },
  { section: 'problema', at: 0, state: 'mobileFechado', ease: 'none' },
  { section: 'servicos', at: 0, state: 'mobileAberto', ease: 'power2.inOut' },
  { section: 'processo', at: 0, state: 'mobileAberto', ease: 'none' },
  { section: 'faq', at: 0, state: 'mobileAberto', ease: 'none' },
  { section: 'contato', at: 0, state: 'mobileFechado', ease: 'power2.inOut' },
  { section: 'contato', at: 1, state: 'mobileFechado', ease: 'none' },
] as const;

/** A largura em que a coreografia troca de desenho. Igual à do §12 e do CSS. */
export const MOBILE_QUERY = '(width < 900px)';

/** Estado inicial, aplicado por CSS no servidor — antes de qualquer JS. */
export const INITIAL_STATE = SYMBOL_STATES[SYMBOL_TRACK[0]?.state ?? 'hero'];

/**
 * Estado inicial abaixo de 900px.
 *
 * Precisa existir em CSS pelo mesmo motivo que o do desktop: sem ele a peça é
 * pintada na pose do hero de desktop — 66,65vw, escala 1 — e salta para o
 * centro no primeiro quadro em que o JS assume. `components/symbol/SymbolStage.tsx`
 * emite isto como media query, para que os números continuem existindo só aqui.
 */
export const MOBILE_INITIAL_STATE = MOBILE_STATES[MOBILE_TRACK[0]?.state ?? 'mobileFechado'];
