/**
 * O segundo aceite da Fase 8 (plano §18):
 *
 *   "cada visual trocável alterando uma prop, comprovado por um teste de render"
 *
 * A prova é COMPARATIVA, e é o que a torna uma prova em vez de uma afirmação:
 * a mesma seção é renderizada duas vezes — a home e `/servicos/troca`, que só
 * passa `visuais` girado um lugar — e o script mostra que
 *
 *   1. a árvore de cada card FORA do slot do visual é idêntica nas duas;
 *   2. dentro do slot, o mock do card i virou o do card i+1;
 *   3. os quatro mocks são de fato diferentes entre si.
 *
 * A terceira não é redundante: sem ela, quatro slots vazios passariam nas duas
 * primeiras. É a mesma armadilha que a Fase 6 encontrou no aceite do hero.
 *
 *   node scripts/check-visuais.mjs --url=http://localhost:3418
 */
import { args, run } from './cdp.mjs';

const argv = args();
const url = (argv.url ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * Assinatura de uma subárvore: tags, classes, texto e — nas imagens — a fonte.
 *
 * As classes de CSS Modules carregam um sufixo de hash estável entre rotas do
 * mesmo build, então elas servem de identidade do componente — é justamente o
 * que permite dizer "este slot passou a conter o visual do vizinho".
 *
 * O `src` entrou na Fase 14 e não é detalhe. Enquanto os visuais eram quatro
 * maquetes de interface, cada uma com dezenas de nós próprios, a árvore bastava
 * para distingui-las. Agora os quatro são o MESMO componente com a mesma classe
 * apontando para arquivos diferentes: sem a fonte na assinatura, os quatro
 * ficariam idênticos, a lei dos "quatro visuais diferentes entre si" reprovaria
 * e — pior — a lei do giro passaria comparando quatro coisas iguais.
 */
const SONDA = `(() => {
  const assinar = (el) => {
    const partes = [];
    const anda = (n, prof) => {
      if (n.nodeType === 3) {
        const t = n.textContent.trim();
        if (t) partes.push(prof + ':"' + t + '"');
        return;
      }
      if (n.nodeType !== 1) return;
      const fonte = n.tagName === 'IMG' ? '#' + (n.getAttribute('src') || '') : '';
      partes.push(prof + ':' + n.tagName + '.' + (n.getAttribute('class') || '') + fonte);
      for (const f of n.childNodes) anda(f, prof + 1);
    };
    anda(el, 0);
    return partes.join('|');
  };

  return [...document.querySelectorAll('[data-card]')].map((card) => {
    const slot = card.querySelector('[data-visual]');
    const visual = slot ? assinar(slot) : '';
    // a estrutura do card SEM o slot: remove-se a subárvore do visual da cópia
    const copia = card.cloneNode(true);
    const alvo = copia.querySelector('[data-visual]');
    if (alvo) alvo.replaceChildren();
    return {
      i: +card.dataset.card,
      servico: card.dataset.servico,
      estrutura: assinar(copia),
      visual,
      arte: slot ? (slot.querySelector('img')?.currentSrc || slot.querySelector('img')?.getAttribute('src') || '') : '',
    };
  });
})()`;

const digerir = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
};

await run(
  async ({ evaluate, setViewport, navigate }) => {
    await setViewport(1672, 941);

    await navigate(`${url}/`, 1800);
    const home = await evaluate(SONDA);
    await navigate(`${url}/servicos/troca`, 1800);
    const trocado = await evaluate(SONDA);

    console.log(`${url}  ·  home × /servicos/troca\n`);
    const arquivo = (u) => decodeURIComponent(u).split('/').pop()?.split('?')[0] ?? '—';
    console.log('  card  serviço      arte             estrutura   visual');
    for (const [i, c] of home.entries()) {
      const t = trocado[i];
      console.log(
        `   ${c.i + 1}    ${String(c.servico).padEnd(10)}   ${arquivo(c.arte).padEnd(15)}` +
          `  ${digerir(c.estrutura)}    ` +
          `${digerir(c.visual)} → ${digerir(t?.visual ?? '')}`,
      );
    }

    const falhas = [];
    const ok = (cond, texto) => {
      console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
      if (!cond) falhas.push(texto);
    };

    console.log('\nACEITE DA FASE 8 — troca de visual');

    ok(home.length === 4 && trocado.length === 4, `as duas rotas trazem quatro cards`);

    ok(
      home.every((c, i) => c.estrutura === trocado[i]?.estrutura),
      'a estrutura do card fora do slot é idêntica nas duas rotas',
    );

    const girou = home.every((_, i) => trocado[i]?.visual === home[(i + 1) % home.length]?.visual);
    ok(girou, 'dentro do slot, o mock de cada card virou o do vizinho');

    const distintos = new Set(home.map((c) => c.visual));
    ok(
      distintos.size === home.length,
      `os quatro mocks são diferentes entre si (${distintos.size} assinaturas para ${home.length} cards)`,
    );

    /*
     * NENHUM SLOT VAZIO — a lei que impede as três de cima de passarem no vácuo.
     *
     * Ela media "pelo menos 8 nós de DOM no slot", o que fazia sentido quando o
     * visual era uma maquete de interface de dezenas de elementos. Com a arte da
     * Fase 14 o slot tem UM nó, e a mesma pergunta se responde melhor: o slot
     * carrega uma imagem, e essa imagem é a do serviço.
     *
     * `currentSrc` porque é o que o navegador de fato resolveu do `srcset` que o
     * `next/image` monta — se a arte não carregasse, ele estaria vazio.
     */
    ok(
      home.every(
        (c) => c.arte && c.arte.includes(encodeURIComponent(`/art/servicos/${c.servico}`)),
      ),
      `cada slot carrega a arte do próprio serviço`,
    );

    if (falhas.length) throw new Error(`${falhas.length} critério(s) da Fase 8 não verificado(s)`);
    console.log('\nOK — o visual é uma prop, e trocá-la não mexe em mais nada do card.');
  },
  { port: Number(argv.port ?? 9493), profile: '.shots/.chrome-visuais' },
);
