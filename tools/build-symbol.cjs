/**
 * Constrói public/brand/symbol.svg a partir de references/logoNavite.png.
 *
 * Método: traçado do contorno por marching squares com interpolação sub-pixel,
 * detecção de cantos por ângulo de virada e ajuste de cadeias de Bézier cúbicas
 * (Schneider) entre cantos. É o que um auto-tracer faz, sem tratar terminais
 * como casos especiais — o que era a fonte de erro das tentativas paramétricas.
 *
 * Contexto medido (diagnose-edges.cjs / diagnose-terminals.cjs):
 *  - borda externa: arco de círculo limpo, |erro| médio ~0,6px;
 *  - borda interna: quase circular no corpo, fecha mais rápido perto da ponta;
 *  - ponta: cúspide real (espessura 19 -> 10 -> 5,5 -> 1,6 -> 0);
 *  - outro terminal: corte praticamente radial, ~93px de espessura;
 *  - PNG 98,17% simétrico a 180°, ~2% de diferença entre os lobos.
 *
 * A referência é assimétrica CONSIGO MESMA em até 7,7px (1,9% de R): os dois
 * lobos divergem progressivamente rumo às pontas. Nenhuma reconstrução
 * exatamente simétrica pode ficar abaixo de metade disso contra o PNG bruto.
 * Como o desenho pretendido é evidentemente simétrico, tomamos a MÉDIA dos dois
 * lobos (alinhados por rotação de 180° e reamostrados por comprimento de arco,
 * segmento a segmento) e instanciamos a crescente resultante duas vezes. Isso
 * reparte o erro em vez de herdar o defeito de um dos lados, e torna separar e
 * reunir as metades matematicamente exato.
 *
 *   node tools/build-symbol.cjs
 */
const fs = require('node:fs');
const { decodePNG } = require('./png.cjs');

const SRC = 'references/logoNavite.png';
const THRESHOLD = 140;
const VIEW = 1000;
const CENTER = VIEW / 2;
const TOL_PX = 0.8; // tolerância do ajuste, em px do PNG (critério de aceite: 1,5)
const CORNER_DEG = 38; // virada acumulada que caracteriza um canto
const RESAMPLE_PX = 1.5; // espaçamento do contorno reamostrado
const SMOOTH_WIN = 5; // meia-janela da suavização (ruído de rasterização ~0,3px)
const TRIM_PTS = 8; // pontos descartados junto aos cantos ao ajustar primitivas

// ---------------------------------------------------------------------------
// 1. Imagem e campo escalar
// ---------------------------------------------------------------------------
const { w, h, rgba } = decodePNG(SRC);
const field = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) {
  field[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2] - THRESHOLD;
}
const F = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -THRESHOLD : field[y * w + x]);
const inside = (x, y) => F(x, y) > 0;

