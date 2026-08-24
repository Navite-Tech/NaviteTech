/**
 * FIDELIDADE DAS ARTES DO MÉTODO — arquivo original × resultado renderizado.
 *
 * A Fase 16 tinha um critério de aceite que nenhum instrumento sabia medir:
 * "preserve cores, textura, contraste, composição e aparência original". O
 * `check:processo` só sabe dizer que a imagem não é um retângulo chapado
 * (desvio de luminância > 6), e isso passa com folga numa imagem que perdeu
 * metade da textura para o encoder.
 *
 * Este script fecha esse buraco, e faz duas coisas separadas:
 *
 *   MEDE   os bytes que o navegador de fato baixou, contra o JPEG de origem
 *          reamostrado para a mesma largura. Isso é guardrail automático.
 *   MOSTRA o recorte da tela ao lado do original, a 1:1 e ampliado 4x, em
 *          `.shots/fidelidade/`. Isso é o aceite.
 *
 * As duas metades medem coisas diferentes de propósito, e a razão está mais
 * abaixo.
 *
 * MORA EM `scripts/` E NÃO EM `tools/`, ao contrário do que o plano dizia, e a
 * razão é a convenção que já existe aqui: `tools/` são puros e offline
 * (`png.cjs`, `build-*.cjs`), `scripts/` são os que abrem um navegador. Este
 * precisa de um, então mora com os iguais.
 *
 * A BANDA COMPARADA É A FAIXA SEM VÉU, e ela é mais estreita do que parece.
 *
 * A primeira versão comparava "entre os dois blocos de texto", o que soa certo
 * e está errado: os véus são MAIORES que as caixas de texto — `::before` cobre
 * 36% da peça e `::after` 42% (components/process/process.module.css) —, então
 * a faixa entre os textos ainda cai em cima de gradiente. O resultado foi um
 * desvio de cor de 28,5 na 03, que é a peça de véu mais forte: o instrumento
 * estava acusando de "tratamento de imagem" exatamente o véu que ele mesmo
 * deveria ignorar.
 *
 * A faixa boa é a que fica ENTRE os dois pseudo-elementos, e as alturas deles
 * são lidas do DOM em vez de escritas aqui — assim ela acompanha a folha de
 * estilo em vez de precisar ser atualizada junto.
 *
 * O NÚMERO MEDE OS BYTES SERVIDOS, NÃO A CAPTURA — e essa foi a segunda
 * correção do instrumento.
 *
 * A primeira versão comparava o RECORTE DA TELA contra o original. Media, com
 * isso, duas coisas somadas: o que o nosso pipeline perde, e o que o
 * redimensionamento do próprio Chrome perde ao pintar uma variante de 384px
 * numa caixa de 296. A segunda parcela é grande e não é nossa: medido, o
 * pipeline entrega 0,93 do ideal e a tela mostrava 0,67.
 *
 * Um guardrail que soma o ruído do navegador ao sinal do pipeline não separa
 * regressão de filtro de tela — e o número que sobra é fraco justamente onde
 * precisaria ser forte: com a captura, um retrocesso de quality 92 para 78
 * mexeria o número de 0,64 para 0,53, o que não dá para distinguir de variação
 * de amostragem.
 *
 * Então o script BAIXA a variante que o navegador de fato pediu — a mesma URL de
 * `currentSrc`, com o mesmo `Accept`, portanto os mesmos bytes AVIF — e compara
 * com o original reamostrado para aquela largura. A cadeia medida passa a ser
 * exatamente a nossa, e nada além dela. A/B offline das duas cadeias:
 *
 *   arte        Fase 15   Fase 16
 *   entender      0,62      0,93
 *   definir       0,53      0,90
 *   construir     0,83      0,98
 *   evoluir       0,68      0,99
 *
 * O par lado a lado continua saindo da CAPTURA, porque é a tela que o olho
 * julga. Medir uma coisa e olhar outra é deliberado: o número responde "o
 * pipeline está íntegro?" e a imagem responde "está bonito?".
 *
 * OS LIMIARES SÃO GUARDRAIL, NÃO O ACEITE. Eles pegam regressão automática —
 * alguém baixar `quality`, alguém reintroduzir tratamento de cor — e nada mais.
 * Quem decide é o par lado a lado gravado em `.shots/fidelidade/`: se houver
 * perda perceptível de nitidez ou textura a olho com os três números passando,
 * a resposta é investigar de novo, não recalibrar o limiar. Se a medição
 * discordar do olho, quem está errada é a medição.
 *
 * POR QUE A RAZÃO NÃO CHEGA A 1,00 nem num pipeline perfeito: o lado de
 * referência é reamostrado com lanczos3 e não passa por encoder nenhum. AVIF
 * q72 sobre um JPEG que já é lossy sempre perde alguma coisa. 0,90 a 0,99 é o
 * estado saudável medido; o limiar fica em 0,85, com folga para variação de
 * encoder entre versões do sharp e apertado o bastante para que uma queda de
 * qualidade — que leva a razão para a casa dos 0,6 — reprove na hora.
 *
 *   node scripts/compare-processo.mjs --url=http://localhost:3431
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');
const { encodePNG } = require('../tools/png-write.cjs');

const argv = args();
const url = argv.url ?? 'http://localhost:3000';
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);
/** Fração do curso em que a composição está em repouso: as quatro postas, nada se movendo. */
const REPOUSO = Number(argv.t ?? 0.85);
const SAIDA = '.shots/fidelidade';
const ORIGENS = 'references/doProblemaAoFuncionaSection';

