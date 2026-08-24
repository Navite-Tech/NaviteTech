/**
 * Qualidade do scroll com roda de verdade.
 *
 * Serve a dois critérios distintos:
 *
 *   • FASE 4 — não perder quadro durante o scrub. Mede o tempo de cada quadro
 *     enquanto um gesto de roda atravessa a página.
 *
 *   • FASE 4b — a decisão sobre o Lenis. A hipótese a testar é que os deltas
 *     brutos de roda no Windows deixam o movimento escalonado o bastante para
 *     quebrar a ilusão de objeto contínuo. O número que decide é a dispersão do
 *     deslocamento do símbolo entre quadros consecutivos: movimento contínuo tem
 *     deltas parecidos; escalonado alterna surtos e paradas. O Lenis só entra se
 *     reduzir essa dispersão em ≥30% sem custar quadros (§6.2 do plano).
 *
 * O gesto é sintetizado pelo CDP com origem `mouse`, então passa pelo mesmo
 * caminho de uma roda real — inclusive a rolagem suave do próprio Chrome.
 *
 *   node scripts/scroll-quality.mjs --url=http://localhost:3323 --runs=3
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const W = Number(argv.w ?? 1440);
const H = Number(argv.h ?? 900);
/** Onde começar a rolar. O padrão cai na transição Hero → Problema. */
const FROM = Number(argv.from ?? 200);
/**
 * Distância a percorrer, em px de documento.
 *
 * Precisa caber INTEIRA dentro de uma transição da coreografia. Medindo um
 * trecho que inclui uma espera, um quarto dos quadros aparece como "parado" —
 * e isso é a espera funcionando, não engasgo.
 */
const DISTANCE = Number(argv.distance ?? 700);
/** Velocidade do gesto, em px/s. Rolagem rápida, mas humana. */
const SPEED = Number(argv.speed ?? 2400);
/** Repetições. O ambiente é ruidoso; uma execução só não decide nada. */
const RUNS = Number(argv.runs ?? 3);
/** CSS injetado antes de medir. Ver a nota no laço de execução. */
const CSS_EXTRA = argv.css ?? '';

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
const std = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((v) => (v - m) ** 2)));
};
const at = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;

/**
 * Recorta a janela em que o movimento de fato acontece e devolve as estatísticas
 * do trecho ESTÁVEL dela.
 *
 * O recorte importa: incluir a aceleração inicial e a desaceleração final
 * inflaria a dispersão com variação que é do gesto, não do escalonamento. Os
 * quadros parados DENTRO da janela, ao contrário, são justamente o sintoma
 * procurado e ficam.
 */
function analyse(frames) {
  let a = 0;
  while (a < frames.length - 1 && Math.abs(frames[a + 1].s - frames[a].s) < 0.01) a++;
  let b = frames.length - 1;
  while (b > a && Math.hypot(frames[b].x - frames[b - 1].x, frames[b].y - frames[b - 1].y) < 0.05) {
    b--;
  }
  const win = frames.slice(a, b + 1);
  const lo = Math.floor(win.length * 0.15);
  const hi = Math.ceil(win.length * 0.85);
  const steady = win.slice(lo, hi);

  const symbol = [];
  const scroll = [];
  for (let i = 1; i < steady.length; i++) {
    symbol.push(Math.hypot(steady[i].x - steady[i - 1].x, steady[i].y - steady[i - 1].y));
    scroll.push(Math.abs(steady[i].s - steady[i - 1].s));
  }
  const dts = [];
  for (let i = 1; i < frames.length; i++) dts.push(frames[i].t - frames[i - 1].t);
  dts.sort((x, y) => x - y);
  const vsync = at(dts, 0.05) || 16.7;

  /**
   * Tremor: a parte de ALTA FREQUÊNCIA da variação, normalizada pelo passo médio.
   *
   * O coeficiente de variação sozinho não serve de gate. A coreografia usa
   * curvas de easing, então a velocidade do símbolo varia de propósito ao longo
   * do trecho — e isso infla o CV sem que exista engasgo nenhum. Comparando cada
   * passo com a média dos vizinhos, a rampa suave se cancela e sobra só o que
   * oscila de um quadro para o outro. É esse resíduo que o Lenis atacaria.
   */
  const jitter = (xs) => {
    const res = [];
    for (let i = 1; i < xs.length - 1; i++) res.push(xs[i] - (xs[i - 1] + xs[i + 1]) / 2);
    return std(res) / (mean(xs) || 1);
  };

  return {
    symbolJitter: jitter(symbol),
    scrollJitter: jitter(scroll),
    frames: frames.length,
    fromY: win[0]?.s ?? 0,
    toY: win[win.length - 1]?.s ?? 0,
    window: win.length,
    steady: steady.length,
    vsync,
    dropped: dts.filter((d) => d > vsync * 1.5).length / (dts.length || 1),
    frameMean: mean(dts),
    frameP95: at(dts, 0.95),
    symbolMean: mean(symbol),
    symbolStd: std(symbol),
    symbolCv: std(symbol) / (mean(symbol) || 1),
    // Quadro parado no meio do movimento: o sintoma direto de escalonamento.
    symbolStall: symbol.filter((v) => v < 0.25).length / (symbol.length || 1),
    scrollMean: mean(scroll),
    scrollStd: std(scroll),
    scrollCv: std(scroll) / (mean(scroll) || 1),
    scrollStall: scroll.filter((v) => v < 0.5).length / (scroll.length || 1),
  };
}

