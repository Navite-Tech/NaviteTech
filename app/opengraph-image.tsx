import { ImageResponse } from 'next/og';

export const alt = 'Navite Tech — Tecnologia para o que precisa funcionar melhor';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Cartão de marca. Sem foto de projeto, sem número, sem cidade —
 * só o que o site já afirma no H1.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#00101e',
        padding: 88,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            color: '#f2efea',
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          NAVITE
        </div>
        <div
          style={{
            color: '#a79e7b',
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: '0.22em',
          }}
        >
          TECH
        </div>
      </div>
      <div
        style={{
          marginTop: 56,
          color: '#f2efea',
          fontSize: 32,
          lineHeight: 1.25,
          maxWidth: 820,
        }}
      >
        Tecnologia para o que precisa funcionar melhor.
      </div>
    </div>,
    { ...size },
  );
}
