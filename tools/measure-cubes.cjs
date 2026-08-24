/**
 * Cataloga o campo de cubos.
 *
 * Duas perguntas distintas, dois modos:
 *
 *   estático   `node tools/measure-cubes.cjs`
 *              Lê `problem-section-reference.png` e devolve cada cubo com
 *              posição, tamanho e material. É a COMPOSIÇÃO final — o que a
 *              Fase 6 precisa reproduzir.
 *
 *   movimento  `node tools/measure-cubes.cjs --frames`
 *              Varre os quadros de `flow-symbol-transition.mp4` e devolve,
 *              por quadro, quantos cubos existem e o quanto se afastaram do
 *              centro. É a CURVA DE NASCIMENTO — quando aparecem e como
 *              expandem. O §4.1 do plano afirma que nascem no centro do vão e
 *              que nenhum aparece antes do símbolo separar; aqui isso vira
 *              número em vez de leitura de frame.
 *
 * Os cubos vivem entre as duas metades, então o recorte é o VÃO. As metades
 * entram no mesmo limiar de luminância e são descartadas por tamanho: nenhum
 * cubo chega perto de 20.000 pixels.
 */
const { decodePNG } = require('./png.cjs');
const fs = require('fs');
const path = require('path');

const argv = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('=')),
);

/** Componentes conexos acima de um limiar, dentro de uma caixa. */
function components(img, limiar, box) {
  const { w: W, h: H, rgba } = img;
  const at = (x, y) => (y * W + x) * 4;
  const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  const b = { x0: 0, y0: 0, x1: W - 1, y1: H - 1, ...box };
  const seen = new Uint8Array(W * H);
  const st = new Int32Array(W * H);
  const out = [];
  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      const p = y * W + x;
      if (seen[p] || lum(at(x, y)) <= limiar) continue;
      let sp = 0;
      st[sp++] = p;
      seen[p] = 1;
      let n = 0,
        x0 = x,
        x1 = x,
        y0 = y,
        y1 = y,
        sr = 0,
        sg = 0,
        sb = 0,
        pico = 0;
      while (sp > 0) {
        const q = st[--sp];
        const qx = q % W,
          qy = (q / W) | 0;
        n++;
        if (qx < x0) x0 = qx;
        if (qx > x1) x1 = qx;
        if (qy < y0) y0 = qy;
        if (qy > y1) y1 = qy;
        const i = q * 4;
        sr += rgba[i];
        sg += rgba[i + 1];
        sb += rgba[i + 2];
        const l = lum(i);
        if (l > pico) pico = l;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx,
              ny = qy + dy;
            if (nx < b.x0 || ny < b.y0 || nx > b.x1 || ny > b.y1) continue;
            const np = ny * W + nx;
            if (seen[np] || lum(at(nx, ny)) <= limiar) continue;
            seen[np] = 1;
            st[sp++] = np;
          }
        }
      }
      out.push({
        n,
        x0,
        y0,
        x1,
        y1,
        w: x1 - x0 + 1,
        h: y1 - y0 + 1,
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        r: sr / n,
        g: sg / n,
        b: sb / n,
        pico,
      });
    }
  }
  return out;
}

const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Material de um cubo, pelo croma da face média.
 *
 * As três famílias do §9.3: bone claro, sage oliva, e navy escuro com topo
 * polido. O navy só aparece porque o TOPO reflete — a face frontal dele é mais
 * escura que o fundo, então o que o detector pega é o brilho de cima.
 */
function material(c) {
  const warm = (c.r + c.g) / 2 - c.b;
  const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  if (l < 70) return 'navy';
  if (warm < -2) return 'navy';
  if (warm > 6 && c.g > c.r) return 'sage';
  return 'bone';
}

