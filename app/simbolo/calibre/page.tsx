import type { Metadata } from 'next';
import { SymbolDefs } from '@/components/symbol/SymbolDefs';
import { SymbolHalf } from '@/components/symbol/SymbolHalf';
import { SYMBOL_VIEWBOX } from '@/lib/symbol/geometry';
import { CRESCENT_RELIEF_BBOX } from '@/lib/symbol/light';

export const metadata: Metadata = {
  title: 'Calibre do símbolo',
  robots: { index: false, follow: false },
};

/**
 * Recorte calibrado da crescente esquerda, para comparação pixel a pixel com o
 * mesmo recorte do hero-reference.png.
 *
 * A crescente é desenhada com a ALTURA exata do alvo e ancorada em (0,0), então
 * a captura desta página já está alinhada por construção — nada de posicionar a
 * mão e torcer para bater.
 *
 * O alinhamento usa a caixa do RELEVO, não a da face: no render de referência o
 * pixel mais à esquerda do arco é parede de extrusão, e alinhar pela face jogava
 * a banda para fora do recorte (a área medida caía 19%).
 *
 * Alvo medido no hero-reference.png: a crescente esquerda ocupa 277×516px.
 * Casamos a altura; a largura sai ~1,5% menor porque o render de referência é um
 * objeto 3D fotografado com leve perspectiva, e o vetor não tem perspectiva.
 */
const TARGET = { w: 277, h: 516 };

export default function CalibrePage() {
  // Escala do SVG para que o relevo desenhado tenha exatamente TARGET.h
  const svgSize = (TARGET.h * SYMBOL_VIEWBOX) / CRESCENT_RELIEF_BBOX.h;
  const unit = svgSize / SYMBOL_VIEWBOX;
  const offsetX = -CRESCENT_RELIEF_BBOX.x * unit;
  const offsetY = -CRESCENT_RELIEF_BBOX.y * unit;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        backgroundColor: 'var(--navy-900)',
        overflow: 'hidden',
        // acima do header fixo, para a captura sair limpa
        zIndex: 'var(--z-overlay)',
      }}
    >
      <SymbolDefs />
      <div
        id="calibre"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          inlineSize: `${TARGET.w}px`,
          blockSize: `${TARGET.h}px`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${offsetX}px`,
            top: `${offsetY}px`,
            inlineSize: `${svgSize}px`,
            blockSize: `${svgSize}px`,
          }}
        >
          <SymbolHalf side="left" />
        </div>
      </div>
    </div>
  );
}