/** Limiares — guardrail. Ver o cabeçalho. */
const MIN_ENERGIA = Number(argv.energia ?? 0.85);
const MAX_DESVIO = Number(argv.desvio ?? 3);

/**
 * A caixa de cada peça, a banda sem texto, e o que a imagem de fato é.
 *
 * `naturalWidth/Height` vêm do `<img>` decodificado — não do arquivo em disco —
 * porque é contra a origem REAL que o `object-fit` resolve. `currentSrc` diz
 * qual variante o navegador escolheu do `srcset`, que é a informação que
 * explica metade dos defeitos de nitidez.
 */
const SONDA = `(() => {
  const r = (el) => el.getBoundingClientRect();
  return [...document.querySelectorAll('[data-no]')].map((peca) => {
    const caixa = r(peca);
    const img = peca.querySelector('img');
    const cs = getComputedStyle(img);
    /*
     * A faixa SEM VÉU é a que fica ENTRE os dois blocos de texto, porque o véu
     * agora É o fundo deles (components/process/process.module.css). Enquanto
     * ele era pseudo-elemento da peça com altura em porcentagem, esta conta
     * precisava ler a altura dos pseudos; com o véu preso ao texto, a caixa do
     * texto e a do véu são a mesma coisa.
     *
     * Sem crase nenhuma neste comentário, de propósito: ele vive DENTRO de um
     * template literal, e uma crase aqui fecha a sonda no meio.
     */
    const topo = peca.querySelector('[class*="dadosTopo"]');
    const desc = peca.querySelector('[data-descricao]');
    const hAntes = topo ? r(topo).bottom - caixa.top : 0;
    const hDepois = desc ? caixa.bottom - r(desc).top : 0;
    return {
      i: +peca.dataset.no,
      etapa: peca.dataset.etapa,
      caixa: { x: caixa.left, y: caixa.top, w: caixa.width, h: caixa.height },
      banda: { de: hAntes, ate: caixa.height - hDepois },
      objectPosition: cs.objectPosition,
      objectFit: cs.objectFit,
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      servido: img.currentSrc || img.src,
      completa: img.complete && img.naturalWidth > 0,
    };
  });
})()`;

/** "50% 42%" → { px: 0.5, py: 0.42 }. Aceita px também, que é o que o navegador resolve. */
function posicao(valor, caixa, render) {
  const [a, b] = String(valor).trim().split(/\s+/);
  const eixo = (v, livre) => {
    if (v.endsWith('%')) return parseFloat(v) / 100;
    if (v.endsWith('px')) return livre === 0 ? 0 : parseFloat(v) / livre;
    return 0.5;
  };
  return {
    px: eixo(a ?? '50%', caixa.w - render.w),
    py: eixo(b ?? a ?? '50%', caixa.h - render.h),
  };
}

/** Recorta um retângulo da captura e devolve RGB puro. */
function recortar(img, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * img.w + (x0 + x)) * 4;
      const d = (y * w + x) * 3;
      out[d] = img.rgba[s];
      out[d + 1] = img.rgba[s + 1];
      out[d + 2] = img.rgba[s + 2];
    }
  }
  return out;
}

