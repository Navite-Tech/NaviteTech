/**
 * Critério de aceite da Fase 2: contraste ≥ AA em todos os pares de tokens
 * que o design realmente usa.
 *
 * Lê os valores direto de styles/tokens.css — se um token mudar, este script
 * mede o novo valor, não um número copiado à mão.
 *
 *   node tools/check-contrast.cjs
 */
const fs = require('node:fs');

const css = fs.readFileSync('styles/tokens.css', 'utf8');

/** Extrai `--nome: #hex;` do :root. */
function readToken(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`token --${name} não encontrado ou não é hex`);
  return m[1];
}

function toRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/** Luminância relativa, WCAG 2.1. */
function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Pares que existem de fato no design, com o tamanho em que aparecem.
 * `large` = ≥24px ou ≥18,66px bold, cujo mínimo AA é 3:1 em vez de 4,5:1.
 */
const PAIRS = [
  { fg: 'bone', bg: 'navy-900', use: 'tipografia principal sobre o fundo', large: false },
  { fg: 'bone', bg: 'navy-800', use: 'tipografia sobre superfície de seção', large: false },
  { fg: 'bone', bg: 'navy-700', use: 'tipografia sobre card', large: false },
  { fg: 'text-muted', bg: 'navy-900', use: 'corpo secundário', large: false },
  { fg: 'text-muted', bg: 'navy-800', use: 'corpo secundário em seção', large: false },
  { fg: 'brass', bg: 'navy-900', use: 'microtipografia, tags, indicadores', large: false },
  { fg: 'brass', bg: 'navy-800', use: 'microtipografia em seção', large: false },
  { fg: 'brass', bg: 'navy-700', use: 'microtipografia sobre superfície elevada', large: false },
  { fg: 'sage', bg: 'navy-900', use: 'palavra destacada em headline', large: true },
  { fg: 'sage', bg: 'navy-800', use: 'palavra destacada em headline', large: true },

  /*
   * A pill de capacidade, no card de Serviços.
   *
   * Era uma lista em brass sobre o interior do card (o par brass/navy-700 acima,
   * que perdeu esse uso na Fase 15). Agora é bone sólido com texto navy, e o par
   * a verificar é o inverso do botão.
   */
  { fg: 'navy-900', bg: 'bone', use: 'pill de capacidade no card', large: false },

  /*
   * O acento editorial sobre ARTE CLARA.
   *
   * Não há token de fundo aqui — o fundo é a fotografia, e por isso o número que
   * governa foi medido na própria imagem: as zonas de título das artes 01 e 02
   * têm L 0,70 e 0,44. `bone` é o pior caso claro dessa faixa e serve de
   * referência conservadora: se o acento passa contra bone, passa contra elas.
   *
   * O `--sage` padrão mede 2,2:1 nessa condição e por isso não é usado ali.
   */
  { fg: 'sage-deep', bg: 'bone', use: 'palavra destacada sobre arte clara', large: true },
  { fg: 'text-faint', bg: 'navy-900', use: 'legal e rótulos de apoio', large: false },
  { fg: 'navy-900', bg: 'brass', use: 'botão sólido', large: false },
  { fg: 'erro', bg: 'navy-900', use: 'mensagem de erro do formulário', large: false },
];

const AA_NORMAL = 4.5;
const AA_LARGE = 3;
const AAA_NORMAL = 7;

let failures = 0;
console.log('Contraste dos pares de token usados no design (WCAG 2.1)\n');
console.log('  par                                  ratio    mínimo   nível');
console.log('  ' + '-'.repeat(66));

for (const p of PAIRS) {
  const fg = readToken(p.fg);
  const bg = readToken(p.bg);
  const r = ratio(fg, bg);
  const min = p.large ? AA_LARGE : AA_NORMAL;
  const pass = r >= min;
  if (!pass) failures++;
  const level = r >= AAA_NORMAL ? 'AAA' : r >= AA_NORMAL ? 'AA' : r >= AA_LARGE ? 'AA grande' : '—';
  const name = `${p.fg} sobre ${p.bg}`;
  console.log(
    `  ${name.padEnd(34)} ${r.toFixed(2).padStart(6)}  ${String(min).padStart(6)}   ${level.padEnd(9)} ${pass ? '' : '<-- FALHOU'}`,
  );
}

console.log('\n  uso de cada par:');
for (const p of PAIRS) console.log(`    ${(p.fg + ' / ' + p.bg).padEnd(34)} ${p.use}`);

console.log(
  `\nRESULTADO: ${failures === 0 ? 'APROVADO' : `REPROVADO (${failures} par(es) abaixo do mínimo)`}`,
);
process.exit(failures === 0 ? 0 : 1);
