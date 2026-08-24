/**
 * Arte do Método — COPIA references/doProblemaAoFuncionaSection para
 * public/art/processo, byte a byte.
 *
 * ESTE ARQUIVO DEIXOU DE TRANSCODIFICAR NA FASE 16, e a remoção é a correção.
 *
 * A versão anterior fazia `resize({ width: 1200 })` seguido de `webp({ quality:
 * 78 })`. As duas coisas eram defeito, e o segundo era grave:
 *
 *   UPSCALE. As origens medem 736 de largura. Levar a 1200 é 1,63× de
 *   ampliação, e lanczos não inventa detalhe: o que saía eram 3 megapixels de
 *   pixel interpolado onde havia 1,1 de pixel real.
 *
 *   SEGUNDA GERAÇÃO DE PERDA. Medido nos arquivos que este script produzia:
 *
 *     entenderReference.jpg   736 x 1553   63 KB   (1,14 MP)
 *     entender.webp          1200 x 2532   42 KB   (3,04 MP)
 *
 *   33% MENOS BYTES que o JPEG de origem para o mesmo conteúdo real — e a maior
 *   parte deles gasta nos pixels interpolados. O `next/image` então reencodava
 *   uma terceira vez.
 *
 * E havia uma quarta perda, fora daqui, que é a maior de todas e vale anotada:
 * `next/image` encoda AVIF em `quality - 20`, com `effort: 3`
 * (node_modules/next/dist/server/image-optimizer.js). Com `formats:
 * ['image/avif', ...]` no next.config.ts, um `quality={78}` no componente
 * entrega AVIF q58. Ver a prop `quality` em components/process/ProcessStage.tsx.
 *
 * O que sobrou, então, é uma CÓPIA. O JPEG de origem é a fonte que o
 * `next/image` otimiza, e a única geração de perda que resta é a dele.
 *
 * O script imprime o SHA-256 dos dois lados. Se os hashes divergirem, alguém
 * reintroduziu tratamento — e o objetivo é justamente que isso seja visível.
 *
 *   npm run build:art
 */
const { mkdirSync, copyFileSync, readFileSync, statSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');

const SRC = 'references/doProblemaAoFuncionaSection';
const OUT = 'public/art/processo';

const ARTES = [
  { id: 'entender', src: 'entenderReference.jpg' },
  { id: 'definir', src: 'definirReference.jpg' },
  { id: 'construir', src: 'construirReference.jpg' },
  { id: 'evoluir', src: 'evoluirReference.jpg' },
];

const sha = (arquivo) => createHash('sha256').update(readFileSync(arquivo)).digest('hex');

function uma(arte) {
  const src = path.join(SRC, arte.src);
  const dest = path.join(OUT, `${arte.id}.jpg`);

  copyFileSync(src, dest);

  const a = sha(src);
  const b = sha(dest);
  if (a !== b) throw new Error(`${dest} não é cópia fiel de ${src}`);

  const kb = (statSync(dest).size / 1024).toFixed(0);
  console.log(
    `  ${dest.padEnd(32)} ${kb.padStart(4)} KB  sha ${a.slice(0, 12)} = ${b.slice(0, 12)}`,
  );
}

mkdirSync(OUT, { recursive: true });
console.log('arte do Metodo — copia fiel, sem reencode, sem resize, sem tratamento de cor');
for (const arte of ARTES) uma(arte);
