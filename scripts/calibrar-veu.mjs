/**
 * CALIBRA O VÉU DE CADA ARTE DO MÉTODO — por medição, não por gosto.
 *
 * O véu não é parte da composição: é o custo de legibilidade que cada arte
 * cobra, e ele varia porque as artes variam. A malha escura da 01 não cobra
 * nada; as ripas de luz da 03 cobram. A Fase 15 aplicava o mesmo gradiente às
 * quatro — 44% da altura a até 88% de opacidade —, que é escurecer a arte por
 * precaução, e o item 3 do briefing proíbe justamente isso.
 *
 * Este script faz a BUSCA: para cada peça e cada bloco de texto, sobe o véu de
 * degrau em degrau, recompõe a página de verdade e mede o contraste WCAG no
 * PIXEL COMPOSTO — não num modelo do gradiente. Para no primeiro degrau que
 * passa. O que ele imprime é o menor véu que torna aquele texto legível naquela
 * imagem, e é esse número que vai para `lib/content/process.ts`.
 *
 * A MEDIÇÃO É DO PIOR PIXEL, não da média. Um texto legível em média sobre uma
 * ripa de luz é um texto ilegível numa palavra.
 *
 * Só a caixa REAL do texto é amostrada, lida do DOM — não a faixa inteira do
 * gradiente. Onde não há glifo não há problema de contraste.
 *
 * O TEXTO É ESCONDIDO ANTES DE MEDIR, e essa linha é a diferença entre um
 * instrumento e um gerador de números. A primeira versão media a captura com o
 * texto pintado e tentava pular os glifos por proximidade de cor. Não funciona:
 * a borda ANTISSERRILHADA de cada glifo passa por todos os valores entre a cor
 * do texto e a do fundo, então o "pior pixel" era sempre meia-borda de letra, e
 * as oito medições davam 1,25:1 — inclusive a da 01, que a olho é branco sobre
 * quase preto. Um número que não muda quando o véu sobe está medindo outra
 * coisa.
 *
 * Com `visibility: hidden` nos blocos de texto, o que sobra na caixa é
 * exatamente o fundo que o texto vai ter: arte mais véu, composto pelo
 * navegador.
 *
 *   node scripts/calibrar-veu.mjs --url=http://localhost:3431
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);
const TMP = '.shots/.tmp-veu';

/** Os degraus da busca. Grosso o bastante para não render números falsamente precisos. */
const DEGRAUS = [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85];

/**
 * Alvo de contraste.
 *
 * 4,5:1 nos dois blocos, e nenhum deles se qualifica como "texto grande": a
 * descrição tem 14px e o título 20,9px em peso 500 — a isenção de 3:1 exige
 * 24px, ou 18,66px em negrito.
 */
const ALVO = 4.5;

const TEXTO = { r: 0xf2, g: 0xef, b: 0xea }; // --bone, no numeral e no título
const MUTED = { r: 0xae, g: 0xb7, b: 0xc0 }; // --text-muted, na descrição

const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = (r, g, b) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
const razao = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

/**
 * Contraste ONDE OS GLIFOS ESTÃO — e só ali.
 *
 * Duas capturas por degrau: uma com o texto escondido, que é o FUNDO puro, e
 * outra com o texto visível. A diferença entre as duas é a máscara dos glifos,
 * bordas antisserrilhadas incluídas. Mede-se então o fundo apenas nos pixels da
 * máscara — o que a pergunta de legibilidade de fato é.
 *
 * A SEGUNDA VERSÃO DESTA FUNÇÃO, e a primeira estava errada por excesso. Ela
 * varria a caixa inteira e devolvia o pixel mais claro. A caixa do numeral e do
 * título tem 315 x 70px, e a malha da 01 tem estrelas brancas espalhadas: uma
 * única delas, num canto onde não há letra nenhuma, reprovava a peça a 1,1:1
 * enquanto a captura mostrava branco sobre quase preto, perfeitamente legível.
 * Medir a caixa é medir a moldura; o que se lê é a letra.
 *
 * A máscara é DILATADA em 1px porque o olho lê o contraste da haste contra o
 * que a cerca, não contra o pixel exato sob ela.
 *
 * E o resultado é o PERCENTIL 1, não o mínimo absoluto: um pixel isolado sob uma
 * haste não decide legibilidade, uma região clara sob uma palavra decide. Com 1%
 * de folga num universo de milhares de pixels de glifo, uma alta-luz de verdade
 * continua reprovando — ela nunca é um pixel só.
 */
