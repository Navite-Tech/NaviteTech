/**
 * Arte dos cards de Serviços — GERA public/art/servicos/*.webp.
 *
 * ESTE ARQUIVO NÃO TRATA COR. É de propósito, e é a correção da Fase 14.
 *
 * A versão anterior passava as quatro origens por inversão de luminância, curva
 * em S, vinheta e um duotone de três paradas cuja sombra era SEMPRE --navy-900 e
 * cuja alta-luz era SEMPRE próxima de --bone. O resultado foi o oposto do
 * pretendido: o vidro esmeralda da 01 saía verde-oliva sobre navy, e a malha
 * dourada da 04 saía creme. Quatro imagens escolhidas por direção de arte viravam
 * quatro variações da mesma imagem.
 *
 * A lógica agora é a inversa: a NAVITE fornece o sistema — tipografia, numeral,
 * bordas, spacing, pills, motion, símbolo —, e as IMAGENS fornecem a direção de
 * arte, na cor delas. A unidade entre os quatro cards vem da interface em volta,
 * nunca da recoloração da fotografia.
 *
 * O que sobrou, então, é só geometria:
 *
 *   crop   → as origens medem 736 x ~1600 (razão 0,47) e o card mede 0,73..0,81
 *            conforme o viewport. Chegar a 3:4 custa uma janela de 981px de
 *            altura, e a única decisão é ONDE ela cai. Foi decidida por medição,
 *            não a olho: `tools/../scratchpad/zonas.mjs` mediu a luminância das
 *            zonas onde título e numeral moram, em seis janelas por arte, e
 *            `top` abaixo é a que dá o melhor par de contrastes. Os números
 *            medidos estão anotados em cada entrada.
 *   resize → cover em 1200x1600, lanczos3.
 *   webp   → e nada mais. Sem inversão, sem curva, sem vinheta, sem duotone,
 *            sem grão. O laço por pixel que existia aqui desapareceu junto.
 *
 * O enquadramento FINO não mora mais neste arquivo: ele é `object-position` por
 * serviço, em lib/content/services.ts, porque a razão do card varia com o
 * viewport e um número assado no pixel não acompanha isso.
 *
 *   npm run build:art
 */
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const SRC = 'references/OqueConstruimos';
const OUT = 'public/art/servicos';

/**
 * Saída em 3:4 — cobre o card do desktop (0,73..0,81) e o do mobile (~0,71).
 *
 * 1200 de largura para um trilho que mede ~606px a 1672 e ~522px a 1440: é o
 * dobro, que é o que uma tela de 2x pede. As fontes têm 736 de largura, então há
 * upscale — mas são renders de gradiente longo, onde o lanczos não inventa
 * detalhe nenhum.
 *
 * TETO CONHECIDO, e ele não se resolve aqui. 736px de origem para um card de
 * ~606 CSS px significa que uma tela 2x pede 1212px de detalhe e existem 736.
 * Subir a qualidade recupera tudo o que se pode recuperar sem trocar os
 * arquivos de origem; o resto só se resolve com origens de maior resolução.
 * O Método não tem esse teto desde a Fase 16: as peças de lá medem ~316 CSS px,
 * que em tela 2x pedem 632 — dentro dos 736 reais.
 */
const W = 1200;
const H = 1600;

/**
 * `quality` 92 — e os 78 anteriores eram um erro de premissa, corrigido na
 * Fase 16.
 *
 * A nota antiga dizia "o orçamento de ≤180KB por arte SERVIDA é o que manda".
 * Mas o arquivo que este script escreve NÃO É SERVIDO: ele é o INTERMEDIÁRIO
 * que o `next/image` reencoda. Aplicar orçamento de entrega a um master é
 * gastar duas vezes a mesma perda — e a que se paga aqui é a que nunca mais se
 * recupera, porque o otimizador comprime o que já chegou comprimido.
 *
 * O orçamento continua valendo, e continua sendo respeitado — onde ele vive, na
 * prop `quality` de components/services/visuals/ServiceArt.tsx.
 *
 * O QUE MEDIU ISSO. O `next/image` encoda AVIF em `quality - 20`, com
 * `effort: 3` (node_modules/next/dist/server/image-optimizer.js). Com
 * `formats: ['image/avif', ...]` no next.config.ts, o Chrome recebe AVIF: o
 * `quality={82}` do componente entregava AVIF **q62**. Duas gerações — webp 78
 * e avif 62 — sobre origens de gradiente longo e textura fina, que é
 * exatamente o material que encoder alisa primeiro.
 *
 * O CROP NÃO MUDOU e não deve mudar: as janelas abaixo foram medidas por
 * contraste, arte por arte, e são decisão de composição.
 */
const QUALIDADE = 92;

const ARTES = [
  {
    id: 'web',
    src: 'referenceWhatWeBuild01.jpg',
    /*
     * Vidro esmeralda à direita, campo quase branco à esquerda.
     * Medido: título 13,7:1 contra navy · numeral 7,9:1 contra navy.
     * Acima de 0,12 o numeral cai para o corpo escuro do vidro (3,8:1 em 0,20).
     */
    top: 0.1,
  },
  {
    id: 'software',
    src: 'referenceWhatWeBuild02.jpg',
    /*
     * Fitas brass. É a janela com a dobra em S mais estruturada e o melhor PAR
     * de contrastes: título 8,9:1 e numeral 7,8:1 contra navy. Em 0,38 o numeral
     * melhora mas o título cai para 7,1:1.
     */
    top: 0.16,
  },
  {
    id: 'automacao',
    src: 'referenceWhatWeBuild03.jpg',
    /*
     * Seixos azuis vítreos sobre preto. Enquadra o agrupamento inteiro com
     * folga preta nas bordas. Medido: título 12,4:1 e numeral 18,3:1 contra bone.
     */
    top: 0.1,
  },
  {
    id: 'ia',
    src: 'referenceWhatWeBuild04.jpg',
    /*
     * Malha de pontos dourada. A crista de luz corre pela diagonal e o terço
     * esquerdo fica preto, que é onde o título mora: 15,9:1 contra bone; numeral
     * 17,8:1. Depois de 0,16 a crista sobe para o canto do numeral e o derruba.
     */
    top: 0.08,
  },
];

async function uma(arte) {
  const src = path.join(SRC, arte.src);
  const meta = await sharp(src).metadata();

  /* A janela é a mais alta que ainda dá 3:4 com a largura inteira da origem. */
  const altura = Math.round(meta.width / (W / H));
  const top = Math.min(Math.round(meta.height * arte.top), meta.height - altura);

  const dest = path.join(OUT, `${arte.id}.webp`);
  const { size } = await sharp(src)
    .extract({ left: 0, top, width: meta.width, height: altura })
    .resize(W, H, { fit: 'cover', kernel: 'lanczos3' })
    .webp({ quality: QUALIDADE, effort: 6 })
    .toFile(dest);

  console.log(
    `  ${dest.padEnd(34)} ${W}x${H}  janela y ${top}..${top + altura}  ${(size / 1024).toFixed(0)} KB`,
  );
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  console.log('arte dos cards de servicos — sem tratamento de cor');
  for (const arte of ARTES) await uma(arte);
})();