await run(
  async ({ evaluate, setViewport, navigate, send }) => {
    const rows = [];

    for (let r = 0; r < RUNS; r++) {
      await setViewport(W, H);
      await navigate(url, 1800);

      /*
       * Folha de estilo injetada, para A/B controlado.
       *
       * A pergunta que isto responde não é "quantos ms custa a página", e sim
       * "quantos ms custa ESTA declaração" — mesmo servidor, mesma janela, mesma
       * sessão. Foi assim que a Fase 6 descobriu que o cubo em SVG custava 8,7ms
       * por quadro a mais que o mesmo cubo em CSS.
       */
      if (CSS_EXTRA) {
        await evaluate(`(() => {
          const s = document.createElement('style');
          s.textContent = ${JSON.stringify(CSS_EXTRA)};
          document.head.appendChild(s);
        })()`);
      }

      await evaluate(`(async () => {
        window.scrollTo(0, ${FROM});
        await new Promise((r) => setTimeout(r, 1000));
      })()`);

      // Um registro por quadro: tempo, posição do símbolo e da página.
      await evaluate(`(() => {
        // Sem símbolo a página serve de LINHA DE BASE: mede o custo do harness.
        const left = document.getElementById('sym-left');
        window.__q = { frames: [], on: false };
        const tick = (t) => {
          if (window.__q.on) {
            const b = left ? left.getBoundingClientRect() : { left: 0, width: 0, top: 0, height: 0 };
            window.__q.frames.push({ t, x: b.left + b.width / 2, y: b.top + b.height / 2, s: scrollY });
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })()`);

      await evaluate('window.__q.on = true');
      /*
       * `Input.synthesizeScrollGesture` com origem `mouse`, não
       * `dispatchMouseEvent`: evento de roda despachado direto rola a página
       * INSTANTANEAMENTE. Uma medição anterior tinha exatamente 45 quadros com
       * movimento para 45 eventos, o que não mede scroll nenhum.
       */
      await send('Input.synthesizeScrollGesture', {
        x: Math.round(W / 2),
        y: Math.round(H / 2),
        xDistance: 0,
        yDistance: -DISTANCE,
        speed: SPEED,
        gestureSourceType: 'mouse',
      });
      await sleep(1200); // deixa o scrub assentar
      await evaluate('window.__q.on = false');

      rows.push(analyse(await evaluate('window.__q.frames')));
    }

    const avg = (k) => mean(rows.map((x) => x[k]));
    const pc = (v) => `${(100 * v).toFixed(1)}%`;

    console.log(`${url}  ${W}x${H}${CSS_EXTRA ? `  ·  css: ${CSS_EXTRA}` : ''}`);
    console.log(
      `${RUNS} execuções · ${DISTANCE}px a ${SPEED}px/s, de scrollY ${FROM} a ${FROM + DISTANCE}`,
    );
    console.log(
      `janela útil ${avg('window').toFixed(0)} quadros ` +
        `(scrollY ${avg('fromY').toFixed(0)} → ${avg('toY').toFixed(0)}), ` +
        `trecho estável ${avg('steady').toFixed(0)}\n`,
    );

    console.log('quadros');
    console.log(`  vsync estimado     ${avg('vsync').toFixed(2)}ms`);
    console.log(`  intervalo médio    ${avg('frameMean').toFixed(2)}ms`);
    console.log(`  p95                ${avg('frameP95').toFixed(2)}ms`);
    console.log(`  quadros perdidos   ${pc(avg('dropped'))}`);

    console.log('\nentrada — quanto a PÁGINA anda por quadro');
    console.log(`  média              ${avg('scrollMean').toFixed(2)}px`);
    console.log(`  desvio-padrão      ${avg('scrollStd').toFixed(2)}px`);
    console.log(`  coef. de variação  ${avg('scrollCv').toFixed(3)}`);
    console.log(`  tremor (alta freq) ${avg('scrollJitter').toFixed(3)}`);
    console.log(`  quadros parados    ${pc(avg('scrollStall'))}`);

    console.log('\nsaída — quanto o SÍMBOLO anda por quadro   (o número do gate)');
    console.log(`  média              ${avg('symbolMean').toFixed(2)}px`);
    console.log(`  desvio-padrão      ${avg('symbolStd').toFixed(2)}px`);
    console.log(`  coef. de variação  ${avg('symbolCv').toFixed(3)}`);
    console.log(`  TREMOR (alta freq) ${avg('symbolJitter').toFixed(3)}   <- o número do gate`);
    console.log(`  quadros parados    ${pc(avg('symbolStall'))}`);

    console.log('\npor execução (coef. de variação do símbolo):');
    console.log(`  ${rows.map((x) => x.symbolCv.toFixed(3)).join('   ')}`);
  },
  {
    port: Number(argv.port ?? 9424),
    profile: '.shots/.chrome-quality',
    headless: argv.headed !== 'true',
    uncapped: argv.uncapped === 'true',
  },
);
