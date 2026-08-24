/**
 * Pipeline de traçado de contorno reutilizável.
 *
 * Extraído de build-symbol.cjs depois de validado ali (erro analítico de
 * 0,14px médio / 0,62px máximo contra o contorno medido). Usado agora também
 * pelo wordmark.
 *
 * Etapas: máscara por limiar -> contornos por marching squares com interpolação
 * sub-pixel -> reamostragem uniforme por comprimento de arco -> detecção de
 * cantos por virada acumulada -> ajuste por segmento (reta / arco / cadeia de
 * Béziers de Schneider) -> emissão de path + erro analítico.
 */
const { decodePNG } = require('./png.cjs');

// --- vetores -----------------------------------------------------------------
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const len = (a) => Math.hypot(a.x, a.y);
const norm = (a) => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

// --- 1. imagem e máscara -----------------------------------------------------
/**
 * @param {string} file
 * @param {(r:number,g:number,b:number)=>number} score  positivo = dentro da forma
 */
function loadField(file, score) {
  const { w, h, rgba } = decodePNG(file);
  const field = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    field[i] = score(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
  }
  return { w, h, field };
}

// --- 2. contornos ------------------------------------------------------------
function traceContours(img, box) {
  const { w, h, field } = img;
  const F = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : field[y * w + x]);
  const inside = (x, y) => F(x, y) > 0;
  const lerpEdge = (x0, y0, x1, y1) => {
    const a = F(x0, y0),
      b = F(x1, y1);
    const t = a / (a - b);
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
  };

  const segs = [];
  for (let y = box.y0 - 2; y <= box.y1 + 1; y++) {
    for (let x = box.x0 - 2; x <= box.x1 + 1; x++) {
      const tl = inside(x, y),
        tr = inside(x + 1, y),
        br = inside(x + 1, y + 1),
        bl = inside(x, y + 1);
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top = () => lerpEdge(x, y, x + 1, y);
      const right = () => lerpEdge(x + 1, y, x + 1, y + 1);
      const bottom = () => lerpEdge(x, y + 1, x + 1, y + 1);
      const left = () => lerpEdge(x, y, x, y + 1);
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
      for (const [a, b] of table[code]) segs.push([a(), b()]);
    }
  }

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
    for (let guard = 0; guard < 1000000; guard++) {
      const k = key(cur);
      loop.push(cur);
      if (k === startKey) break;
      used.add(k);
      const next = from.get(k);
      if (!next || !next.length) break;
      cur = next.shift();
    }
    if (loop.length > 24) loops.push(loop);
  }
  return loops.sort((p, q) => q.length - p.length);
}

// --- 3. reamostragem ---------------------------------------------------------
function resample(loop, spacing) {
  const out = [loop[0]];
  let acc = 0;
  for (let i = 1; i < loop.length; i++) {
    const segLen = len(sub(loop[i], loop[i - 1]));
    if (segLen === 0) continue;
    let t = 0;
    while (acc + segLen - t >= spacing) {
      t += spacing - acc;
      out.push(add(loop[i - 1], mul(norm(sub(loop[i], loop[i - 1])), t)));
      acc = 0;
    }
    acc += segLen - t;
  }
  return out;
}

// --- 4. ajustes --------------------------------------------------------------
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
function cubicError(P, cv) {
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
    const c = len(sub(P[P.length - 1], P[0])) / 3;
    return [[P[0], add(P[0], mul(t1, c)), add(P[P.length - 1], mul(t2, c)), P[P.length - 1]]];
  }
  const cv = fitCubic(P, t1, t2);
  const { max, idx } = cubicError(P, cv);
  if (max <= tol) return [cv];
  const s = Math.min(Math.max(idx, 2), P.length - 3);
  const ct = norm(sub(P[s + 1], P[s - 1]));
  return [
    ...fitChain(P.slice(0, s + 1), t1, mul(ct, -1), tol, depth + 1),
    ...fitChain(P.slice(s), ct, t2, tol, depth + 1),
  ];
}

// --- 5. pipeline por contorno ------------------------------------------------
/**
 * Converte um contorno fechado num conjunto de segmentos ajustados.
 * @returns {{pts:Array, corners:number[], segments:Array}}
 */