let minX = w,
  maxX = 0,
  minY = h,
  maxY = 0;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++)
    if (inside(x, y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
const C = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

// ---------------------------------------------------------------------------
// 2. Contorno por marching squares (sub-pixel nas arestas da célula)
// ---------------------------------------------------------------------------
/** Interpola o cruzamento do zero entre dois vértices da grade. */
const lerpEdge = (x0, y0, x1, y1) => {
  const a = F(x0, y0),
    b = F(x1, y1);
  const t = a / (a - b);
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
};

/** Segmentos de contorno de uma célula (canto superior esquerdo x,y). */
function cellSegments(x, y) {
  const tl = inside(x, y),
    tr = inside(x + 1, y),
    br = inside(x + 1, y + 1),
    bl = inside(x, y + 1);
  const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
  if (code === 0 || code === 15) return [];
  const top = () => lerpEdge(x, y, x + 1, y);
  const right = () => lerpEdge(x + 1, y, x + 1, y + 1);
  const bottom = () => lerpEdge(x, y + 1, x + 1, y + 1);
  const left = () => lerpEdge(x, y, x, y + 1);
  // orientação: interior à esquerda do sentido de marcha
  const table = {
    1: [[left, bottom]],
    2: [[bottom, right]],
    3: [[left, right]],
    4: [[right, top]],
    5: [
      [left, top],
      [bottom, right],
    ],
    6: [[bottom, top]],
    7: [[left, top]],
    8: [[top, left]],
    9: [[top, bottom]],
    10: [
      [top, right],
      [bottom, left],
    ],
    11: [[top, right]],
    12: [[right, left]],
    13: [[right, bottom]],
    14: [[bottom, left]],
  };
  return table[code].map(([a, b]) => [a(), b()]);
}

function traceContours() {
  const segs = [];
  for (let y = minY - 2; y <= maxY + 1; y++)
    for (let x = minX - 2; x <= maxX + 1; x++) for (const s of cellSegments(x, y)) segs.push(s);

  const key = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const from = new Map();
  for (const [a, b] of segs) {
    const k = key(a);
    if (!from.has(k)) from.set(k, []);
    from.get(k).push(b);
  }
  const used = new Set();
  const loops = [];
  for (const [a, b] of segs) {
    const startKey = key(a);
    if (used.has(startKey)) continue;
    const loop = [a];
    let cur = b;
    used.add(startKey);
    for (let guard = 0; guard < 500000; guard++) {
      const k = key(cur);
      loop.push(cur);
      if (k === startKey) break;
      used.add(k);
      const nexts = from.get(k);
      if (!nexts || !nexts.length) break;
      cur = nexts.shift();
    }
    if (loop.length > 50) loops.push(loop);
  }
  return loops.sort((p, q) => q.length - p.length);
}

const loops = traceContours();
const n3 = (v) => Number(v.toFixed(3));
console.log(
  `contornos encontrados: ${loops.length} (tamanhos: ${loops
    .slice(0, 4)
    .map((l) => l.length)
    .join(', ')})`,
);

const centroid = (loop) =>
  loop.reduce((a, p) => ({ x: a.x + p.x / loop.length, y: a.y + p.y / loop.length }), {
    x: 0,
    y: 0,
  });
const bigTwo = loops.slice(0, 2);
const rawLeft = bigTwo.find((l) => centroid(l).x < C.x) ?? bigTwo[0];
const rawRight = bigTwo.find((l) => l !== rawLeft) ?? bigTwo[1];
console.log(`lobos: esquerdo ${rawLeft.length}pts, direito ${rawRight.length}pts`);

// ---------------------------------------------------------------------------
// 3. Reamostragem uniforme por comprimento de arco
// ---------------------------------------------------------------------------
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const len = (a) => Math.hypot(a.x, a.y);
const norm = (a) => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

function resample(loop, spacing) {
  const out = [loop[0]];
  let acc = 0;
  for (let i = 1; i < loop.length; i++) {
    let segLen = len(sub(loop[i], loop[i - 1]));
    if (segLen === 0) continue;
    let t = 0;
    while (acc + segLen - t >= spacing) {
      const need = spacing - acc;
      t += need;
      out.push(add(loop[i - 1], mul(norm(sub(loop[i], loop[i - 1])), t)));
      acc = 0;
    }
    acc += segLen - t;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. Detecção de cantos e fatiamento em segmentos
// ---------------------------------------------------------------------------
/** Reamostra um caminho aberto para exatamente `count` pontos equiespaçados. */
function resampleTo(P, count) {
  const acc = [0];
  for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + len(sub(P[i], P[i - 1])));
  const total = acc[acc.length - 1] || 1;
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const span = acc[j + 1] - acc[j] || 1;
    const t = (target - acc[j]) / span;
    out.push(add(P[j], mul(sub(P[j + 1], P[j]), t)));
  }
  return out;
}

/**
 * Traça um lobo: reamostra, acha os 3 cantos (2 do corte reto + a cúspide) e
 * devolve os 3 segmentos, sempre começando pela face do corte (a mais curta).
 */
function analyzeLoop(loop) {
  const P = resample(loop, RESAMPLE_PX);
  const n = P.length;
  const wr = (i) => ((i % n) + n) % n;
  const K = 4;
  const turn = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = norm(sub(P[i], P[wr(i - K)]));
    const b = norm(sub(P[wr(i + K)], P[i]));
    turn[i] = (Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180) / Math.PI;
  }
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const t = Math.abs(turn[i]);
    if (t < CORNER_DEG) continue;
    let isPeak = true;
    for (let d = -K; d <= K; d++) if (Math.abs(turn[wr(i + d)]) > t) isPeak = false;
    if (isPeak) peaks.push(i);
  }
  const cs = [];
  for (const c of peaks) {
    if (cs.length && Math.min(wr(c - cs[cs.length - 1]), wr(cs[cs.length - 1] - c)) < 6) continue;
    cs.push(c);
  }
  if (cs.length !== 3) throw new Error(`esperava 3 cantos, achei ${cs.length}`);

  const segs = cs.map((a, k) => {
    const b = cs[(k + 1) % cs.length];
    const s = [];
    for (let i = a; ; i = wr(i + 1)) {
      s.push(P[i]);
      if (i === b) break;
    }
    return s;
  });
  // rotaciona para que a face do corte (segmento mais curto) venha primeiro
  const shortest = segs.reduce((best, s, i) => (s.length < segs[best].length ? i : best), 0);
  const ordered = [...segs.slice(shortest), ...segs.slice(0, shortest)];
  return { corners: cs.map((i) => turn[i]), segments: ordered };
}

