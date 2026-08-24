/**
 * Gera a PAREDE DA EXTRUSÃO como um único path.
 *
 * Por que existe
 * --------------
 * A parede é a região varrida pelo contorno ao deslizar por `EXTRUDE_OFFSET` —
 * a soma de Minkowski do contorno com esse segmento. Uma cópia só deslocada não
 * serve: onde o arco é mais fino que o deslocamento, a cópia se descola da face
 * e a cúspide aparece bifurcada, com um segundo espeto ao lado.
 *
 * A primeira solução foi varrer em 16 cópias `<use>`. Visualmente correta, mas
 * MEDIDA como o custo inteiro do relevo: qualquer mudança de escala obriga o
 * navegador a rasterizar tudo de novo, e o p95 do tempo de quadro ia de 25ms
 * (linha de base) para 42ms durante as transições. Com uma cópia só, 25ms.
 *
 * Então a varredura é calculada aqui, em tempo de build, e vira um path.
 *
 * Como
 * ----
 * União de: contorno original + contorno deslocado + um quadrilátero por aresta
 * ligando os dois. Todos com a MESMA orientação e `fill-rule="nonzero"`, que
 * nesse caso preenche exatamente a união — sem precisar de algoritmo de
 * booleana de polígonos.
 *
 * O contorno é achatado e depois simplificado por Douglas–Peucker: o arco tem
 * raio ~400, então segmentos de ~50 unidades já ficam abaixo de 1 unidade de
 * erro de corda. Isso derruba o path de dezenas de KB para poucos.
 *
 *   node tools/build-extrude.cjs
 */
const fs = require('node:fs');

const GEOM = 'lib/symbol/geometry.ts';
const LIGHT = 'lib/symbol/light.ts';
const OUT = 'lib/symbol/extrude.ts';

/** Tolerância da simplificação, em unidades de viewBox (o lado tem 1000). */
const TOL = 0.8;

// --- entrada ----------------------------------------------------------------
const geo = fs.readFileSync(GEOM, 'utf8');
const grab = (name) => {
  const m = geo.match(new RegExp(`export const ${name} =\\s*\\n?\\s*'([^']+)'`));
  if (!m) throw new Error(`não achei ${name} em ${GEOM}`);
  return m[1];
};
const PATHS = { left: grab('CRESCENT_PATH'), right: grab('CRESCENT_PATH_ROTATED') };

const light = fs.readFileSync(LIGHT, 'utf8');
const off = light.match(/EXTRUDE_OFFSET = \{ x: (-?[\d.]+), y: (-?[\d.]+)/);
if (!off) throw new Error(`não achei EXTRUDE_OFFSET em ${LIGHT}`);
const V = { x: +off[1], y: +off[2] };

// --- achatamento -------------------------------------------------------------
const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

/** Achata um `d` de M/L/C/Z num polígono fechado. */
function flatten(d, perCurve = 96) {
  const tokens = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g);
  const pts = [];
  let cur = null;
  for (let i = 0; i < tokens.length;) {
    const cmd = tokens[i++];
    if (cmd === 'Z') continue;
    if (cmd === 'M' || cmd === 'L') {
      cur = { x: +tokens[i++], y: +tokens[i++] };
      pts.push(cur);
    } else if (cmd === 'C') {
      const p1 = { x: +tokens[i++], y: +tokens[i++] };
      const p2 = { x: +tokens[i++], y: +tokens[i++] };
      const p3 = { x: +tokens[i++], y: +tokens[i++] };
      for (let k = 1; k <= perCurve; k++) pts.push(bez(cur, p1, p2, p3, k / perCurve));
      cur = p3;
    } else {
      throw new Error(`comando ${cmd} não suportado — o contorno deveria ser só M/L/C/Z`);
    }
  }
  return pts;
}

