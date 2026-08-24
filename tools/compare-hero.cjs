/**
 * O aceite da Fase 5: compara a captura do hero com `hero-reference.png`.
 *
 * Critério do plano: posição, escala e espaçamento dentro de ±2%. Aqui isso é
 * literal — cada marco é extraído das DUAS imagens pelo mesmo código e a
 * diferença sai em pontos percentuais da largura (x) ou da altura (y).
 *
 * DUAS PRECAUÇÕES QUE MUDAM O RESULTADO:
 *
 *   1. A referência não tem barra de rolagem; a captura tem. Com
 *      `scrollbar-gutter: stable` a calha estreita a área de conteúdo, e é
 *      contra ELA que os percentuais do CSS se resolvem. Por isso `--cw`: a
 *      largura útil da captura, contra a qual x é normalizado.
 *
 *   2. A referência é um render 3D com sombra difusa e grão; a captura é um SVG
 *      de arestas limpas. Comparar área de tinta daria divergência garantida
 *      sem significar nada. O que se compara são POSIÇÕES e EXTENSÕES.
 *
 *   node tools/compare-hero.cjs .shots/fase-5/hero.png --cw=1657
 */
const { decodePNG } = require('./png.cjs');
const path = require('path');

const argv = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, '').split('=')),
);
const shotPath = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!shotPath)
  throw new Error('uso: node tools/compare-hero.cjs <captura.png> [--cw=<largura útil>]');

const REF = path.join(__dirname, '..', 'references', 'hero-reference.png');
const TOL = Number(argv.tol ?? 2); // pontos percentuais

