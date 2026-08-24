/**
 * O aceite da Fase 7 (plano §18):
 *
 *   "4 cards avançam; o próximo espia 12 %; a metade do símbolo não se move um
 *    pixel durante a passagem dos cards; indicador de progresso sincronizado."
 *
 * As quatro afirmações viram proposições verificáveis, medidas do DOM e não de
 * pixel: caixa desenhada de cada card, fração visível dentro do recorte do
 * trilho, índice do traço ativo e caixa da metade esquerda do símbolo.
 *
 * A quinta lei não está no plano e existe para o teste não poder passar por
 * omissão: os cards TÊM de percorrer o trilho. Um teste que verifica "o símbolo
 * não se move" passa perfeitamente numa página onde nada se move.
 *
 *   node scripts/check-servicos.mjs --url=http://localhost:3394
 */
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const url = argv.url ?? 'http://localhost:3000';

/**
 * Um retrato do estado numa posição de rolagem.
 *
 * A fração visível de cada card é medida contra o RECORTE do trilho, não contra
 * a viewport: é o `overflow: hidden` do trilho que decide o que se vê, e um card
 * pode estar dentro da tela e fora do trilho.
 */
const SONDA = `(() => {
  const r = (el) => el.getBoundingClientRect();
  const secao = document.getElementById('servicos');
  const trilho = secao.querySelector('[class*="trilho"]');
  const cards = [...secao.querySelectorAll('[data-card]')];
  const esq = document.getElementById('sym-left');

  const cs = (el, p) => getComputedStyle(el).getPropertyValue(p).trim();
  const bt = r(trilho);

  const opacidadeEfetiva = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      o *= parseFloat(getComputedStyle(n).opacity);
    }
    return o;
  };

  return {
    reveal: +cs(secao, '--reveal') || 0,
    trilho: { topo: +bt.top.toFixed(2), base: +bt.bottom.toFixed(2), alt: +bt.height.toFixed(2) },
    simbolo: (() => {
      const b = r(esq);
      return { x: +b.left.toFixed(3), y: +b.top.toFixed(3), w: +b.width.toFixed(3), h: +b.height.toFixed(3) };
    })(),
    cards: cards.map((c) => {
      const b = r(c);
      /*
       * Fração visível pela ÁREA da interseção com o recorte do trilho, não só
       * pela altura. O card 01 chega de lado: no início da seção ele cobre o
       * trilho inteiro na vertical e está totalmente fora na horizontal — uma
       * medida só de altura o daria como visível.
       */
      const dx = Math.max(0, Math.min(bt.right, b.right) - Math.max(bt.left, b.left));
      const dy = Math.max(0, Math.min(bt.bottom, b.bottom) - Math.max(bt.top, b.top));
      const area = b.width * b.height;
      const traco = [...c.querySelectorAll('[data-tick]')];
      return {
        i: +c.dataset.card,
        x: +(b.left - bt.left).toFixed(2),
        topo: +(b.top - bt.top).toFixed(2),
        alt: +b.height.toFixed(2),
        visivel: +(area ? (dx * dy) / area : 0).toFixed(4),
        /*
         * Brilho PERCEBIDO do card, não a opacidade computada dele.
         *
         * O card que sai é escurecido por um veu chapado (::after), e nao pela
         * propria opacidade — ver a medicao de quadro em services.module.css. A
         * opacidade computada do card, portanto, e sempre 1; o que apaga esta no
         * pseudo-elemento. Ler so a do card daria "1,00" com o card ja na
         * sombra, que e a mesma armadilha que a Fase 6 encontrou no hero.
         */
        opacidade: +(
          opacidadeEfetiva(c) * (1 - (parseFloat(getComputedStyle(c, '::after').opacity) || 0))
        ).toFixed(3),
        /*
         * O translate USADO, e não --q/--e.
         *
         * Propriedade customizada sem registro em @property nao e resolvida:
         * getComputedStyle devolve o texto do clamp(), nao o numero. Lendo a
         * transformacao usada, o que se mede e o efeito, que e o que importa —
         * e de quebra sobrevive a qualquer mudanca na formula.
         */
        translate: getComputedStyle(c).translate,
        ativo: traco.findIndex((t) => t.hasAttribute('data-ativo')),
        tracos: traco.length,
      };
    }),
  };
})()`;

