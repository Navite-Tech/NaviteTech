export type NavItem = {
  /** Rótulo exibido. */
  label: string;
  /** id da seção correspondente em app/page.tsx. */
  target: string;
  /** Link externo. Quando definido, substitui `#${target}`. */
  href?: string;
  /**
   * O item é a AÇÃO do header — o único que não fica na navegação central.
   *
   * A distinção mora aqui, e não no componente, porque ela é editorial: quem
   * decide que Contato é a ação da barra é o conteúdo do menu, não o layout.
   * O painel mobile continua listando os quatro em ordem.
   */
  acao?: true;
};

/**
 * "Cases" aparece no menu do hero-reference.png, mas não existe seção nem
 * conteúdo de cases nesta entrega — então não entra. Ver §5 do plano.
 *
 * São QUATRO, e o número não é livre: `check:a11y` conta as paradas de foco da
 * página inteira e o header responde por cinco delas (a marca e os quatro
 * itens). Tirar um item reprova a lei; acrescentar, não.
 */
const WHATSAPP_CONTATO =
  'https://wa.me/5519983715207?text=' +
  encodeURIComponent(
    'Olá! Vi o site da Navite Tech e quero contar sobre um problema que preciso resolver.',
  );

export const navItems: readonly NavItem[] = [
  { label: 'Soluções', target: 'servicos' },
  { label: 'Processo', target: 'processo' },
  { label: 'FAQ', target: 'faq' },
  { label: 'Contato', target: 'contato', href: WHATSAPP_CONTATO, acao: true },
];

/** Os itens da navegação central — todos menos a ação. */
export const navCentrais = navItems.filter((i) => !i.acao);

/** A ação da direita. `undefined` seria um erro de conteúdo, não de layout. */
export const navAcao = navItems.find((i) => i.acao);