function fitLoop(loop, opts = {}) {
  const {
    resamplePx = 1.2,
    cornerDeg = 38,
    smoothWin = 4,
    trimPts = 6,
    tolPx = 0.5,
    cornerWin = 4,
  } = opts;

  const pts = resample(loop, resamplePx);
  const n = pts.length;
  const wrap = (i) => ((i % n) + n) % n;

  const turn = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = norm(sub(pts[i], pts[wrap(i - cornerWin)]));
    const b = norm(sub(pts[wrap(i + cornerWin)], pts[i]));
    turn[i] = (Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180) / Math.PI;
  }
  const peaks = [];
  for (let i = 0; i < n; i++) {
    const t = Math.abs(turn[i]);
    if (t < cornerDeg) continue;
    let isPeak = true;
    for (let d = -cornerWin; d <= cornerWin; d++)
      if (Math.abs(turn[wrap(i + d)]) > t) isPeak = false;
    if (isPeak) peaks.push(i);
  }
  const corners = [];
  for (const c of peaks) {
    if (
      corners.length &&
      Math.min(wrap(c - corners[corners.length - 1]), wrap(corners[corners.length - 1] - c)) < 5
    )
      continue;
    corners.push(c);
  }
  if (!corners.length) corners.push(0);

  const segments = [];
  for (let ci = 0; ci < corners.length; ci++) {
    const a = corners[ci],
      b = corners[(ci + 1) % corners.length];
    const raw = [];
    for (let i = a; ; i = wrap(i + 1)) {
      raw.push(pts[i]);
      if (i === b) break;
    }
    if (raw.length < 3) {
      segments.push({ kind: 'line', end: raw[raw.length - 1], err: 0, points: raw.length });
      continue;
    }
    const slice = smoothSegment(raw, smoothWin);
    const trim = Math.min(trimPts, Math.floor(slice.length / 4));
    const core = slice.length > 2 * trim + 2 ? slice.slice(trim, slice.length - trim) : slice;

    const le = lineError(core);
    if (le <= tolPx) {
      segments.push({ kind: 'line', end: slice[slice.length - 1], err: le, points: raw.length });
      continue;
    }
    const cf = circleFit(core);
    if (cf && cf.maxErr <= tolPx) {
      const start = slice[0],
        end = slice[slice.length - 1];
      const mid = slice[Math.floor(slice.length / 2)];
      const cross = (mid.x - start.x) * (end.y - start.y) - (mid.y - start.y) * (end.x - start.x);
      const a0 = Math.atan2(start.y - cf.cy, start.x - cf.cx);
      const a1 = Math.atan2(end.y - cf.cy, end.x - cf.cx);
      let sweep = a1 - a0;
      while (sweep <= -Math.PI) sweep += 2 * Math.PI;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      segments.push({
        kind: 'arc',
        r: cf.r,
        cx: cf.cx,
        cy: cf.cy,
        largeArc: Math.abs(sweep) > Math.PI ? 1 : 0,
        sweepFlag: cross > 0 ? 1 : 0,
        end,
        err: cf.maxErr,
        points: raw.length,
      });
      continue;
    }
    const t1 = norm(sub(slice[Math.min(3, slice.length - 1)], slice[0]));
    const t2 = norm(sub(slice[Math.max(0, slice.length - 4)], slice[slice.length - 1]));
    segments.push({
      kind: 'bezier',
      chain: fitChain(slice, t1, t2, tolPx),
      err: null,
      points: raw.length,
    });
  }
  return { pts, corners, segments, start: pts[corners[0]] };
}

/** Emite o `d` de um resultado de fitLoop, mapeando pontos por `M`. */
function emitPath(fitted, M, prec = 2) {
  const f = (v) => Number(v.toFixed(prec));
  const s = M(fitted.start);
  const d = [`M ${f(s.x)} ${f(s.y)}`];
  for (const seg of fitted.segments) {
    if (seg.kind === 'line') {
      const e = M(seg.end);
      d.push(`L ${f(e.x)} ${f(e.y)}`);
    } else if (seg.kind === 'arc') {
      const e = M(seg.end);
      // assume mapeamento uniforme (mesma escala em x e y)
      const p0 = M({ x: 0, y: 0 }),
        p1 = M({ x: 1, y: 0 });
      const scale = Math.abs(p1.x - p0.x) || 1;
      const r = f(seg.r * scale);
      d.push(`A ${r} ${r} 0 ${seg.largeArc} ${seg.sweepFlag} ${f(e.x)} ${f(e.y)}`);
    } else {
      for (const [, p1, p2, p3] of seg.chain) {
        const c1 = M(p1),
          c2 = M(p2),
          e = M(p3);
        d.push(`C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(e.x)} ${f(e.y)}`);
      }
    }
  }
  d.push('Z');
  return d.join(' ');
}

/** Amostra o resultado como polilinha, para medir erro analiticamente. */
function samplePath(fitted) {
  const poly = [fitted.start];
  let cursor = fitted.start;
  for (const seg of fitted.segments) {
    if (seg.kind === 'line') {
      poly.push(seg.end);
      cursor = seg.end;
    } else if (seg.kind === 'arc') {
      const a0 = Math.atan2(cursor.y - seg.cy, cursor.x - seg.cx);
      const a1 = Math.atan2(seg.end.y - seg.cy, seg.end.x - seg.cx);
      let sweep = a1 - a0;
      while (sweep <= -Math.PI) sweep += 2 * Math.PI;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      for (let k = 1; k <= 120; k++) {
        const a = a0 + (sweep * k) / 120;
        poly.push({ x: seg.cx + seg.r * Math.cos(a), y: seg.cy + seg.r * Math.sin(a) });
      }
      cursor = seg.end;
    } else {
      for (const cv of seg.chain) {
        for (let k = 1; k <= 40; k++) poly.push(bez(cv[0], cv[1], cv[2], cv[3], k / 40));
        cursor = cv[3];
      }
    }
  }
  return poly;
}

function distToSeg(p, a, b) {
  const vx = b.x - a.x,
    vy = b.y - a.y;
  const l2 = vx * vx + vy * vy;
  if (l2 === 0) return len(sub(p, a));
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** Erro do path ajustado contra os pontos do contorno. */
function fitError(fitted) {
  const poly = samplePath(fitted);
  let sum = 0,
    max = 0;
  for (const q of fitted.pts) {
    let best = Infinity;
    for (let i = 1; i < poly.length; i++) best = Math.min(best, distToSeg(q, poly[i - 1], poly[i]));
    best = Math.min(best, distToSeg(q, poly[poly.length - 1], poly[0]));
    sum += best;
    if (best > max) max = best;
  }
  return { mean: sum / fitted.pts.length, max };
}

function bbox(points) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of points) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

module.exports = {
  loadField,
  traceContours,
  resample,
  fitLoop,
  emitPath,
  samplePath,
  fitError,
  bbox,
  sub,
  add,
  mul,
  len,
  norm,
};
