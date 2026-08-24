/**
 * Invariante de arquitetura do símbolo: nenhum filtro em nó que anima.
 *
 * `filter` (CSS ou SVG) força re-rasterização a cada mudança de escala, e o
 * símbolo é escalado durante a página inteira. O relevo inteiro é pintura
 * estática justamente para não precisar de filtro. Isto verifica no DOM em
 * execução, não no código-fonte — é o único lugar onde a afirmação vale.
 *
 * O `backdrop-filter` do header é permitido e fica de fora: ele não escala nem
 * participa da coreografia (o custo dele é medido separadamente na Fase 13).
 *
 *   node scripts/assert-no-filters.mjs --url=http://localhost:3311/simbolo
 */
import { args, run } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';

await run(
  async ({ evaluate, setViewport, navigate }) => {
    await setViewport(Number(argv.w ?? 1440), Number(argv.h ?? 900));
    await navigate(url);

    const report = await evaluate(`(() => {
      const svgFilters = document.querySelectorAll('filter').length;
      // Tudo que pertence ao símbolo: a camada persistente e qualquer SVG do relevo.
      const roots = [...document.querySelectorAll('[data-symbol], [data-layer]')]
        .map((el) => el.closest('svg') ?? el);
      const scope = new Set();
      for (const r of roots) {
        scope.add(r);
        for (const el of r.querySelectorAll('*')) scope.add(el);
      }
      const offenders = [];
      for (const el of scope) {
        const cs = getComputedStyle(el);
        const bad = [];
        if (cs.filter && cs.filter !== 'none') bad.push('filter: ' + cs.filter);
        if (cs.backdropFilter && cs.backdropFilter !== 'none') bad.push('backdrop-filter: ' + cs.backdropFilter);
        if (bad.length) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            layer: el.getAttribute && el.getAttribute('data-layer'),
            css: bad.join(' · '),
          });
        }
      }
      return { svgFilters, inspected: scope.size, offenders };
    })()`);

    console.log(`url ${url}`);
    console.log(`  elementos do símbolo inspecionados: ${report.inspected}`);
    console.log(`  elementos <filter> no documento:    ${report.svgFilters}`);
    console.log(`  nós do símbolo com filtro CSS:      ${report.offenders.length}`);

    if (report.inspected === 0) {
      throw new Error('nenhum nó do símbolo encontrado — a asserção não verificou nada');
    }
    for (const o of report.offenders) {
      console.error(`  ✗ <${o.tag}> data-layer=${o.layer ?? '-'}  ${o.css}`);
    }
    if (report.svgFilters || report.offenders.length) {
      throw new Error('há filtro no caminho do símbolo');
    }
    console.log('\nOK — o relevo é pintura estática, sem filtro em nenhum nó animado.');
  },
  { port: Number(argv.port ?? 9414), profile: '.shots/.chrome-assert' },
);
