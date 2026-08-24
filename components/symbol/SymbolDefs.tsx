import { CRESCENT_PATH, CRESCENT_PATH_ROTATED } from '@/lib/symbol/geometry';
import { EXTRUDE_PATH, EXTRUDE_PATH_ROTATED } from '@/lib/symbol/extrude';
import { lightAxisFor } from '@/lib/symbol/light';

const SIDES = ['left', 'right'] as const;
const CONTOUR = { left: CRESCENT_PATH, right: CRESCENT_PATH_ROTATED };
const WALL = { left: EXTRUDE_PATH, right: EXTRUDE_PATH_ROTATED };

/**
 * Gradientes, padrão de grão e máscaras do relevo do símbolo.
 *
 * Renderizado UMA vez no documento; as duas metades referenciam por id. Tudo em
 * `userSpaceOnUse`, com o eixo de cada metade ancorado na caixa dela e apontando
 * na mesma direção global de luz (ver lib/symbol/light.ts).
 *
 * Nenhum filtro SVG aqui de propósito: `feDiffuseLighting`/`feTurbulence` dariam
 * um bisel mais convincente, mas re-rasterizam a cada mudança de escala — e o
 * símbolo é escalado durante a página inteira. Toda a luz é pintura estática.
 */
export function SymbolDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        {SIDES.map((side) => {
          const axis = lightAxisFor(side);
          return (
            <g key={side}>
              {/*
                Cada geometria aparece UMA vez por metade; as camadas referenciam
                por `<use>`.

                A parede da extrusão é um path PRÓPRIO, pré-calculado em tempo de
                build (tools/build-extrude.cjs), não N cópias do contorno. A
                versão em 16 cópias era visualmente idêntica e custava o dobro do
                tempo de quadro durante as transições — ver o comentário do
                gerador.
              */}
              <path id={`navite-crescent-${side}`} d={CONTOUR[side]} />
              <path id={`navite-wall-${side}`} d={WALL[side]} fillRule="nonzero" />
              {/*
                Face frontal. As paradas reproduzem a rampa medida na referência
                em função da posição ao longo do eixo de luz — ver
                tools/fit-light-ramp.cjs.
              */}
              <linearGradient id={`navite-face-${side}`} gradientUnits="userSpaceOnUse" {...axis}>
                <stop offset="0" stopColor="var(--face-lit)" />
                <stop offset="0.22" stopColor="var(--face-mid)" />
                <stop offset="0.48" stopColor="var(--face-shade)" />
                <stop offset="0.8" stopColor="var(--face-deep)" />
              </linearGradient>

              {/*
                Parede da extrusão. Precisa ler como FACE ILUMINADA de lado, não
                como sombra projetada: escura demais e a peça vira um adesivo com
                drop shadow. Fica ~15% abaixo da face frontal, não 40%.
              */}
              <linearGradient
                id={`navite-extrude-${side}`}
                gradientUnits="userSpaceOnUse"
                {...axis}
              >
                <stop offset="0" stopColor="var(--extrude-lit)" />
                <stop offset="0.22" stopColor="var(--extrude-mid)" />
                <stop offset="0.48" stopColor="var(--extrude-shade)" />
                <stop offset="0.8" stopColor="var(--extrude-deep)" />
              </linearGradient>

              {/*
                Rampa do highlight de aresta.

                É a PINTURA do traço, não uma máscara. Uma `<mask>` obriga o
                navegador a um passe de composição extra a cada rasterização, e
                a peça re-rasteriza a cada mudança de escala — sozinha, a
                máscara custava 7 fps durante as transições. Um gradiente com
                opacidade nas paradas produz exatamente o mesmo resultado
                visual: o traço aparece só nas arestas voltadas para a luz.
              */}
              <linearGradient
                id={`navite-edge-ramp-${side}`}
                gradientUnits="userSpaceOnUse"
                {...axis}
              >
                <stop offset="0" stopColor="#fffdf8" stopOpacity="1" />
                <stop offset="0.26" stopColor="#fffdf8" stopOpacity="0.6" />
                <stop offset="0.52" stopColor="#fffdf8" stopOpacity="0.08" />
                <stop offset="0.74" stopColor="#fffdf8" stopOpacity="0" />
              </linearGradient>
            </g>
          );
        })}

        {/* Grão do material — tile gerado por tools/build-grain.cjs. */}
        <pattern
          id="navite-grain"
          patternUnits="userSpaceOnUse"
          width="96"
          height="96"
          patternContentUnits="userSpaceOnUse"
        >
          <image href="/brand/grain.png" width="96" height="96" preserveAspectRatio="none" />
        </pattern>

        {/* Sombra de contato, elíptica e difusa, sob o símbolo. */}
        <radialGradient id="navite-contact" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