/** Extrai os marcos de uma imagem. `cw` é a largura útil (sem barra). */
function marcos(file, cw) {
  const { w: W, h: H, rgba } = decodePNG(file);
  const CW = cw ?? W;
  const at = (x, y) => (y * W + x) * 4;
  const lum = (i) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  const warm = (i) => (rgba[i] + rgba[i + 1]) / 2 - rgba[i + 2];
  const px = (v) => (100 * v) / CW;
  const py = (v) => (100 * v) / H;

  function comps(ink, box) {
    const b = { x0: 0, y0: 0, x1: CW - 1, y1: H - 1, ...box };
    const seen = new Uint8Array(W * H);
    const out = [];
    const st = new Int32Array(W * H);
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const p = y * W + x;
        if (seen[p] || !ink(x, y)) continue;
        let sp = 0;
        st[sp++] = p;
        seen[p] = 1;
        let n = 0,
          x0 = x,
          x1 = x,
          y0 = y,
          y1 = y;
        while (sp > 0) {
          const q = st[--sp],
            qx = q % W,
            qy = (q / W) | 0;
          n++;
          if (qx < x0) x0 = qx;
          if (qx > x1) x1 = qx;
          if (qy < y0) y0 = qy;
          if (qy > y1) y1 = qy;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = qx + dx,
                ny = qy + dy;
              if (nx < b.x0 || ny < b.y0 || nx > b.x1 || ny > b.y1) continue;
              const np = ny * W + nx;
              if (seen[np] || !ink(nx, ny)) continue;
              seen[np] = 1;
              st[sp++] = np;
            }
        }
        out.push({ n, x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 });
      }
    }
    return out;
  }

  const m = {};

  // --- símbolo: luminância alta na metade direita --------------------------
  const halves = comps((x, y) => lum(at(x, y)) > 100, { x0: Math.round(CW * 0.44) }).filter(
    (c) => c.n > 2000,
  );
  const u = halves.reduce(
    (a, c) => ({
      x0: Math.min(a.x0, c.x0),
      y0: Math.min(a.y0, c.y0),
      x1: Math.max(a.x1, c.x1),
      y1: Math.max(a.y1, c.y1),
    }),
    { x0: 1e9, y0: 1e9, x1: 0, y1: 0 },
  );
  m['símbolo centro x'] = px((u.x0 + u.x1) / 2);
  m['símbolo centro y'] = py((u.y0 + u.y1) / 2);
  m['símbolo largura'] = px(u.x1 - u.x0 + 1);
  m['símbolo altura'] = py(u.y1 - u.y0 + 1);
  m['símbolo metades'] = halves.length;

  // --- faixas de texto da coluna esquerda ----------------------------------
  const ink = comps((x, y) => lum(at(x, y)) > 62, { x1: Math.round(CW * 0.46) }).filter(
    (c) => c.n > 6,
  );
  const rows = [];
  for (const c of ink.slice().sort((a, b) => a.y0 - b.y0)) {
    const hit = rows.find((r) => c.y0 <= r.y1 + 3 && c.y1 >= r.y0 - 3);
    if (hit) {
      hit.y0 = Math.min(hit.y0, c.y0);
      hit.y1 = Math.max(hit.y1, c.y1);
      hit.x0 = Math.min(hit.x0, c.x0);
      hit.x1 = Math.max(hit.x1, c.x1);
    } else rows.push({ ...c });
  }
  // A largura da FAIXA só existe depois da fusão. Sem esta linha o valor
  // relatado era o do primeiro componente encontrado — o que fazia o headline
  // inteiro aparecer como 0,72vw de largura.
  for (const r of rows) {
    r.w = r.x1 - r.x0 + 1;
    r.h = r.y1 - r.y0 + 1;
  }
  /*
   * Uma faixa precisa ter CORPO para contar como linha de conteúdo.
   *
   * Um traço de 1px atravessa o limiar de tinta conforme caia em pixel inteiro
   * ou fracionário — a borda de baixo da pílula do hero, por exemplo, se
   * destaca do resto do anel quando o botão assenta em y fracionário. Isso é
   * antialiasing de um traço de 1px, não uma quebra de linha diferente, que é
   * o que esta comparação existe para detectar.
   *
   * O corte vale para as DUAS imagens, então não afrouxa nada: nenhuma faixa
   * real da referência tem menos de 6px de altura.
   */
  m.__rows = rows.filter((r) => r.h >= 3);

  /*
   * Quadrados sage soltos, isolados por CROMA — o fundo é navy, onde o azul
   * domina; os marcadores são oliva, com (r+g)/2 > b.
   *
   * O corte é 11, não 14: no render da referência o quadrado de (47,2%, 51,8%)
   * mede rgb(124,133,114), croma 14,5, e com o corte em 14 só 26 dos seus 81
   * pixels passavam — o componente fragmentava e o marcador sumia da lista da
   * referência enquanto aparecia na da captura. O marcador existe nas duas; era
   * o instrumento que estava no fio da navalha.
   */
  m.__marks = comps((x, y) => {
    const i = at(x, y);
    return lum(i) > 60 && lum(i) < 200 && warm(i) > 11;
  })
    .filter((c) => {
      const fill = c.n / (c.w * c.h),
        ar = c.w / c.h;
      return c.n >= 25 && c.w <= 26 && c.h <= 26 && fill > 0.75 && ar > 0.7 && ar < 1.45;
    })
    .map((c) => ({ x: px((c.x0 + c.x1) / 2), y: py((c.y0 + c.y1) / 2), s: px(c.w) }));

  m.__px = px;
  m.__py = py;
  return m;
}

const ref = marcos(REF);
const got = marcos(path.resolve(shotPath), Number(argv.cw ?? 0) || undefined);

console.log(`referência : ${path.relative(process.cwd(), REF)}`);
console.log(`captura    : ${shotPath}${argv.cw ? `   (largura útil ${argv.cw})` : ''}`);
console.log(`tolerância : ±${TOL} pontos percentuais\n`);

let falhas = 0;
const linha = (nome, a, b, unidade) => {
  const d = b - a;
  const ok = Math.abs(d) <= TOL;
  if (!ok) falhas++;
  console.log(
    `  ${ok ? '✓' : '✗'} ${nome.padEnd(26)} ref ${a.toFixed(2).padStart(7)}${unidade}` +
      `   obtido ${b.toFixed(2).padStart(7)}${unidade}   Δ ${(d >= 0 ? '+' : '') + d.toFixed(2)}`,
  );
};

