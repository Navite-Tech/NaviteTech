/**
 * Critério de aceite da Fase 4: o símbolo é um OBJETO, não uma sequência de
 * aparições.
 *
 * Duas afirmações, verificadas no DOM em execução — não no código:
 *
 *   1. CONTINUIDADE. Amostra N posições de rolagem, mede a caixa de cada metade
 *      e procura SALTOS — variações desproporcionais à vizinhança. Um teleporte
 *      (trocar a imagem entre seções, reposicionar escondido atrás de opacidade
 *      zero) aparece como um pico isolado numa curva que era suave.
 *
 *      A opacidade é IGNORADA de propósito: sumir e reaparecer em outro lugar é
 *      exatamente o que não pode acontecer, então esconder o salto não deve
 *      passar no teste.
 *
 *   2. PERMANÊNCIA. Marca os dois nós com um token antes de rolar e confere no
 *      fim se continua lá, além de observar o palco com um MutationObserver.
 *      Se o React remontasse as metades em algum ponto, o token some.
 *
 *   node scripts/verify-symbol-continuity.mjs --url=http://localhost:3311
 */
import { args, run } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const samples = Number(argv.n ?? 120);
const W = Number(argv.w ?? 1440);
const H = Number(argv.h ?? 900);
/**
 * Um salto precisa ser grande em termos absolutos E desproporcional à
 * vizinhança. Só o primeiro reprovaria movimento rápido legítimo; só o segundo
 * transformaria qualquer respiro perto do repouso em falso positivo.
 */
const FLOOR = Number(argv.floor ?? 2); // % da viewport
const FACTOR = Number(argv.factor ?? 3); // vezes os vizinhos imediatos

/**
 * Controle negativo: injeta um teleporte artificial na LEITURA a partir desta
 * posição de rolagem. Um teste verde que não sabe reprovar não prova nada.
 *
 *   node scripts/verify-symbol-continuity.mjs --selftest=6000
 */
const SELFTEST = argv.selftest ? Number(argv.selftest) : null;

