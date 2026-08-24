import styles from './Eyebrow.module.css';

type Props = {
  children: React.ReactNode;
  as?: 'p' | 'span' | 'div';
  className?: string;
};

/** Microtipografia de marca: caixa alta, tracking largo, geométrica. */
export function Eyebrow({ children, as: Tag = 'p', className }: Props) {
  return <Tag className={[styles.root, className].filter(Boolean).join(' ')}>{children}</Tag>;
}