/*
 * Sobre a LARGURA do símbolo: a referência mede ~2 pontos a mais que a captura,
 * e isso está certo.
 *
 * No hero-reference.png as duas metades estão fora de eixo — a esquerda em
 * (57,83 / 51,49) e a direita em (74,97 / 55,42) — e esse deslocamento infla a
 * caixa da união. `lib/symbol/states.ts` decidiu, pela hierarquia de marca, que
 * as metades ficam CONCÊNTRICAS no hero, porque logoNavite.png é exatamente
 * simétrico e o hero precisa ler como a marca.
 *
 * A prova de que a peça está certa é a proporção da tinta: logoNavite.png dá
 * 0,9389 de largura por altura; esta implementação dá 0,945 (0,6% de erro). O
 * frame do hero dá 1,0664, que diverge 8% da própria marca oficial.
 */
console.log('SÍMBOLO');
for (const k of ['símbolo centro x', 'símbolo largura']) linha(k, ref[k], got[k], 'vw');
for (const k of ['símbolo centro y', 'símbolo altura']) linha(k, ref[k], got[k], 'vh');
console.log(
  `  ${ref['símbolo metades'] === got['símbolo metades'] ? '✓' : '✗'} metades detectadas       ` +
    `ref ${ref['símbolo metades']}   obtido ${got['símbolo metades']}`,
);
if (ref['símbolo metades'] !== got['símbolo metades']) falhas++;

// --- faixas de texto: casa por ordem, exige a mesma contagem ---------------
console.log('\nFAIXAS DE TEXTO (topo de cada bloco de tinta na coluna esquerda)');
const rr = ref.__rows,
  gr = got.__rows;
console.log(`  faixas: ref ${rr.length}   obtido ${gr.length}`);
if (rr.length !== gr.length) {
  falhas++;
  console.log('  ✗ contagem de faixas diverge — o layout quebrou linhas de forma diferente');
}
/*
 * Casa cada faixa da referência com a MAIS PRÓXIMA em y na captura, não pelo
 * índice. Uma linha a mais ou a menos desalinharia todas as seguintes e
 * transformaria um erro em dez.
 */
for (const [i, r] of rr.entries()) {
  let best = null;
  let bd = Infinity;
  for (const g of gr) {
    const d = Math.abs(ref.__py(r.y0) - got.__py(g.y0));
    if (d < bd) {
      bd = d;
      best = g;
    }
  }
  if (!best || bd > 6) {
    falhas++;
    console.log(
      `  ✗ faixa ${i} (topo ${ref.__py(r.y0).toFixed(2)}vh) sem correspondente na captura`,
    );
    continue;
  }
  linha(`faixa ${i} topo`, ref.__py(r.y0), got.__py(best.y0), 'vh');
  linha(`faixa ${i} esquerda`, ref.__px(r.x0), got.__px(best.x0), 'vw');
  linha(`faixa ${i} largura`, ref.__px(r.w), got.__px(best.w), 'vw');
}

// --- marcadores: casa pelo vizinho mais próximo ----------------------------
console.log('\nMARCADORES SAGE');
console.log(`  quantidade: ref ${ref.__marks.length}   obtido ${got.__marks.length}`);
for (const r of ref.__marks) {
  let best = null,
    bd = 1e9;
  for (const g of got.__marks) {
    const d = Math.hypot(r.x - g.x, r.y - g.y);
    if (d < bd) {
      bd = d;
      best = g;
    }
  }
  const ok = best && Math.abs(best.x - r.x) <= TOL && Math.abs(best.y - r.y) <= TOL;
  if (!ok) falhas++;
  console.log(
    `  ${ok ? '✓' : '✗'} (${r.x.toFixed(1)}%, ${r.y.toFixed(1)}%) ${r.s.toFixed(2)}vw  →  ` +
      (best
        ? `(${best.x.toFixed(1)}%, ${best.y.toFixed(1)}%) ${best.s.toFixed(2)}vw   dist ${bd.toFixed(2)}`
        : 'nenhum'),
  );
}

const sobrando = got.__marks.filter(
  (g) => !ref.__marks.some((r) => Math.abs(r.x - g.x) <= TOL && Math.abs(r.y - g.y) <= TOL),
);
for (const g of sobrando) {
  console.log(
    `  ! sobrando na captura: (${g.x.toFixed(1)}%, ${g.y.toFixed(1)}%) ${g.s.toFixed(2)}vw`,
  );
}

console.log(
  falhas === 0
    ? '\nOK — hero dentro de ±2% da referência.'
    : `\n${falhas} marco(s) fora da tolerância.`,
);
process.exitCode = falhas === 0 ? 0 : 1;