await run(
  async ({ evaluate, setViewport, navigate }) => {
    await setViewport(1672, 941);
    await navigate(url, 2200);

    const geo = await evaluate(`(() => {
      const s = document.getElementById('servicos');
      const topo = s.getBoundingClientRect().top + scrollY;
      return { topo, curso: s.offsetHeight - innerHeight };
    })()`);

    const ritmo = await evaluate(`(() => {
      const t = document.querySelector('#servicos [class*="trilho"]');
      const cs = getComputedStyle(t);
      const n = (p) => +cs.getPropertyValue(p).trim();
      return { assentado: n('--assentado'), passo: n('--passo'), espia: n('--espia') };
    })()`);

    /**
     * Rola até uma fração do curso e ESPERA A COREOGRAFIA ASSENTAR.
     *
     * `--reveal` acompanha a rolagem sem atraso (`scrub: true`), mas o símbolo
     * tem `scrub: 0.6` — ele chega alguns quadros depois. Amostrar cedo demais
     * flagraria o símbolo ainda em trânsito e reprovaria a lei 3 por um motivo
     * que não é o dela. Duas leituras iguais em sequência é o critério de
     * assentamento.
     */
    const irPara = async (p) => {
      const y = geo.topo + p * geo.curso;
      await evaluate(`(async () => {
        window.scrollTo(0, ${y});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      })()`);
      let anterior = null;
      for (let i = 0; i < 30; i++) {
        await sleep(80);
        const s = await evaluate(SONDA);
        const chave = JSON.stringify(s.simbolo);
        if (anterior === chave) return s;
        anterior = chave;
      }
      return evaluate(SONDA);
    };

    console.log(`${url}  1672×941  ·  Serviços\n`);
    console.log(
      `ritmo: card 01 assentado em ${ritmo.assentado}, ` +
        `passo ${ritmo.passo}, espia ${(ritmo.espia * 100).toFixed(0)}%\n`,
    );

    const falhas = [];
    const ok = (cond, texto) => {
      console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
      if (!cond) falhas.push(texto);
    };

    // --- os quatro pontos de repouso ----------------------------------------
    const repousos = [];
    const total = (await evaluate(SONDA)).cards.length;
    for (let i = 0; i < total; i++) repousos.push(await irPara(ritmo.assentado + i * ritmo.passo));

    console.log('nos quatro pontos de repouso:');
    console.log('   reveal   card       x     topo    visível   opac.  traço   translate');
    for (const [i, s] of repousos.entries()) {
      for (const c of s.cards) {
        const marca = c.i === i ? '→' : ' ';
        console.log(
          `  ${marca} ${s.reveal.toFixed(3)}   ${String(c.i + 1).padStart(2)}   ` +
            `${String(c.x).padStart(7)}  ${String(c.topo).padStart(7)}   ` +
            `${(c.visivel * 100).toFixed(1).padStart(6)}%  ` +
            `${c.opacidade.toFixed(2)}   ${c.ativo + 1}/${c.tracos}    ${c.translate}`,
        );
      }
      console.log('');
    }

    console.log('ACEITE DA FASE 7');

    // --- 1. os quatro cards avançam -----------------------------------------
    const assentados = repousos.map((s, i) => s.cards.find((c) => c.i === i));
    ok(total === 4, `a pilha tem quatro cards (encontrados ${total})`);
    ok(
      assentados.every(
        (c) => c && Math.abs(c.topo) < 1.5 && Math.abs(c.x) < 1.5 && c.opacidade > 0.99,
      ),
      `cada card chega ao canto do trilho e opaco ` +
        `(topos ${assentados.map((c) => c?.topo.toFixed(1) ?? '—').join(', ')}px)`,
    );
    ok(
      repousos.every((s, i) => s.cards.every((c) => (c.i < i ? c.opacidade < 0.5 : true))),
      'os anteriores ficam recuados e apagados atrás do da vez',
    );

    // --- 2. o próximo espia 12% ---------------------------------------------
    const espiadas = repousos.slice(0, -1).map((s, i) => s.cards.find((c) => c.i === i + 1));
    ok(
      espiadas.every((c) => c && Math.abs(c.visivel - ritmo.espia) <= 0.02),
      `o próximo espia ${(ritmo.espia * 100).toFixed(0)}% ` +
        `(medido ${espiadas.map((c) => ((c?.visivel ?? 0) * 100).toFixed(1)).join('%, ')}%)`,
    );

    // --- 3. o símbolo não se move um pixel ----------------------------------
    /*
     * A janela é [assentado, 1]: é exatamente o trecho em que a trilha do
     * símbolo tem o MESMO estado nas duas pontas (servicesLeft → servicesLeft),
     * e é a passagem inteira dos quatro cards. Antes de `assentado` o símbolo
     * está fazendo o handoff — a metade direita saindo de cena — e ali ele deve
     * mesmo se mover.
     */
    const AMOSTRAS = 48;
    const parado = [];
    for (let i = 0; i < AMOSTRAS; i++) {
      const p = ritmo.assentado + ((1 - ritmo.assentado) * i) / (AMOSTRAS - 1);
      parado.push(await irPara(p));
    }
    const ref = parado[0].simbolo;
    let maxDelta = 0;
    let onde = null;
    for (const s of parado) {
      for (const k of ['x', 'y', 'w', 'h']) {
        const d = Math.abs(s.simbolo[k] - ref[k]);
        if (d > maxDelta) {
          maxDelta = d;
          onde = `${k} em reveal ${s.reveal.toFixed(3)}`;
        }
      }
    }
    ok(
      maxDelta === 0,
      `a metade esquerda não se move um pixel durante a passagem ` +
        `(${AMOSTRAS} amostras de reveal ${ritmo.assentado} a 1,00; ` +
        `desvio máximo ${maxDelta.toFixed(3)}px${onde && maxDelta > 0 ? ` — ${onde}` : ''})`,
    );

    // --- 4. indicador sincronizado ------------------------------------------
    ok(
      assentados.every((c, i) => c && c.ativo === i && c.tracos === total),
      `o traço ativo do card da vez é o de índice dele ` +
        `(${assentados.map((c, i) => `${i + 1}→${(c?.ativo ?? -1) + 1}`).join(' ')})`,
    );

    // --- 5. anti-vacuidade: os cards de fato percorrem o trilho -------------
    /*
     * Sem esta lei, a lei 3 passaria numa página onde a pilha não existe. Ela
     * exige que cada card tenha SAÍDO de fora do recorte e chegado ao topo — ou
     * seja, que a passagem que a lei 3 diz não perturbar o símbolo tenha de fato
     * acontecido.
     */
    const inicio = await irPara(0);
    /* curso de cada card em 2D: o 01 chega de lado, os outros três por baixo */
    const forcaDoTrilho = inicio.cards.map((c, i) => {
      const fim = assentados[i];
      return fim ? Math.hypot(c.x - fim.x, c.topo - fim.topo) : 0;
    });
    ok(
      inicio.cards.every((c) => c.visivel < 0.2),
      `no início da seção nenhum card está posto ` +
        `(visíveis ${inicio.cards.map((c) => (c.visivel * 100).toFixed(0)).join('%, ')}%)`,
    );
    ok(
      forcaDoTrilho.every((d) => d > inicio.trilho.alt * 0.4),
      `cada card percorre o trilho até o topo ` +
        `(curso ${forcaDoTrilho.map((d) => d.toFixed(0)).join(', ')}px num trilho de ${inicio.trilho.alt.toFixed(0)}px)`,
    );

    if (falhas.length) throw new Error(`${falhas.length} critério(s) da Fase 7 não verificado(s)`);
    console.log('\nOK — a pilha cumpre o aceite do §18.');
  },
  { port: Number(argv.port ?? 9476), profile: '.shots/.chrome-servicos' },
);