function contrasteNosGlifos(fundo, comTexto, caixa, cor) {
  const lTexto = lum(cor.r, cor.g, cor.b);
  const x0 = Math.max(1, Math.round(caixa.l));
  const x1 = Math.min(fundo.w - 1, Math.round(caixa.l + caixa.w));
  const y0 = Math.max(1, Math.round(caixa.t));
  const y1 = Math.min(fundo.h - 1, Math.round(caixa.t + caixa.h));
  const lw = x1 - x0;
  const lh = y1 - y0;
  if (lw <= 0 || lh <= 0) return { valor: null, glifos: 0 };

  /* máscara: onde a captura com texto difere da sem texto */
  const bruta = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const i = ((y0 + y) * fundo.w + (x0 + x)) * 4;
      const d =
        Math.abs(fundo.rgba[i] - comTexto.rgba[i]) +
        Math.abs(fundo.rgba[i + 1] - comTexto.rgba[i + 1]) +
        Math.abs(fundo.rgba[i + 2] - comTexto.rgba[i + 2]);
      if (d > 24) bruta[y * lw + x] = 1;
    }
  }

  /* dilatação de 1px */
  const mask = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      if (!bruta[y * lw + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < lh && nx >= 0 && nx < lw) mask[ny * lw + nx] = 1;
        }
      }
    }
  }

  const valores = [];
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      if (!mask[y * lw + x]) continue;
      const i = ((y0 + y) * fundo.w + (x0 + x)) * 4;
      valores.push(razao(lTexto, lum(fundo.rgba[i], fundo.rgba[i + 1], fundo.rgba[i + 2])));
    }
  }
  /*
   * NENHUM GLIFO NA CAIXA não é "contraste perfeito": é "não medi nada". Isso
   * acontece quando a peça está fora da tela — no empilhamento do celular, só
   * uma ou duas cabem de cada vez —, e a primeira versão devolvia 21:1 ali, que
   * o relatório imprimia como aprovação com véu zero. Um falso positivo de
   * acessibilidade é pior do que não medir, então devolve-se `null` e o
   * relatório mostra `n/d`.
   */
  if (!valores.length) return { valor: null, glifos: 0 };

  valores.sort((a, b) => a - b);
  const p1 = valores[Math.floor(valores.length * 0.01)];
  return { valor: p1, glifos: valores.length };
}

/**
 * Apaga ou devolve os GLIFOS — nunca o bloco.
 *
 * Era `visibility: hidden` no bloco de texto, e virou `color: transparent` nele
 * e nos filhos quando o véu passou a ser o FUNDO desse mesmo bloco: esconder o
 * bloco passou a esconder o véu junto, e a busca parou de responder — a 03
 * media 1,1:1 em todos os nove degraus, que é o instrumento medindo arte nua e
 * chamando de "com véu 0,85".
 *
 * Com a cor transparente o fundo continua pintando e só as letras somem, que é
 * exatamente o que a máscara de glifos precisa dos dois lados.
 */
const texto = (visivel) =>
  `(() => {
     const blocos = document.querySelectorAll('[data-no] [class*="dadosTopo"], [data-no] [data-descricao]');
     for (const bloco of blocos) {
       for (const el of [bloco, ...bloco.querySelectorAll('*')]) {
         el.style.color = ${visivel} ? '' : 'transparent';
       }
     }
     return true;
   })()`;

/** Aplica o mesmo véu, nos dois lados, às quatro peças. */
const veuGeral = (v) =>
  `(() => {
     for (const p of document.querySelectorAll('[data-no]')) {
       p.style.setProperty('--veu-topo', '${v}');
       p.style.setProperty('--veu-base', '${v}');
     }
     return true;
   })()`;