/**
 * Variância do laplaciano — a medida clássica de "quanto detalhe fino existe".
 *
 * Compressão agressiva alisa: as bordas finas e o grão viram gradiente suave, e
 * a variância do laplaciano cai. É exatamente o eixo em que AVIF q58 estraga
 * estas artes, então é o eixo em que se mede.
 */
function energia(rgb, w, h) {
  const cinza = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    cinza[i] = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];
  }
  let soma = 0;
  let soma2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * cinza[i] - cinza[i - 1] - cinza[i + 1] - cinza[i - w] - cinza[i + w];
      soma += l;
      soma2 += l * l;
      n++;
    }
  }
  if (!n) return 0;
  const m = soma / n;
  return soma2 / n - m * m;
}

/** Média por canal, para provar que ninguém recoloriu. */
function medias(rgb, w, h) {
  const s = [0, 0, 0];
  const n = w * h;
  for (let i = 0; i < n; i++) {
    s[0] += rgb[i * 3];
    s[1] += rgb[i * 3 + 1];
    s[2] += rgb[i * 3 + 2];
  }
  return s.map((v) => v / n);
}

/** Erro absoluto médio entre duas bandas do mesmo tamanho. */
function erro(a, b, w, h) {
  let s = 0;
  const n = w * h * 3;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s / n;
}

/**
 * Ampliação por vizinho-mais-próximo, sem interpolação.
 *
 * O par a 1:1 tem 296px de largura por peça, e a 1:1 duas imagens quase iguais
 * parecem exatamente iguais — foi o que a primeira execução mostrou. Perda de
 * nitidez e artefato de compressão vivem na escala do pixel, então o olho
 * precisa da escala do pixel. Vizinho-mais-próximo de propósito: qualquer
 * filtro suavizaria justamente o que se quer inspecionar.
 */
function ampliar(rgb, w, h, fator) {
  const W2 = w * fator;
  const H2 = h * fator;
  const out = Buffer.alloc(W2 * H2 * 3);
  for (let y = 0; y < H2; y++) {
    const sy = Math.floor(y / fator);
    for (let x = 0; x < W2; x++) {
      const sx = Math.floor(x / fator);
      const s = (sy * w + sx) * 3;
      const d = (y * W2 + x) * 3;
      out[d] = rgb[s];
      out[d + 1] = rgb[s + 1];
      out[d + 2] = rgb[s + 2];
    }
  }
  return out;
}

/** Recorta uma janela de um buffer RGB. */
function janelaRGB(rgb, w, x0, y0, jw, jh) {
  const out = Buffer.alloc(jw * jh * 3);
  for (let y = 0; y < jh; y++) {
    for (let x = 0; x < jw; x++) {
      const s = ((y0 + y) * w + (x0 + x)) * 3;
      const d = (y * jw + x) * 3;
      out[d] = rgb[s];
      out[d + 1] = rgb[s + 1];
      out[d + 2] = rgb[s + 2];
    }
  }
  return out;
}

