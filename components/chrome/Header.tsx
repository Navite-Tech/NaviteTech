'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { navAcao, navCentrais, navItems } from '@/lib/content/nav';
import { Wordmark } from './Wordmark';
import styles from './Header.module.css';

/**
 * Header flutuante.
 *
 * Marca à esquerda, navegação no centro óptico da barra, Contato como AÇÃO à
 * direita — uma palavra e um traço, não um botão. A divisão entre "central" e
 * "ação" vem de lib/content/nav.ts, não daqui: é decisão de conteúdo.
 *
 * A partir de 60px de rolagem a barra condensa — 8px mais baixa, opaca e com
 * desfoque. É uma diferença que se percebe sem virar protagonista, e como o
 * espaço reservado no topo (`--header-height`) não muda, condensar não move um
 * pixel do conteúdo.
 */
export function Header() {
  const pathname = usePathname();
  const naHome = pathname === '/';
  const ancora = (id: string) => (naHome ? `#${id}` : `/#${id}`);
  const [condensed, setCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const painel = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  /*
   * Foco preso dentro do painel enquanto ele estiver aberto (§9.1).
   *
   * O painel cobre o conteúdo e o resto da página continua atrás dele. Sem
   * isto, o Tab sai do menu e vai para links que estão visualmente cobertos: o
   * foco desaparece da vista do usuário e volta a aparecer várias paradas
   * depois, sem que nada na tela explique onde ele foi parar.
   *
   * O ciclo é feito no `keydown`, e não com `inert` no resto da página, porque
   * o painel é irmão do conteúdo dentro do `<header>` — marcar tudo o mais como
   * inerte exigiria alcançar `<main>` e o rodapé a partir daqui, o que
   * espalharia a responsabilidade do menu por três lugares.
   */
  useEffect(() => {
    if (!menuOpen) return;

    const foco = () =>
      Array.from(
        painel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );

    // O primeiro link recebe o foco na abertura: sem isso o Tab seguinte iria
    // para o que vem DEPOIS do botão no DOM, e o menu abriria sem ninguém dentro.
    foco()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        // Devolve o foco a quem abriu — senão ele cai no <body> e a próxima
        // tabulação recomeça do topo da página.
        botao.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;

      const itens = [botao.current, ...foco()].filter((el): el is HTMLElement => el !== null);
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (!primeiro || !ultimo) return;

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className={`${styles.root} ${condensed ? styles.condensed : ''}`}>
      <div className={styles.barra}>
        <Link href="/" className={styles.brand} aria-label="Navite Tech — início">
          <Wordmark height={28} title={null} />
        </Link>

        <nav className={styles.nav} aria-label="Principal">
          <ul className={styles.list}>
            {navCentrais.map((item) => (
              <li key={item.target}>
                <Link href={ancora(item.target)} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {navAcao && (
          <a
            href={navAcao.href ?? ancora(navAcao.target)}
            className={styles.acao}
            {...(navAcao.href ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {navAcao.label}
            <span className={styles.seta} aria-hidden="true" />
          </a>
        )}

        <button
          ref={botao}
          type="button"
          className={styles.toggle}
          aria-expanded={menuOpen}
          aria-controls="menu-mobile"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="visually-hidden">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div ref={painel} id="menu-mobile" className={styles.panel} hidden={!menuOpen}>
        <ul className={styles.panelList}>
          {navItems.map((item) => (
            <li key={item.target}>
              {item.href ? (
                <a
                  href={item.href}
                  className={styles.panelLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setMenuOpen(false);
                    botao.current?.focus();
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={ancora(item.target)}
                  className={styles.panelLink}
                  onClick={() => {
                    setMenuOpen(false);
                    botao.current?.focus();
                  }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
