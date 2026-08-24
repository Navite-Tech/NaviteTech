/**
 * Gera public/brand/grain.png — textura de grão tileável do material do símbolo.
 *
 * O render de referência tem uma granulação fina de gesso/pedra. Reproduzimos
 * com um tile pequeno em `<pattern>`, não com `feTurbulence`: filtro SVG
 * re-rasteriza a cada mudança de escala, e o símbolo passa a página inteira
 * sendo escalado. Um tile é rasterizado uma vez e reaproveitado.
 *
 * O ruído é gerado com valor por célula + interpolação suave e envolvimento
 * toroidal, então o tile casa consigo mesmo nas quatro bordas.
 *
 *   node tools/build-grain.cjs
 */
const fs = require('node:fs');
const zlib = require('node:zlib');

const SIZE = 96; // lado do tile
const CELLS = 24; // células de ruído por lado (precisa dividir SIZE)
const OCTAVES = 3;
/*
 * O tile é usado em `multiply`. Centrado no cinza médio (128) ele escurecia a
 * peça ~8% de forma UNIFORME — o que apareceu na medição como faixa dinâmica
 * despencando de 62 para 34. Centrado perto do branco, multiplicar vira textura
 * em vez de filtro de densidade.
 */
const CENTER = 238;
const CONTRAST = 16; // amplitude em torno de CENTER

// --- ruído de valor, toroidal --------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(cells, seed) {
  const rnd = mulberry32(seed);
  const grid = Array.from({ length: cells * cells }, () => rnd());
  return (x, y) => {
    // x,y em [0,1). Envolvimento pelo módulo garante que o tile case nas bordas.
    const fx = x * cells,
      fy = y * cells;
    const x0 = Math.floor(fx) % cells,
      y0 = Math.floor(fy) % cells;
    const x1 = (x0 + 1) % cells,
      y1 = (y0 + 1) % cells;
    const tx = smooth(fx - Math.floor(fx));
    const ty = smooth(fy - Math.floor(fy));
    const a = grid[y0 * cells + x0],
      b = grid[y0 * cells + x1];
    const c = grid[y1 * cells + x0],
      d = grid[y1 * cells + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
}

const octaves = Array.from({ length: OCTAVES }, (_, i) =>
  valueNoise(CELLS * Math.pow(2, i), 1337 + i * 991),
);

// --- amostra em escala de cinza -------------------------------------------
const gray = new Uint8Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let v = 0,
      amp = 1,
      total = 0;
    for (const n of octaves) {
      v += n(x / SIZE, y / SIZE) * amp;
      total += amp;
      amp *= 0.5;
    }
    v = v / total; // [0,1]
    gray[y * SIZE + x] = Math.max(0, Math.min(255, Math.round(CENTER + (v - 0.5) * 2 * CONTRAST)));
  }
}

// --- encoder PNG mínimo (greyscale de 8 bits) ------------------------------
function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // profundidade
ihdr[9] = 0; // tipo de cor: greyscale
ihdr[10] = 0; // compressão
ihdr[11] = 0; // filtro
ihdr[12] = 0; // sem entrelaçamento

// scanlines com filtro 0 (None) — o ruído não se beneficia de predição
const raw = Buffer.alloc((SIZE + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE + 1)] = 0;
  Buffer.from(gray.subarray(y * SIZE, (y + 1) * SIZE)).copy(raw, y * (SIZE + 1) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/grain.png', png);

// --- verificação da costura ------------------------------------------------
// Um tile só é realmente contínuo se o salto na costura for indistinguível do
// salto típico entre pixels vizinhos no interior. Comparar valores absolutos
// não diz nada: o ruído varia de qualquer jeito.
const at = (x, y) => gray[y * SIZE + x];
let interiorSum = 0,
  interiorN = 0;
for (let y = 0; y < SIZE; y++)
  for (let x = 0; x < SIZE - 1; x++) {
    interiorSum += Math.abs(at(x, y) - at(x + 1, y));
    interiorN++;
  }
let seamSum = 0;
for (let y = 0; y < SIZE; y++) seamSum += Math.abs(at(SIZE - 1, y) - at(0, y));
const interior = interiorSum / interiorN;
const seam = seamSum / SIZE;

const min = Math.min(...gray),
  max = Math.max(...gray);

console.log(`grain.png — ${SIZE}x${SIZE} greyscale, ${(png.length / 1024).toFixed(1)} KB`);
console.log(`  faixa de valores: ${min}..${max} (centro ${CENTER}, contraste ±${CONTRAST})`);
console.log(
  `  escurecimento médio ao multiplicar: ${(100 * (1 - gray.reduce((s2, v) => s2 + v, 0) / gray.length / 255)).toFixed(1)}%`,
);
console.log(
  `  delta médio entre vizinhos — interior ${interior.toFixed(2)}, costura ${seam.toFixed(2)}`,
);
console.log(
  `  ${seam <= interior * 1.5 ? 'costura indistinguível do interior: OK' : 'COSTURA VISÍVEL'}`,
);