/** Grava original | renderizado lado a lado, com um fio entre os dois. */
function parLadoALado(arquivo, esq, dir, w, h) {
  const fio = 2;
  const larg = w * 2 + fio;
  const out = Buffer.alloc(larg * h * 3, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 3;
      const a = (y * larg + x) * 3;
      const b = (y * larg + (x + w + fio)) * 3;
      out[a] = esq[s];
      out[a + 1] = esq[s + 1];
      out[a + 2] = esq[s + 2];
      out[b] = dir[s];
      out[b + 1] = dir[s + 1];
      out[b + 2] = dir[s + 2];
    }
  }
  writeFileSync(arquivo, encodePNG(larg, h, out));
}

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    mkdirSync(SAIDA, { recursive: true });

    // A calha da barra encolhe a área útil, e é contra ela que todo vw se
    // resolve. Mesma correção de check-processo.mjs.
    await setViewport(W, H);
    await navigate(url, 1200);
    const calha = await evaluate('innerWidth - document.documentElement.clientWidth');
    await setViewport(W + calha, H);
    await navigate(url, 2200);

    const geo = await evaluate(`(() => {
      const s = document.getElementById('processo');
      return { topo: s.getBoundingClientRect().top + scrollY, curso: s.offsetHeight - innerHeight };
    })()`);

    await evaluate(`(async () => {
      window.scrollTo(0, ${geo.topo + geo.curso * REPOUSO});
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    await sleep(1400);

    const pecas = await evaluate(SONDA);
    const arquivo = `${SAIDA}/.captura.png`;
    writeFileSync(arquivo, await screenshot());
    const captura = decodePNG(arquivo);

    console.log(
      `${url}  ${W}x${H}  ·  repouso em t=${REPOUSO}  ·  captura ${captura.w}x${captura.h}\n`,
    );

    const falhas = [];
    const linhas = [];

    for (const p of pecas) {
      if (!p.completa) {
        falhas.push(`a arte da peça 0${p.i + 1} não carregou`);
        continue;
      }

      const caixa = {
        x: Math.round(p.caixa.x),
        y: Math.round(p.caixa.y),
        w: Math.round(p.caixa.w),
        h: Math.round(p.caixa.h),
      };

      /* object-fit: cover — a escala que faz a origem cobrir a caixa inteira */
      const escala = Math.max(caixa.w / p.natural.w, caixa.h / p.natural.h);
      const render = { w: p.natural.w * escala, h: p.natural.h * escala };
      const { px, py } = posicao(p.objectPosition, caixa, render);

      /*
       * A janela é calculada em FRAÇÕES e só depois convertida para os pixels do
       * arquivo de origem — e essa distinção era um defeito real na primeira
       * versão.
       *
       * `naturalWidth` é a largura da VARIANTE que o navegador escolheu do
       * srcset (384px aqui), não a do arquivo em `references/`, que tem 736. A
       * primeira versão computava a janela em coordenadas de 384 e a entregava
       * ao `sharp`, que a aplicava sobre 736: recortava metade da imagem errada,
       * e as razões de energia saíam absurdas — 27,9 numa peça, que é o
       * instrumento dizendo que a página tem 27 vezes mais detalhe que o
       * original.
       */
      const meta = await sharp(path.join(ORIGENS, `${p.etapa}Reference.jpg`)).metadata();
      const fx = meta.width / p.natural.w;
      const fy = meta.height / p.natural.h;
      const janela = {
        left: Math.max(0, Math.round((-(caixa.w - render.w) * px * fx) / escala)),
        top: Math.max(0, Math.round((-(caixa.h - render.h) * py * fy) / escala)),
        width: Math.min(meta.width, Math.round((caixa.w * fx) / escala)),
        height: Math.min(meta.height, Math.round((caixa.h * fy) / escala)),
      };
      janela.width = Math.min(janela.width, meta.width - janela.left);
      janela.height = Math.min(janela.height, meta.height - janela.top);

      /* a banda sem texto, em pixels da caixa */
      const de = Math.max(0, Math.round(p.banda.de) + 6);
      const ate = Math.min(caixa.h, Math.round(p.banda.ate) - 6);
      const bh = ate - de;
      if (bh < 24) {
        falhas.push(`a banda de arte pura da peça 0${p.i + 1} tem ${bh}px — texto demais por cima`);
        continue;
      }

      /* IDEAL: o JPEG de origem sob o mesmo cover, reamostrado para a mesma caixa */
      const ideal = await sharp(path.join(ORIGENS, `${p.etapa}Reference.jpg`))
        .extract(janela)
        .resize(caixa.w, caixa.h, { kernel: 'lanczos3' })
        .extract({ left: 0, top: de, width: caixa.w, height: bh })
        .removeAlpha()
        .raw()
        .toBuffer();

      /* RENDERIZADO: a mesma banda, recortada da captura */
      const feito = recortar(captura, caixa.x, caixa.y + de, caixa.w, bh);

      /*
       * O NÚMERO sai dos BYTES SERVIDOS, não da captura. Baixa-se a mesma URL
       * que o navegador resolveu, com o mesmo `Accept` — logo, os mesmos bytes
       * AVIF —, e compara-se com o original reamostrado para aquela largura. A
       * cadeia medida passa a ser exatamente a nossa, sem o redimensionamento
       * que o Chrome faz depois para pintar. Ver o cabeçalho.
       */
      const resp = await fetch(new URL(p.servido, url), {
        headers: { accept: 'image/avif,image/webp,image/apng,*/*' },
      });
      if (!resp.ok) {
        falhas.push(`0${p.i + 1} ${p.etapa}: a variante servida respondeu ${resp.status}`);
        continue;
      }
      const servido = await sharp(Buffer.from(await resp.arrayBuffer()))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const lw = servido.info.width;
      const lh = servido.info.height;

      const referencia = await sharp(path.join(ORIGENS, `${p.etapa}Reference.jpg`))
        .resize(lw, lh, { kernel: 'lanczos3' })
        .removeAlpha()
        .raw()
        .toBuffer();

      const eIdeal = energia(referencia, lw, lh);
      const eFeito = energia(servido.data, lw, lh);
      /*
       * Numa arte MUITO lisa as duas energias ficam próximas de zero e a razão
       * entre elas vira ruído dividido por ruído. Abaixo de 4 de variância do
       * laplaciano não há detalhe fino a perder, então a razão não vale como
       * lei: sai `—`, e o par lado a lado decide.
       */
      const razao = eIdeal >= 4 ? eFeito / eIdeal : null;

      const mIdeal = medias(referencia, lw, lh);
      const mFeito = medias(servido.data, lw, lh);
      const desvio = Math.max(...mIdeal.map((v, k) => Math.abs(v - mFeito[k])));

      const mae = erro(referencia, servido.data, lw, lh);

      parLadoALado(`${SAIDA}/${p.etapa}.png`, ideal, feito, caixa.w, bh);

      /*
       * E o mesmo par AMPLIADO 4x numa janela central de 150x70. É este arquivo
       * que decide a aceitação — o de 1:1 serve para ver a composição, este para
       * ver o pixel.
       */
      const jw = Math.min(150, caixa.w);
      const jh = Math.min(70, bh);
      const jx = Math.round((caixa.w - jw) / 2);
      const jy = Math.round((bh - jh) / 2);
      parLadoALado(
        `${SAIDA}/${p.etapa}-zoom.png`,
        ampliar(janelaRGB(ideal, caixa.w, jx, jy, jw, jh), jw, jh, 4),
        ampliar(janelaRGB(feito, caixa.w, jx, jy, jw, jh), jw, jh, 4),
        jw * 4,
        jh * 4,
      );

      linhas.push({
        etapa: p.etapa,
        caixa,
        servidoPx: `${lw}x${lh}`,
        banda: bh,
        razao,
        desvio,
        mae,
      });

      if (razao !== null && razao < MIN_ENERGIA) {
        falhas.push(
          `0${p.i + 1} ${p.etapa}: energia de detalhe ${razao.toFixed(2)} do original ` +
            `(mínimo ${MIN_ENERGIA})`,
        );
      }
      if (desvio > MAX_DESVIO) {
        falhas.push(
          `0${p.i + 1} ${p.etapa}: desvio de cor ${desvio.toFixed(1)} por canal ` +
            `(máximo ${MAX_DESVIO}) — alguém tratou a imagem`,
        );
      }
    }

    console.log('  peça        caixa na tela   bytes servidos   energia   ΔRGB    MAE');
    for (const l of linhas) {
      console.log(
        `  ${l.etapa.padEnd(10)} ${String(l.caixa.w + 'x' + l.caixa.h).padEnd(14)}  ` +
          `${String(l.servidoPx).padEnd(14)}  ` +
          `${(l.razao === null ? '—' : l.razao.toFixed(2)).padStart(6)}  ` +
          `${l.desvio.toFixed(1).padStart(5)}  ${l.mae.toFixed(1).padStart(5)}`,
      );
    }

    console.log(`\n  pares original | renderizado em ${SAIDA}/ — ESTE é o aceite`);

    console.log(
      falhas.length
        ? `\nFALHOU — ${falhas.length} guardrail(s):\n${falhas.map((f) => `  · ${f}`).join('\n')}`
        : '\nGUARDRAILS OK — nitidez e cor dentro do esperado. Confira os pares antes de aprovar.',
    );
    if (falhas.length) throw new Error('a fidelidade das artes não cumpre o guardrail');
  },
  { port: Number(argv.port ?? 9497), browser: argv.browser, profile: '.shots/.chrome-fidelidade' },
);