/** Caixas reais dos dois blocos de texto de cada peça. */
const CAIXAS = `(() => {
  const r = (el) => { const b = el.getBoundingClientRect();
    return { l:+b.left.toFixed(1), t:+b.top.toFixed(1), w:+b.width.toFixed(1), h:+b.height.toFixed(1) }; };
  return [...document.querySelectorAll('[data-no]')].map((p) => ({
    i: +p.dataset.no,
    etapa: p.dataset.etapa,
    topo: r(p.querySelector('[class*="dadosTopo"]')),
    base: r(p.querySelector('[data-descricao]')),
  }));
})()`;

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    mkdirSync(TMP, { recursive: true });

    await setViewport(W, H);
    await navigate(url, 1200);
    const calha = await evaluate('innerWidth - document.documentElement.clientWidth');
    await setViewport(W + calha, H);
    await navigate(url, 2200);

    const geo = await evaluate(`(() => { const s = document.getElementById('processo');
      return { topo: s.getBoundingClientRect().top + scrollY, curso: s.offsetHeight - innerHeight }; })()`);
    await evaluate(`(async () => {
      window.scrollTo(0, ${geo.topo + geo.curso * 0.85});
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    await sleep(1200);

    const caixas = await evaluate(CAIXAS);

    console.log(
      `${url}  ${W}x${H}  ·  alvo ${ALVO}:1 sob os glifos  ·  ` +
        (argv.verificar === undefined
          ? `busca nos degraus ${DEGRAUS.join(' ')}`
          : 'VERIFICAÇÃO dos valores autorados'),
    );
    console.log();

    /*
     * DUAS CAPTURAS POR DEGRAU, e as oito caixas medidas nelas.
     *
     * Os dois véus de uma peça pintam regiões que não se tocam — topo e base —,
     * e as quatro peças são independentes entre si. Então subir o mesmo degrau
     * em tudo ao mesmo tempo e medir as oito caixas dá exatamente o mesmo
     * resultado que oito buscas separadas, com doze capturas em vez de 96.
     *
     * A primeira captura de cada par é sem texto (o fundo) e a segunda é com
     * texto (de onde sai a máscara dos glifos). Ver `contrasteNosGlifos`.
     */
    const medido = new Map();

    /*
     * MODO VERIFICAÇÃO (`--verificar`): mede a página COMO ESTÁ AUTORADA, sem
     * sobrescrever véu nenhum, e diz se cada bloco passa. É o modo que responde
     * "os valores em lib/content/process.ts continuam válidos nesta largura?" —
     * a busca responde outra pergunta, "qual valor seria preciso aqui?", e nunca
     * pode ser confundida com a primeira: ela mexe no que deveria estar medindo.
     */
    const DEGRAUS_EFETIVOS = argv.verificar === undefined ? DEGRAUS : [null];

    for (const v of DEGRAUS_EFETIVOS) {
      if (v !== null) await evaluate(veuGeral(v));

      await evaluate(texto(false));
      await sleep(220);
      const arqFundo = `${TMP}/veu-${String(v).replace('.', '')}-fundo.png`;
      writeFileSync(arqFundo, await screenshot());
      const fundo = decodePNG(arqFundo);

      await evaluate(texto(true));
      await sleep(220);
      const arqTexto = `${TMP}/veu-${String(v).replace('.', '')}-texto.png`;
      writeFileSync(arqTexto, await screenshot());
      const comTexto = decodePNG(arqTexto);

      for (const c of caixas) {
        for (const lado of ['topo', 'base']) {
          const chave = `${c.etapa}/${lado}`;
          const cor = lado === 'topo' ? TEXTO : MUTED;
          const { valor, glifos } = contrasteNosGlifos(fundo, comTexto, c[lado], cor);
          if (!medido.has(chave)) medido.set(chave, { etapa: c.etapa, lado, trilha: [], glifos });
          medido.get(chave).trilha.push({ v, cr: valor });
        }
      }
    }

    if (argv.verificar === undefined) await evaluate(veuGeral(0));

    const achados = [...medido.values()].map((m) => {
      const medida = m.trilha.filter((d) => d.cr !== null);
      const passa = medida.find((d) => d.cr >= ALVO);
      return {
        etapa: m.etapa,
        lado: m.lado,
        naoMedido: medida.length === 0,
        v: passa ? passa.v : null,
        cr: passa ? passa.cr : null,
        trilha: m.trilha.map((d) => `${d.v}:${d.cr === null ? 'n/d' : d.cr.toFixed(1)}`).join('  '),
      };
    });

    const ordem = ['topo', 'base'];
    achados.sort((a, b) => ordem.indexOf(a.lado) - ordem.indexOf(b.lado));

    if (argv.verificar !== undefined) {
      /*
       * O veredito e o resumo leem O MESMO número — `medido`, extraído da
       * trilha —, e não campos diferentes. A primeira versão filtrava os
       * reprovados por `a.cr`, que no modo verificação só existe quando algum
       * degrau passou: o relatório imprimia linha a linha "REPROVA" e fechava
       * com "OK, os oito blocos passam". Um resumo que contradiz as próprias
       * linhas é pior que nenhum resumo.
       */
      const lidos = achados.map((a) => ({
        ...a,
        medido: a.naoMedido ? null : Number(a.trilha.split(':')[1]),
      }));
      const reprovados = lidos.filter((a) => a.medido !== null && a.medido < ALVO);
      const semGlifo = lidos.filter((a) => a.naoMedido);
      console.log('  peça        lado    contraste   veredito');
      for (const a of lidos) {
        console.log(
          `  ${a.etapa.padEnd(10)}  ${a.lado.padEnd(5)}  ` +
            `${String(a.medido ?? '—').padStart(7)}   ` +
            (a.medido === null ? 'n/d — fora da dobra' : a.medido >= ALVO ? 'passa' : 'REPROVA'),
        );
      }
      console.log();
      if (reprovados.length) {
        console.log(
          `FALHOU — ${reprovados.length} bloco(s) abaixo de ${ALVO}:1: ` +
            `${reprovados.map((a) => a.etapa + '/' + a.lado).join(', ')}`,
        );
        process.exitCode = 1;
      } else {
        console.log(
          `OK — os oito blocos passam${semGlifo.length ? ` (${semGlifo.length} não medido(s))` : ''}.`,
        );
      }
      return;
    }

    console.log('  peça        lado    véu     contraste   busca (véu:contraste)');
    for (const a of achados) {
      console.log(
        `  ${a.etapa.padEnd(10)}  ${a.lado.padEnd(5)}  ` +
          `${a.naoMedido ? '   n/d' : a.v === null ? ' FALHA' : a.v.toFixed(2).padStart(5)}   ` +
          `${a.cr === null ? '   —  ' : a.cr.toFixed(2).padStart(6)}      ${a.trilha}`,
      );
    }

    const naoResolvidos = achados.filter((a) => a.v === null && !a.naoMedido);
    const naoMedidos = achados.filter((a) => a.naoMedido);

    console.log();
    console.log('  → para lib/content/process.ts:');
    console.log();
    for (const c of caixas) {
      const t = achados.find((a) => a.etapa === c.etapa && a.lado === 'topo');
      const b = achados.find((a) => a.etapa === c.etapa && a.lado === 'base');
      console.log(
        `      // ${c.etapa}: medido ${t?.cr?.toFixed(1) ?? '—'}:1 no topo, ` +
          `${b?.cr?.toFixed(1) ?? '—'}:1 na base`,
      );
      console.log(`      veuTopo: ${t?.v ?? '?'},`);
      console.log(`      veuBase: ${b?.v ?? '?'},`);
    }

    if (naoMedidos.length) {
      console.log();
      console.log(
        `n/d — ${naoMedidos.length} bloco(s) não tinham glifo na tela: ` +
          `${naoMedidos.map((a) => a.etapa + '/' + a.lado).join(', ')}.`,
      );
      console.log(
        'A peça estava fora da dobra. No empilhamento do celular só algumas cabem por vez — ' +
          'rode esta largura com a peça rolada para dentro da tela.',
      );
    }

    if (naoResolvidos.length) {
      console.log();
      console.log(
        `ATENÇÃO — ${naoResolvidos.length} bloco(s) não passam nem no véu máximo: ` +
          `${naoResolvidos.map((a) => a.etapa + '/' + a.lado).join(', ')}.`,
      );
      console.log(
        'Véu maior não é a resposta: mexa no ENQUADRAMENTO para pôr o texto sobre ' +
          'uma faixa mais escura da própria imagem.',
      );
    }
  },
  { port: Number(argv.port ?? 9603), browser: argv.browser, profile: '.shots/.chrome-veu' },
);