const rot180pt = (p) => ({ x: 2 * C.x - p.x, y: 2 * C.y - p.y });

const left = analyzeLoop(rawLeft);
const right = analyzeLoop(rawRight.map(rot180pt));
console.log(
  `cantos esquerdo: ${left.corners.map((v) => n3(v) + '°').join(', ')}  |  direito(rot180): ${right.corners.map((v) => n3(v) + '°').join(', ')}`,
);
console.log(
  `segmentos esquerdo: ${left.segments.map((s) => s.length).join('/')}  |  direito: ${right.segments.map((s) => s.length).join('/')}`,
);

// Média segmento a segmento, por comprimento de arco normalizado. Produz uma
// crescente canônica exatamente simétrica, em vez de herdar a assimetria de
// até 7,7px que a própria referência tem entre os dois lobos.
const avgSegments = left.segments.map((ls, i) => {
  const rs = right.segments[i];
  const count = Math.max(ls.length, rs.length);
  const A = resampleTo(ls, count);
  const B = resampleTo(rs, count);
  return A.map((p, k) => ({ x: (p.x + B[k].x) / 2, y: (p.y + B[k].y) / 2 }));
});
let asym = 0;
for (let i = 0; i < avgSegments.length; i++) {
  const count = avgSegments[i].length;
  const A = resampleTo(left.segments[i], count);
  const B = resampleTo(right.segments[i], count);
  for (let k = 0; k < count; k++) asym = Math.max(asym, len(sub(A[k], B[k])));
}
console.log(`divergência máxima entre os dois lobos da referência: ${n3(asym)}px`);

const pts = avgSegments.flat();
const N = pts.length;
const wrap = (i) => ((i % N) + N) % N;
const merged = [];
{
  let idx = 0;
  for (const s of avgSegments) {
    merged.push(idx);
    idx += s.length;
  }
}
const turn = new Array(N).fill(0);
for (let i = 0; i < N; i++) {
  const a = norm(sub(pts[i], pts[wrap(i - 4)]));
  const b = norm(sub(pts[wrap(i + 4)], pts[i]));
  turn[i] = (Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180) / Math.PI;
}
console.log(`contorno canônico: ${N} pontos, cantos em ${merged.join(', ')}`);