// ---------------------------------------------------------------------------
// modo estático — a composição final
// ---------------------------------------------------------------------------
function estatico() {
  const file = path.join(__dirname, '..', 'references', 'problem-section-reference.png');
  const img = decodePNG(file);
  const { w: W, h: H } = img;
  console.log(`problem-section-reference.png  ${W}x${H}\n`);

  // O vão: entre as metades, sem tocá-las. Limites verificados na imagem.
  const box = {
    x0: Math.round(W * 0.44),
    x1: Math.round(W * 0.76),
    y0: Math.round(H * 0.2),
    y1: Math.round(H * 0.82),
  };

  const todos = components(img, 46, box);
  // As metades são ordens de grandeza maiores; nenhum cubo passa de 3.000px.
  const cubos = todos.filter((c) => c.n >= 4 && c.n < 3000 && c.w <= 70 && c.h <= 70);

  const pw = (v) => ((100 * v) / W).toFixed(2);
  const ph = (v) => ((100 * v) / H).toFixed(2);

  cubos.sort((a, b) => b.n - a.n);
  console.log(`${cubos.length} cubos no vão\n`);
  console.log('   cx%     cy%    lado   px   material   cor');
  for (const c of cubos) {
    console.log(
      `  ${pw(c.cx).padStart(6)}  ${ph(c.cy).padStart(6)}  ${String(c.w).padStart(4)}  ` +
        `${String(c.n).padStart(4)}   ${material(c).padEnd(8)}  ${hex(c)}`,
    );
  }

  // --- distribuição por tamanho: os três planos de profundidade do §9.3 -----
  const lados = cubos.map((c) => c.w).sort((a, b) => a - b);
  const q = (p) => lados[Math.min(lados.length - 1, Math.floor(lados.length * p))];
  console.log(
    `\ntamanho do lado, em px:  mín ${lados[0]}  p25 ${q(0.25)}  mediana ${q(0.5)}  ` +
      `p75 ${q(0.75)}  máx ${lados[lados.length - 1]}`,
  );
  console.log(`em % da largura:  mín ${pw(lados[0])}  máx ${pw(lados[lados.length - 1])}`);

  const porMat = {};
  for (const c of cubos) porMat[material(c)] = (porMat[material(c)] ?? 0) + 1;
  console.log(
    `materiais:  ${Object.entries(porMat)
      .map(([k, v]) => `${k} ${v} (${((100 * v) / cubos.length).toFixed(0)}%)`)
      .join(' · ')}`,
  );

  // --- centro e dispersão --------------------------------------------------
  const mx = cubos.reduce((s, c) => s + c.cx, 0) / cubos.length;
  const my = cubos.reduce((s, c) => s + c.cy, 0) / cubos.length;
  const dists = cubos.map((c) => Math.hypot(c.cx - mx, c.cy - my)).sort((a, b) => a - b);
  console.log(
    `\ncentro do enxame: ${pw(mx)}vw, ${ph(my)}vh    ` +
      `raio: mediana ${pw(dists[dists.length >> 1])}vw  máx ${pw(dists[dists.length - 1])}vw`,
  );

  // Tamanho contra distância: o §9.3 propõe planos de profundidade, o que
  // implica que cubos maiores (mais próximos) NÃO se concentram no centro.
  const grande = cubos.filter((c) => c.w >= q(0.75));
  const pequeno = cubos.filter((c) => c.w <= q(0.25));
  const raioMedio = (arr) =>
    arr.reduce((s, c) => s + Math.hypot(c.cx - mx, c.cy - my), 0) / (arr.length || 1);
  console.log(
    `  raio médio dos MAIORES (p75+): ${pw(raioMedio(grande))}vw   ` +
      `dos MENORES (p25-): ${pw(raioMedio(pequeno))}vw`,
  );
}

// ---------------------------------------------------------------------------
// modo movimento — a curva de nascimento
// ---------------------------------------------------------------------------
function quadros() {
  const dir = path.join(__dirname, '..', '.shots', 'ref', 'flow-symbol-transition');
  const arquivos = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();
  console.log(`${arquivos.length} quadros de flow-symbol-transition.mp4\n`);
  console.log('   t(s)  progr.   metades      vão      cubos   raio med   raio máx');

  const DUR = 7.98;
  for (const f of arquivos) {
    const img = decodePNG(path.join(dir, f));
    const { w: W, h: H } = img;
    const t = Number(f.replace(/^t|\.png$/g, '').replace('_', '.'));

    // As metades: componentes enormes na faixa central.
    const grandes = components(img, 100, {
      y0: Math.round(H * 0.1),
      y1: Math.round(H * 0.95),
    })
      .filter((c) => c.n > 12000)
      .sort((a, b) => a.cx - b.cx);

    let vao = null;
    if (grandes.length >= 2) {
      const esq = grandes[0];
      const dir2 = grandes[grandes.length - 1];
      vao = { x0: esq.x1, x1: dir2.x0, cx: (esq.x1 + dir2.x0) / 2 };
    }

    let cubos = [];
    if (vao && vao.x1 - vao.x0 > 20) {
      cubos = components(img, 46, {
        x0: vao.x0 + 4,
        x1: vao.x1 - 4,
        y0: Math.round(H * 0.2),
        y1: Math.round(H * 0.85),
      }).filter((c) => c.n >= 4 && c.n < 3000 && c.w <= 70 && c.h <= 70);
    }

    const cy = cubos.length ? cubos.reduce((s, c) => s + c.cy, 0) / cubos.length : 0;
    const raios = cubos
      .map((c) => Math.hypot(c.cx - (vao?.cx ?? 0), c.cy - cy))
      .sort((a, b) => a - b);
    const pw = (v) => ((100 * v) / W).toFixed(1);

    console.log(
      `  ${t.toFixed(2).padStart(5)}   ${(t / DUR).toFixed(2)}   ` +
        `${String(grandes.length).padStart(6)}   ${(vao ? pw(vao.x1 - vao.x0) + 'vw' : '   —').padStart(8)}  ` +
        `${String(cubos.length).padStart(6)}   ` +
        `${(raios.length ? pw(raios[raios.length >> 1]) + 'vw' : '—').padStart(8)}  ` +
        `${(raios.length ? pw(raios[raios.length - 1]) + 'vw' : '—').padStart(8)}`,
    );
  }
}

if (argv.frames) quadros();
else estatico();