/** Douglas–Peucker, iterativo. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const A = pts[a];
    const B = pts[b];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const dist = Math.abs((pts[i].x - A.x) * dy - (pts[i].y - A.y) * dx) / len;
      if (dist > worst) {
        worst = dist;
        idx = i;
      }
    }
    if (worst > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * Douglas–Peucker num anel FECHADO.
 *
 * Aplicado direto, o algoritmo degenera: o primeiro e o último ponto do anel
 * praticamente coincidem, a corda entre eles tem comprimento zero e todas as
 * distâncias saem nulas — o contorno inteiro colapsa em dois pontos. A correção
 * é cortar o anel em dois pontos diametralmente afastados e simplificar cada
 * metade como uma polilinha aberta.
 */
function simplifyLoop(pts, tol) {
  const first = pts[0];
  let far = 0;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const dd = (pts[i].x - first.x) ** 2 + (pts[i].y - first.y) ** 2;
    if (dd > best) {
      best = dd;
      far = i;
    }
  }
  const a = simplify(pts.slice(0, far + 1), tol);
  const b = simplify(pts.slice(far), tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const area = (p) => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    s += p[i].x * q.y - q.x * p[i].y;
  }
  return s / 2;
};

// --- construção da varredura -------------------------------------------------
const n = (v) => (Math.abs(v) < 0.005 ? '0' : v.toFixed(2).replace(/\.?0+$/, ''));
const loop = (p) => `M${p.map((q) => `${n(q.x)} ${n(q.y)}`).join('L')}Z`;

function sweep(d) {
  let pts = simplifyLoop(flatten(d), TOL);
  // Fecha o anel e garante orientação positiva, para que todas as subformas
  // tenham o mesmo sentido e `nonzero` preencha a união.
  if (area(pts) < 0) pts = pts.reverse();

  const moved = pts.map((p) => ({ x: p.x + V.x, y: p.y + V.y }));
  const parts = [loop(pts), loop(moved)];

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const quad = [a, b, { x: b.x + V.x, y: b.y + V.y }, { x: a.x + V.x, y: a.y + V.y }];
    parts.push(loop(area(quad) < 0 ? quad.reverse() : quad));
  }
  return { d: parts.join(''), points: pts.length };
}

const left = sweep(PATHS.left);
const right = sweep(PATHS.right);

// --- conferência -------------------------------------------------------------
// A varredura da direita tem de ser a da esquerda rotacionada 180°: mesma
// quantidade de pontos e mesma área. Se divergir, algo saiu do lugar.
const err = Math.abs(left.points - right.points);
if (err > 1) {
  console.error(`as duas metades geraram ${left.points} e ${right.points} pontos — verifique`);
  process.exit(1);
}

const banner = `// GERADO por tools/build-extrude.cjs — não editar à mão.
// Depende de lib/symbol/geometry.ts (contorno) e lib/symbol/light.ts (deslocamento).
// Rode \`npm run brand\` depois de mexer em qualquer um dos dois.`;

fs.writeFileSync(
  OUT,
  `${banner}

/**
 * Parede da extrusão: a região varrida pelo contorno ao deslizar por
 * EXTRUDE_OFFSET, como um único path.
 *
 * Precisa de \`fill-rule="nonzero"\`. O path é a união do contorno, da cópia
 * deslocada e de um quadrilátero por aresta — todos no mesmo sentido, o que faz
 * a regra de preenchimento resolver a união sem booleana de polígonos.
 *
 * Existe como path único, e não como N cópias \`<use>\`, por medição: mudança de
 * escala obriga a rasterizar de novo, e as 16 cópias levavam o p95 do tempo de
 * quadro de 25ms para 42ms durante as transições.
 */
export const EXTRUDE_PATH = ${JSON.stringify(left.d)};

/** A mesma parede, para a metade direita (contorno já rotacionado). */
export const EXTRUDE_PATH_ROTATED = ${JSON.stringify(right.d)};
`,
  'utf8',
);

const kb = (s) => (s.length / 1024).toFixed(1);
console.log(`varredura gerada com deslocamento (${V.x}, ${V.y})`);
console.log(`  contorno simplificado a ${left.points} pontos (tolerância ${TOL} unidades)`);
console.log(`  esquerda ${kb(left.d)} KB   direita ${kb(right.d)} KB`);
console.log(`  ${OUT}`);
