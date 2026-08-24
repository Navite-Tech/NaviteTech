import Link from 'next/link';
import styles from './PillButton.module.css';

type Common = {
  children: React.ReactNode;
  /** Seta `→` ao final, como no botão do hero-reference.png. */
  arrow?: boolean;
  variant?: 'outline' | 'solid';
  className?: string;
};

type AsLink = Common & { href: string; onClick?: never; type?: never; disabled?: never };
type AsButton = Common & {
  href?: never;
  onClick?: () => void;
  type?: 'button' | 'submit';
  /** Só faz sentido no `<button>`: um link desabilitado não existe em HTML. */
  disabled?: boolean;
};

/**
 * Botão pílula com borda de 1px — 212×49px na referência do hero.
 *
 * Renderiza `<a>` quando há destino e `<button>` quando há ação. Nunca uma div
 * clicável.
 */
export function PillButton(props: AsLink | AsButton) {
  const { children, arrow = true, variant = 'outline', className } = props;
  const cls = [styles.root, styles[variant], className].filter(Boolean).join(' ');
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      {arrow && (
        <svg
          className={styles.arrow}
          viewBox="0 0 24 12"
          width="24"
          height="12"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0 6h21M16 1l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  );

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={cls}
    >
      {inner}
    </button>
  );
}