await run(
  async ({ evaluate, setViewport, navigate }) => {
    await setViewport(W, H);
    await navigate(url, 1800);

    const setup = await evaluate(`(() => {
      const left = document.getElementById('sym-left');
      const right = document.getElementById('sym-right');
      if (!left || !right) throw new Error('camada do símbolo não encontrada');

      // Token de permanência e observador de remontagem.
      const token = 'navite-' + Math.random().toString(36).slice(2);
      left.__naviteToken = token;
      right.__naviteToken = token;
      window.__naviteMutations = 0;
      const stage = left.parentElement;
      new MutationObserver((records) => {
        for (const r of records) window.__naviteMutations += r.removedNodes.length;
      }).observe(stage, { childList: true, subtree: true });

      const SELFTEST = ${SELFTEST === null ? 'null' : SELFTEST};
      window.__naviteRead = () => {
        const b = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
        };
        const out = { left: b(left), right: b(right) };
        // Teleporte artificial, só para provar que o detector reprova.
        if (SELFTEST !== null && scrollY >= SELFTEST) out.left.x += 200;
        return out;
      };

      /*
       * Esperar a posição PARAR — com um piso de tempo.
       *
       * O scrub leva alguns quadros para sequer começar a se mover. Sem o piso,
       * "dois quadros iguais" acontece ANTES do movimento começar e a função
       * devolve a posição anterior: variações reais viram zero e uma amostra
       * atrasada vira um "salto" que não existe. Foi exatamente o que a primeira
       * versão deste script reportou.
       */
      window.__naviteSettle = async (minMs = 260, budgetMs = 1400) => {
        const t0 = performance.now();
        let prev = null;
        let stable = 0;
        while (performance.now() - t0 < budgetMs) {
          await new Promise((r) => requestAnimationFrame(r));
          const cur = window.__naviteRead();
          const same =
            prev &&
            Math.abs(cur.left.x - prev.left.x) < 0.05 &&
            Math.abs(cur.left.y - prev.left.y) < 0.05 &&
            Math.abs(cur.left.w - prev.left.w) < 0.05 &&
            Math.abs(cur.right.x - prev.right.x) < 0.05;
          if (same && ++stable >= 3 && performance.now() - t0 >= minMs) return cur;
          if (!same) stable = 0;
          prev = cur;
        }
        return prev ?? window.__naviteRead();
      };

      const sections = [...document.querySelectorAll('#journey > section')].map((el) => ({
        id: el.id,
        top: el.getBoundingClientRect().top + scrollY,
      }));

      return {
        token,
        maxScroll: document.documentElement.scrollHeight - innerHeight,
        docHeight: document.documentElement.scrollHeight,
        sections,
      };
    })()`);

    const screens = (setup.docHeight / H).toFixed(1);
    console.log(`${url}  ${W}x${H}`);
    console.log(
      `documento ${setup.docHeight}px (${screens} telas)  rolagem máxima ${setup.maxScroll}px`,
    );
    console.log(
      `${samples} amostras · salto = acima de ${FLOOR}% da viewport E ${FACTOR}× os vizinhos imediatos\n`,
    );

    const rows = [];
    for (let i = 0; i < samples; i++) {
      const y = Math.round((i * setup.maxScroll) / (samples - 1));
      const r = await evaluate(`(async () => {
        window.scrollTo(0, ${y});
        return window.__naviteSettle();
      })()`);
      rows.push({ y, ...r });
    }

    const after = await evaluate(`(() => {
      const left = document.getElementById('sym-left');
      const right = document.getElementById('sym-right');
      return {
        kept: Boolean(left && right && left.__naviteToken && right.__naviteToken),
        token: left && left.__naviteToken,
        removals: window.__naviteMutations,
      };
    })()`);

    // --- descontinuidade -----------------------------------------------------
    const deltas = { left: [], right: [] };
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      for (const side of ['left', 'right']) {
        const dx = (100 * Math.abs(b[side].x - a[side].x)) / W;
        const dy = (100 * Math.abs(b[side].y - a[side].y)) / H;
        const dw = (100 * Math.abs(b[side].w - a[side].w)) / W;
        deltas[side].push({ scrollY: b.y, dx, dy, dw, d: Math.max(dx, dy, dw) });
      }
    }

    /*
     * A comparação é com os vizinhos IMEDIATOS, não com uma janela larga.
     *
     * Uma curva de easing concentra o movimento no meio do trecho — `power3.inOut`
     * chega a 4× a velocidade média. Contra a mediana de uma janela de nove
     * amostras, esse pico legítimo aparece como 8× e reprova. Contra os vizinhos
     * imediatos ele aparece como ~1,1×, porque a aceleração é suave.
     *
     * Um teleporte, por definição, tem largura de UMA amostra: os vizinhos estão
     * parados. É exatamente essa a assinatura que sobra.
     */
    const outliers = [];
    let maxDelta = 0;
    for (const side of ['left', 'right']) {
      const list = deltas[side];
      for (let i = 0; i < list.length; i++) {
        maxDelta = Math.max(maxDelta, list[i].d);
        const base = Math.max(list[i - 1]?.d ?? 0, list[i + 1]?.d ?? 0);
        const ratio = base > 0.05 ? list[i].d / base : list[i].d > FLOOR ? Infinity : 0;
        if (list[i].d > FLOOR && ratio > FACTOR) {
          outliers.push({ side, ...list[i], base, ratio });
        }
      }
    }
    outliers.sort((p, q) => q.ratio - p.ratio);

    const sectionAt = (y) =>
      [...setup.sections].reverse().find((s) => y >= s.top - H / 2)?.id ?? 'antes';

    // Perfil de velocidade: quanto o símbolo anda por amostra, seção a seção.
    console.log('velocidade por seção (variação média e máxima por amostra, % da viewport):');
    for (const s of setup.sections) {
      const inSection = deltas.left
        .map((d, i) => ({ d: Math.max(d.d, deltas.right[i].d), y: d.scrollY }))
        .filter((d) => sectionAt(d.y) === s.id);
      if (!inSection.length) continue;
      const avg = inSection.reduce((t, d) => t + d.d, 0) / inSection.length;
      const mx = Math.max(...inSection.map((d) => d.d));
      console.log(
        `  ${s.id.padEnd(10)} ${inSection.length.toString().padStart(3)} amostras   ` +
          `média ${avg.toFixed(2)}%   máx ${mx.toFixed(2)}%   ${'▁▂▃▄▅▆▇█'[Math.min(7, Math.round(avg))]}`,
      );
    }

    console.log('');
    console.log(
      `  permanência: token ${after.kept ? 'INTACTO' : 'PERDIDO'} (${after.token ?? '—'})`,
    );
    console.log(`  nós removidos do palco durante a rolagem: ${after.removals}`);
    console.log(`  maior variação entre amostras: ${maxDelta.toFixed(2)}% (movimento, não salto)`);
    console.log(`  saltos (> ${FLOOR}% e ${FACTOR}× os vizinhos): ${outliers.length}`);
    for (const o of outliers.slice(0, 6)) {
      console.log(
        `    ✗ ${o.d.toFixed(2)}% na metade ${o.side} em scrollY ${o.scrollY} (${sectionAt(o.scrollY)}), ` +
          `vizinhos ${o.base.toFixed(2)}% → ${o.ratio === Infinity ? '∞' : o.ratio.toFixed(1) + '×'}`,
      );
    }

    const problems = [];
    if (!after.kept) problems.push('as metades foram remontadas — o token sumiu');
    if (after.removals > 0) problems.push(`${after.removals} nó(s) removido(s) do palco`);
    if (outliers.length) problems.push(`${outliers.length} salto(s) de posição`);

    if (problems.length) {
      for (const p of problems) console.error(`  ✗ ${p}`);
      throw new Error('continuidade reprovada');
    }
    console.log('\nOK — mesmo objeto do começo ao fim, sem salto.');
  },
  { port: Number(argv.port ?? 9418), profile: '.shots/.chrome-continuity' },
);