// ---------------------------------------------------------------------------
// 5. Ajuste de Bézier (Schneider) entre cantos
// ---------------------------------------------------------------------------
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
function params(P) {
  const u = [0];
  for (let i = 1; i < P.length; i++) u.push(u[i - 1] + len(sub(P[i], P[i - 1])));
  const tot = u[u.length - 1] || 1;
  return u.map((v) => v / tot);
}
function fitCubic(P, t1, t2) {
  const u = params(P);
  const p0 = P[0],
    p3 = P[P.length - 1];
  let c00 = 0,
    c01 = 0,
    c11 = 0,
    x0 = 0,
    x1 = 0;
  for (let i = 0; i < P.length; i++) {
    const t = u[i],
      s = 1 - t;
    const b0 = s * s * s,
      b1 = 3 * s * s * t,
      b2 = 3 * s * t * t,
      b3 = t * t * t;
    const a1 = mul(t1, b1),
      a2 = mul(t2, b2);
    c00 += a1.x * a1.x + a1.y * a1.y;
    c01 += a1.x * a2.x + a1.y * a2.y;
    c11 += a2.x * a2.x + a2.y * a2.y;
    const tmp = sub(P[i], {
      x: p0.x * (b0 + b1) + p3.x * (b2 + b3),
      y: p0.y * (b0 + b1) + p3.y * (b2 + b3),
    });
    x0 += a1.x * tmp.x + a1.y * tmp.y;
    x1 += a2.x * tmp.x + a2.y * tmp.y;
  }
  const det = c00 * c11 - c01 * c01;
  let a1 = 0,
    a2 = 0;
  if (Math.abs(det) > 1e-12) {
    a1 = (x0 * c11 - x1 * c01) / det;
    a2 = (c00 * x1 - c01 * x0) / det;
  }
  const chord = len(sub(p3, p0));
  if (!(a1 > 1e-6) || !(a2 > 1e-6)) a1 = a2 = chord / 3;
  return [p0, add(p0, mul(t1, a1)), add(p3, mul(t2, a2)), p3];
}
function err(P, cv) {
  const u = params(P);
  let max = 0,
    idx = 0;
  for (let i = 0; i < P.length; i++) {
    const d = len(sub(bez(cv[0], cv[1], cv[2], cv[3], u[i]), P[i]));
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  return { max, idx };
}
function fitChain(P, t1, t2, tol, depth = 0) {
  if (P.length < 4 || depth > 14) {
    const chord = len(sub(P[P.length - 1], P[0])) / 3;
    return [
      [P[0], add(P[0], mul(t1, chord)), add(P[P.length - 1], mul(t2, chord)), P[P.length - 1]],
    ];
  }
  const cv = fitCubic(P, t1, t2);
  const { max, idx } = err(P, cv);
  if (max <= tol) return [cv];
  const s = Math.min(Math.max(idx, 2), P.length - 3);
  const ct = norm(sub(P[s + 1], P[s - 1]));
  return [
    ...fitChain(P.slice(0, s + 1), t1, mul(ct, -1), tol, depth + 1),
    ...fitChain(P.slice(s), ct, t2, tol, depth + 1),
  ];
}

/**
 * Suaviza o interior de um segmento com média móvel ao longo do arco. Os cantos
 * são os extremos do segmento e ficam intocados, então nenhuma quina é perdida.
 * Serve para não transformar ruído de rasterização (~0,3px) em curvatura.
 */
function smoothSegment(P, half) {
  if (P.length < 2 * half + 3) return P;
  const out = P.map((p) => ({ ...p }));
  for (let i = half; i < P.length - half; i++) {
    let sx = 0,
      sy = 0;
    for (let d = -half; d <= half; d++) {
      sx += P[i + d].x;
      sy += P[i + d].y;
    }
    out[i] = { x: sx / (2 * half + 1), y: sy / (2 * half + 1) };
  }
  return out;
}

/** Ajuste de círculo por mínimos quadrados (Kåsa), com resíduos. */
function circleFit(P) {
  const n = P.length;
  let Sx = 0,
    Sy = 0,
    Sxx = 0,
    Syy = 0,
    Sxy = 0,
    Sxxx = 0,
    Syyy = 0,
    Sxyy = 0,
    Sxxy = 0;
  for (const { x, y } of P) {
    Sx += x;
    Sy += y;
    Sxx += x * x;
    Syy += y * y;
    Sxy += x * y;
    Sxxx += x * x * x;
    Syyy += y * y * y;
    Sxyy += x * y * y;
    Sxxy += x * x * y;
  }
  const A = n * Sxx - Sx * Sx,
    B = n * Sxy - Sx * Sy,
    E = n * Sxxx + n * Sxyy - (Sxx + Syy) * Sx;
  const G = n * Syy - Sy * Sy,
    H = n * Sxxy + n * Syyy - (Sxx + Syy) * Sy;
  const den = A * G - B * B;
  if (Math.abs(den) < 1e-9) return null;
  const a = (H * B - E * G) / den;
  const b = (H * A - E * B) / (B * B - G * A);
  const cx = -a / 2,
    cy = -b / 2;
  const c = -(a * Sx + b * Sy + Sxx + Syy) / n;
  const rr = cx * cx + cy * cy - c;
  if (rr <= 0) return null;
  const r = Math.sqrt(rr);
  let max = 0;
  for (const { x, y } of P) max = Math.max(max, Math.abs(Math.hypot(x - cx, y - cy) - r));
  return { cx, cy, r, maxErr: max };
}

/** Desvio máximo dos pontos em relação à corda — testa se é reta. */
function lineError(P) {
  const a = P[0],
    b = P[P.length - 1];
  const u = norm(sub(b, a));
  let max = 0;
  for (const p of P) {
    const v = sub(p, a);
    max = Math.max(max, Math.abs(v.x * u.y - v.y * u.x));
  }
  return max;
}

const segments = [];
for (let ci = 0; ci < merged.length; ci++) {
  const a = merged[ci],
    b = merged[(ci + 1) % merged.length];
  const raw = [];
  for (let i = a; ; i = wrap(i + 1)) {
    raw.push(pts[i]);
    if (i === b) break;
  }
  const slice = smoothSegment(raw, SMOOTH_WIN);

  // Marching squares não consegue representar uma quina mais fina que um pixel,
  // então os pontos vizinhos aos cantos ficam arredondados e contaminam o
  // ajuste. Ajustamos primitivas no MIOLO e depois estendemos até os cantos reais.
  const trim = Math.min(TRIM_PTS, Math.floor(slice.length / 4));
  const core = slice.slice(trim, slice.length - trim);

  const diagLine = lineError(core);
  const diagCircle = circleFit(core);
  console.log(
    `  [diag] segmento ${ci}: ${raw.length}pts (miolo ${core.length})  reta=${n3(diagLine)}px  arco=${
      diagCircle ? `${n3(diagCircle.maxErr)}px (R=${n3(diagCircle.r)})` : 'sem ajuste'
    }`,
  );

  // 1) reta?
  if (diagLine <= TOL_PX) {
    segments.push({
      kind: 'line',
      points: raw.length,
      err: diagLine,
      end: slice[slice.length - 1],
    });
    continue;
  }
  // 2) arco de círculo?
  const cf = diagCircle;
  if (cf && cf.maxErr <= TOL_PX) {
    const start = slice[0],
      end = slice[slice.length - 1];
    const mid = slice[Math.floor(slice.length / 2)];
    // sentido: sinal da área do triângulo start-mid-end
    const cross = (mid.x - start.x) * (end.y - start.y) - (mid.y - start.y) * (end.x - start.x);
    const a0 = Math.atan2(start.y - cf.cy, start.x - cf.cx);
    const a1 = Math.atan2(end.y - cf.cy, end.x - cf.cx);
    let sweep = a1 - a0;
    while (sweep <= -Math.PI) sweep += 2 * Math.PI;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
    segments.push({
      kind: 'arc',
      points: raw.length,
      err: cf.maxErr,
      r: cf.r,
      cx: cf.cx,
      cy: cf.cy,
      largeArc,
      sweepFlag: cross > 0 ? 1 : 0,
      end,
    });
    continue;
  }
  // 3) cadeia de Béziers
  const t1 = norm(sub(slice[Math.min(3, slice.length - 1)], slice[0]));
  const t2 = norm(sub(slice[Math.max(0, slice.length - 4)], slice[slice.length - 1]));
  const chain = fitChain(slice, t1, t2, TOL_PX);
  const worst = Math.max(
    ...chain.map((cv, i, arr) => {
      void i;
      void arr;
      return err(slice, cv).max;
    }),
  );
  segments.push({ kind: 'bezier', points: raw.length, err: worst, chain });
}

console.log(
  `segmentos: ${segments
    .map(
      (s) =>
        `${s.points}pts -> ${s.kind}${s.kind === 'bezier' ? `(${s.chain.length})` : ''} erro=${n3(s.err)}px`,
    )
    .join('  |  ')}`,
);
const totalCurves = segments.reduce((s, g) => s + (g.kind === 'bezier' ? g.chain.length : 1), 0);

// ---------------------------------------------------------------------------
// 6. Normalização e emissão
// ---------------------------------------------------------------------------
const rel = (p) => ({ x: p.x - C.x, y: p.y - C.y });
const allRel = pts.map(rel);
// O símbolo completo é o lobo + sua rotação de 180°, então a extensão máxima a
// partir do centro de simetria define o raio do viewBox nos dois lados.
const maxExtent = Math.max(...allRel.map((p) => len(p)));
const S = (CENTER * 0.995) / maxExtent;
const Mp = (p) => {
  const r = rel(p);
  return { x: CENTER + r.x * S, y: CENTER + r.y * S };
};
const f2 = (v) => Number(v.toFixed(2));

const startPt = Mp(pts[merged[0]]);
const d = [`M ${f2(startPt.x)} ${f2(startPt.y)}`];
for (const seg of segments) {
  if (seg.kind === 'line') {
    const e = Mp(seg.end);
    d.push(`L ${f2(e.x)} ${f2(e.y)}`);
  } else if (seg.kind === 'arc') {
    const e = Mp(seg.end);
    const r = f2(seg.r * S);
    d.push(`A ${r} ${r} 0 ${seg.largeArc} ${seg.sweepFlag} ${f2(e.x)} ${f2(e.y)}`);
  } else {
    for (const [, p1, p2, p3] of seg.chain) {
      const c1 = Mp(p1),
        c2 = Mp(p2),
        e = Mp(p3);
      d.push(`C ${f2(c1.x)} ${f2(c1.y)} ${f2(c2.x)} ${f2(c2.y)} ${f2(e.x)} ${f2(e.y)}`);
    }
  }
}
d.push('Z');
const pathD = d.join(' ');

// ---------------------------------------------------------------------------
// 6b. Erro real do path contra o contorno medido.
//
// Medir isso rasterizando o SVG num navegador tem ruído de ~1px (arredondamento
// sub-pixel de posicionamento + limiar), da mesma ordem do sinal. Aqui a conta é
// analítica: amostramos o próprio path e medimos a distância de cada ponto do
// contorno médio à polilinha resultante.
// ---------------------------------------------------------------------------
function samplePath() {
  const poly = [];
  let cursor = pts[merged[0]];
  poly.push(cursor);
  for (const seg of segments) {
    if (seg.kind === 'line') {
      poly.push(seg.end);
      cursor = seg.end;
    } else if (seg.kind === 'arc') {
      const a0 = Math.atan2(cursor.y - seg.cy, cursor.x - seg.cx);
      let a1 = Math.atan2(seg.end.y - seg.cy, seg.end.x - seg.cx);
      let sweep = a1 - a0;
      while (sweep <= -Math.PI) sweep += 2 * Math.PI;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      for (let k = 1; k <= 200; k++) {
        const a = a0 + (sweep * k) / 200;
        poly.push({ x: seg.cx + seg.r * Math.cos(a), y: seg.cy + seg.r * Math.sin(a) });
      }
      cursor = seg.end;
    } else {
      for (const cv of seg.chain) {
        for (let k = 1; k <= 60; k++) poly.push(bez(cv[0], cv[1], cv[2], cv[3], k / 60));
        cursor = cv[3];
      }
    }
  }
  return poly;
}

/** Distância de um ponto ao segmento AB. */
function distToSeg(p, a, b) {
  const vx = b.x - a.x,
    vy = b.y - a.y;
  const l2 = vx * vx + vy * vy;
  if (l2 === 0) return len(sub(p, a));
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

const poly = samplePath();
let errSum = 0,
  errMax = 0,
  errMaxAt = null;
for (const q of pts) {
  let best = Infinity;
  for (let i = 1; i < poly.length; i++) best = Math.min(best, distToSeg(q, poly[i - 1], poly[i]));
  best = Math.min(best, distToSeg(q, poly[poly.length - 1], poly[0]));
  errSum += best;
  if (best > errMax) {
    errMax = best;
    errMaxAt = q;
  }
}
const errMean = errSum / pts.length;
console.log(
  `\nerro do path contra o contorno médio: médio ${n3(errMean)}px  máximo ${n3(errMax)}px` +
    (errMaxAt ? `  (em ${n3(errMaxAt.x)}, ${n3(errMaxAt.y)})` : ''),
);
console.log(`  -> em unidades do viewBox: médio ${n3(errMean * S)}  máximo ${n3(errMax * S)}`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" role="img" aria-label="Símbolo Navite">
  <defs>
    <path id="navite-crescent" d="${pathD}"/>
  </defs>
  <g fill="currentColor">
    <use href="#navite-crescent"/>
    <use href="#navite-crescent" transform="rotate(180 ${CENTER} ${CENTER})"/>
  </g>
</svg>
`;
fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/symbol.svg', svg);
fs.writeFileSync(
  'public/brand/symbol-geometry.json',
  JSON.stringify(
    {
      source: SRC,
      note: 'Vetor canônico de implementação, traçado do PNG aprovado. Não é master oficial da marca.',
      viewBox: VIEW,
      center: CENTER,
      scaleFromSourcePx: n3(S),
      curves: totalCurves,
      corners: merged.length,
      // Erro do path contra o contorno médio medido, em px do PNG de origem.
      // Medido analiticamente (sem rasterizar), então é livre do ruído de ~1px
      // que o round-trip pelo navegador introduz.
      fitErrorPx: { mean: n3(errMean), max: n3(errMax) },
      // Assimetria interna da própria referência entre os dois lobos. Nenhuma
      // reconstrução simétrica pode ficar abaixo de metade disso contra o bruto.
      sourceAsymmetryPx: n3(asym),
      crescentPath: pathD,
    },
    null,
    2,
  ) + '\n',
);

/**
 * Versão da crescente já rotacionada 180°, com a geometria assada no `d`.
 *
 * Por que não usar `transform="rotate(180 …)"`: o relevo sintético pinta luz em
 * coordenadas GLOBAIS (gradiente vindo do canto superior esquerdo, banda de
 * extrusão deslocada no sentido oposto à luz). Se rotacionássemos o elemento, a
 * luz giraria junto e a metade direita ficaria iluminada por baixo. Com o path
 * pré-rotacionado, as duas metades compartilham o mesmo sistema de iluminação.
 *
 * Para 180° em torno do centro, a transformação é (x, y) -> (VIEW - x, VIEW - y).
 */
function rotate180Path(d, view) {
  // Só M/L/C/Z têm todos os números como coordenadas. `A` carrega raios e flags
  // que NÃO podem ser transformados, então recusamos em vez de corromper.
  if (/[AaQqSsTtHhVv]/.test(d)) {
    throw new Error(
      'rotate180Path só suporta M/L/C/Z; o path emitido contém outro comando. ' +
        'Ajuste a rotação antes de seguir.',
    );
  }
  return d.replace(/-?\d+(?:\.\d+)?/g, (num) => String(Number((view - Number(num)).toFixed(2))));
}
const pathDRotated = rotate180Path(pathD, VIEW);

/** Caixa da crescente dentro do viewBox — necessária para calibrar escala e posição. */
const crescentNums = pathD.match(/-?\d+(?:\.\d+)?/g).map(Number);
const crescentXs = crescentNums.filter((_, i) => i % 2 === 0);
const crescentYs = crescentNums.filter((_, i) => i % 2 === 1);
const crescentBox = {
  x: Math.min(...crescentXs),
  y: Math.min(...crescentYs),
  w: Math.max(...crescentXs) - Math.min(...crescentXs),
  h: Math.max(...crescentYs) - Math.min(...crescentYs),
};

// Módulo TS para consumo inline (sem loader de SVG), mantido em sincronia com
// o .svg pelo mesmo build.
fs.mkdirSync('lib/symbol', { recursive: true });
fs.writeFileSync(
  'lib/symbol/geometry.ts',
  [
    '// GERADO por tools/build-symbol.cjs — não editar à mão.',
    `// Vetor canônico de implementação, traçado de ${SRC}.`,
    '// Ver public/brand/README.md para procedência e fidelidade medida.',
    '',
    '/** Lado do viewBox quadrado do símbolo. */',
    `export const SYMBOL_VIEWBOX = ${VIEW};`,
    '',
    '/** Centro de simetria, em unidades de viewBox. As duas metades são a MESMA',
    ' *  crescente — a segunda é esta rotacionada 180° em torno deste ponto. */',
    `export const SYMBOL_CENTER = ${CENTER};`,
    '',
    '/** Caixa da crescente esquerda dentro do viewBox. */',
    `export const CRESCENT_BBOX = { x: ${crescentBox.x.toFixed(2)}, y: ${crescentBox.y.toFixed(2)}, w: ${crescentBox.w.toFixed(2)}, h: ${crescentBox.h.toFixed(2)} } as const;`,
    '',
    '/** Contorno da crescente ESQUERDA. */',
    `export const CRESCENT_PATH =\n  '${pathD}';`,
    '',
    '/**',
    ' * Crescente DIREITA — a mesma forma rotacionada 180°, com a geometria já',
    ' * assada nas coordenadas.',
    ' *',
    ' * Não troque isto por `transform="rotate(180 …)"`: o relevo sintético pinta',
    ' * luz em coordenadas globais (gradiente vindo do topo-esquerdo, banda de',
    ' * extrusão deslocada no sentido oposto). Rotacionar o elemento giraria a',
    ' * iluminação junto, e a metade direita ficaria acesa por baixo.',
    ' */',
    `export const CRESCENT_PATH_ROTATED =\n  '${pathDRotated}';`,
    '',
  ].join('\n'),
);

console.log(
  `\nescala: ${n3(S)}  ·  path com ${totalCurves} cúbicas  ·  ${pathD.length} caracteres`,
);
console.log('escrito: public/brand/symbol.svg + symbol-geometry.json + lib/symbol/geometry.ts');
