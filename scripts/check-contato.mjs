/**
 * O aceite da Fase 10 (plano §18):
 *
 *   "`<details>` operável por teclado; símbolo reconstitui `( )` no scroll
 *    final; os cinco estados do formulário (idle/validating/submitting/success/
 *    error) são todos demonstráveis e capturados em screenshot;
 *    `ContactTransport` definido e implementado como no-op; grep no repositório
 *    não encontra nenhum e-mail, telefone ou domínio inventado."
 *
 * Cada uma vira uma medição, e três delas exigem cuidado:
 *
 * TECLADO não se prova lendo o HTML. `<details>` é operável por definição, mas
 * uma folha de estilo que troque o `<summary>` por outra coisa, ou um
 * `tabindex` errado, quebram isso sem quebrar a marcação. Aqui as teclas são
 * DISPARADAS pelo protocolo do navegador — Enter e Espaço, em cada uma das seis
 * perguntas — e o que se lê depois é o atributo `open` e a altura do painel.
 *
 * O TRANSPORTE é verificado pela rota: um POST válido tem de devolver o nome do
 * transporte em uso, e um POST inválido tem de ser recusado com erro POR CAMPO.
 * A segunda metade é o que garante que a validação do servidor existe de fato,
 * e não só a do navegador.
 *
 * A VARREDURA DE DADOS lê o disco, não a página. Ela procura FORMATOS — um
 * endereço de e-mail, um telefone brasileiro, um CNPJ —, não palavras: o rodapé
 * contém a palavra "CNPJ" como rótulo de um campo que só é emitido se existir,
 * e uma busca por palavra reprovaria justamente o código que faz a coisa certa.
 *
 *   node scripts/check-contato.mjs --url=http://localhost:3431
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { args, run, sleep } from './cdp.mjs';

const require = createRequire(import.meta.url);
const { decodePNG } = require('../tools/png.cjs');

const argv = args();
const url = (argv.url ?? 'http://localhost:3000').replace(/\/$/, '');
const W = Number(argv.w ?? 1672);
const H = Number(argv.h ?? 941);

/* ------------------------------------------------------------------ dados -- */

const PASTAS = ['app', 'components', 'lib', 'styles'];
const EXTENSOES = new Set(['.ts', '.tsx', '.css', '.mjs', '.js', '.json']);

/**
 * Formatos que denunciam dado institucional inventado.
 *
 * `mailto:` e `tel:` só entram quando seguidos de literal — no rodapé eles
 * aparecem como `mailto:${site.email}`, que é emissão condicional e é
 * exatamente o comportamento correto.
 */
const PROIBIDOS = [
  { nome: 'endereço de e-mail', re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { nome: 'telefone brasileiro', re: /\+55[\s\d]|\(\d{2}\)\s*\d{4,5}[- ]?\d{4}/ },
  { nome: 'CNPJ', re: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/ },
  { nome: 'domínio de exemplo', re: /example\.(com|org|net)|lorem ipsum/i },
  { nome: 'link de WhatsApp', re: /wa\.me\/|api\.whatsapp\.com/i },
  { nome: 'mailto/tel literal', re: /(mailto|tel):[\w+.]/i },
];

function varrer(dir, achados) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      varrer(caminho, achados);
      continue;
    }
    if (!EXTENSOES.has(extname(nome))) continue;
    const texto = readFileSync(caminho, 'utf8');
    for (const linha of texto.split(/\r?\n/)) {
      for (const p of PROIBIDOS) {
        const m = p.re.exec(linha);
        if (m) achados.push({ arquivo: caminho, tipo: p.nome, trecho: m[0] });
      }
    }
  }
  return achados;
}

/* ---------------------------------------------------------------- teclado -- */

const TECLAS = {
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
};

async function teclar(send, tecla) {
  const t = TECLAS[tecla];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...t });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: t.key, code: t.code });
}

/* ------------------------------------------------------------------ sonda -- */

/** Estado de uma pergunta: aberta? e o painel tem altura de verdade? */
const ESTADO_FAQ = (i) => `(() => {
  const d = document.querySelectorAll('#faq details')[${i}];
  const painel = d.querySelector(':scope > div');
  return { aberto: d.open, altura: Math.round(painel.getBoundingClientRect().height),
           focado: document.activeElement === d.querySelector('summary') };
})()`;

const SIMBOLO = `(() => {
  const r = (id) => document.getElementById(id).getBoundingClientRect();
  const o = (id) => +parseFloat(getComputedStyle(document.getElementById(id)).opacity).toFixed(3);
  const e = r('sym-left'), d = r('sym-right');
  return {
    lado: +e.width.toFixed(2),
    dx: +(d.left - e.left).toFixed(2),
    dy: +(d.top - e.top).toFixed(2),
    opEsq: o('sym-left'),
    opDir: o('sym-right'),
  };
})()`;

await run(
  async ({ evaluate, setViewport, navigate, send, screenshot }) => {
    const falhas = [];
    const ok = (cond, texto) => {
      console.log(`  ${cond ? '✓' : '✗'} ${texto}`);
      if (!cond) falhas.push(texto);
    };

    await setViewport(W, H);
    await navigate(`${url}/`, 2400);

    console.log(`${url}  ${W}x${H}\n`);

    /* --- 1. FAQ operável por teclado ------------------------------------- */
    console.log('FAQ — teclado');
    const total = await evaluate(`document.querySelectorAll('#faq details').length`);
    await evaluate(`document.getElementById('faq').scrollIntoView()`);
    await sleep(500);

    const focaveis = [];
    const abrem = [];
    const fecham = [];
    const alturas = [];
    for (let i = 0; i < total; i++) {
      await evaluate(`document.querySelectorAll('#faq summary')[${i}].focus()`);
      focaveis.push((await evaluate(ESTADO_FAQ(i))).focado);

      await teclar(send, i % 2 === 0 ? 'Enter' : 'Space');
      await sleep(420); // a abertura leva 260ms
      const aberto = await evaluate(ESTADO_FAQ(i));
      abrem.push(aberto.aberto);
      alturas.push(aberto.altura);

      await teclar(send, i % 2 === 0 ? 'Enter' : 'Space');
      await sleep(420);
      fecham.push(!(await evaluate(ESTADO_FAQ(i))).aberto);
    }

    ok(total === 6, `a lista tem seis perguntas (${total})`);
    ok(
      focaveis.every(Boolean),
      `os seis resumos recebem foco (${focaveis.filter(Boolean).length}/${total})`,
    );
    ok(
      abrem.every(Boolean),
      `Enter e Espaço ABREM cada uma delas (${abrem.filter(Boolean).length}/${total})`,
    );
    ok(fecham.every(Boolean), `e FECHAM (${fecham.filter(Boolean).length}/${total})`);
    ok(
      alturas.every((h) => h > 30),
      `o painel de resposta cresce de verdade ao abrir (alturas ${alturas.join(', ')}px)`,
    );

    /* --- 2. o símbolo reconstitui `( )` ---------------------------------- */
    console.log('\nSÍMBOLO — o fechamento do §9.7');
    const geo = await evaluate(`(() => {
      const s = document.getElementById('contato');
      return { topo: s.getBoundingClientRect().top + scrollY, curso: s.offsetHeight - innerHeight };
    })()`);

    const trilha = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      await evaluate(`(async () => { window.scrollTo(0, ${geo.topo} + ${geo.curso} * ${t});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
      await sleep(320);
      trilha.push({ t: +t.toFixed(2), ...(await evaluate(SIMBOLO)) });
    }

    console.log('     t     lado    separação (dx, dy)     opacidade');
    for (const l of trilha) {
      console.log(
        `   ${l.t.toFixed(2)}   ${l.lado.toFixed(1).padStart(6)}   ` +
          `${l.dx.toFixed(1).padStart(7)}, ${l.dy.toFixed(1).padStart(5)}      ` +
          `${l.opEsq.toFixed(2)} / ${l.opDir.toFixed(2)}`,
      );
    }

    const fim = trilha[trilha.length - 1];
    ok(
      Math.abs(fim.dx) < 1 && Math.abs(fim.dy) < 1,
      `as duas metades terminam CONCÊNTRICAS (desencaixe ${fim.dx}px, ${fim.dy}px)`,
    );
    ok(
      fim.opEsq > 0.99 && fim.opDir > 0.99,
      `e as duas terminam opacas (${fim.opEsq} / ${fim.opDir})`,
    );
    const separacaoInicial = Math.abs(trilha[0].dx);
    ok(
      separacaoInicial > 200,
      `a metade direita volta de longe: separação ${separacaoInicial.toFixed(0)}px no início da seção`,
    );
    /*
     * A ultrapassagem é medida SÓ DEPOIS de as metades se juntarem.
     *
     * A primeira versão pegava o maior lado da trilha inteira e reportava
     * 11,25% — mas isso é a descida de `ctaReturn` (0,89) até `ctaClosed`
     * (0,80), não a ultrapassagem. O encaixe é o que acontece depois que dx
     * zera: dali em diante a peça está montada e o único movimento é a escala
     * passando do ponto e voltando.
     */
    const juntas = trilha.filter((l) => Math.abs(l.dx) < 2);
    const pico = Math.max(...juntas.map((l) => l.lado));
    const excesso = (pico / fim.lado - 1) * 100;
    ok(
      excesso > 0.8 && excesso < 2.5,
      `há ultrapassagem no encaixe (§9.7: 1,5%) — depois de montadas, pico de ` +
        `${pico.toFixed(1)}px contra ${fim.lado.toFixed(1)} final, ${excesso.toFixed(2)}% acima`,
    );

    /* --- 3. os cinco estados do formulário -------------------------------- */
    console.log('\nFORMULÁRIO — os cinco estados');
    await navigate(`${url}/contato/estados`, 2000);
    const casos = await evaluate(`(() => [...document.querySelectorAll('[data-caso]')].map((s) => {
      const form = s.querySelector('form');
      const botao = s.querySelector('button');
      return {
        nome: s.dataset.caso,
        temForm: Boolean(form),
        botaoDesabilitado: botao ? botao.disabled : null,
        rotuloBotao: botao ? botao.textContent.trim() : null,
        status: (s.querySelector('[aria-live]')?.textContent ?? '').trim(),
        camposComErro: s.querySelectorAll('[data-erro]').length,
        descritos: [...s.querySelectorAll('[aria-describedby]')].every((c) =>
          document.getElementById(c.getAttribute('aria-describedby')) !== null),
        sucesso: Boolean(s.querySelector('[role="status"]')),
      };
    }))()`);

    for (const c of casos) {
      console.log(
        `   ${c.nome.padEnd(18)} botão ${String(c.rotuloBotao ?? '—').padEnd(9)} ` +
          `${c.botaoDesabilitado === null ? '     ' : c.botaoDesabilitado ? 'travado' : ' ativo '}  ` +
          `erros ${c.camposComErro}   status "${c.status}"`,
      );
    }

    const por = (n) => casos.find((c) => c.nome === n);
    ok(
      casos.length === 6,
      `a rota de diagnóstico traz os cinco estados, com os dois erros (${casos.length} casos)`,
    );
    ok(por('idle')?.botaoDesabilitado === false, 'idle: botão ativo, sem status e sem erro');
    ok(
      por('validating')?.botaoDesabilitado === true && por('validating')?.status.length > 0,
      `validating: campos travados e status anunciado ("${por('validating')?.status}")`,
    );
    ok(
      por('submitting')?.botaoDesabilitado === true &&
        por('submitting')?.rotuloBotao === 'Enviando',
      'submitting: botão travado e rotulado "Enviando"',
    );
    ok(
      (por('error — validação')?.camposComErro ?? 0) >= 2,
      `error de validação: erro por campo (${por('error — validação')?.camposComErro} campos marcados)`,
    );
    ok(
      (por('error — rede')?.camposComErro ?? 1) === 0 && por('error — rede')?.status.length > 0,
      'error de rede: nenhum campo marcado, mensagem no formulário',
    );
    ok(
      por('success')?.sucesso === true && !por('success')?.temForm,
      'success: substitui o formulário no lugar dele',
    );
    ok(
      casos.every((c) => c.descritos),
      'todo aria-describedby aponta para um elemento que existe',
    );

    /* --- 4. o transporte --------------------------------------------------- */
    console.log('\nTRANSPORTE');
    const valido = await evaluate(`fetch('${url}/api/contato', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste da Fase 10', email: 'teste' + String.fromCharCode(64) + 'exemplo.test',
        empresa: '', problema: 'Verificacao automatizada do aceite da fase 10, com texto suficiente.' }),
    }).then((r) => r.json().then((j) => ({ status: r.status, corpo: j })))`);
    const invalido = await evaluate(`fetch('${url}/api/contato', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nome: 'x', email: 'nao-e-email', problema: 'curto' }),
    }).then((r) => r.json().then((j) => ({ status: r.status, corpo: j })))`);

    console.log(`   válido   → ${valido.status} ${JSON.stringify(valido.corpo)}`);
    console.log(`   inválido → ${invalido.status} ${JSON.stringify(invalido.corpo)}`);

    ok(
      valido.status === 200 && valido.corpo.ok === true,
      'um envio válido é aceito pelo Route Handler',
    );
    ok(
      valido.corpo.transporte === 'no-op',
      `e quem responde é o transporte no-op, declarado ("${valido.corpo.transporte}")`,
    );
    ok(
      invalido.status === 422 && Object.keys(invalido.corpo.erros ?? {}).length >= 3,
      `a validação do SERVIDOR recusa campo a campo (${Object.keys(invalido.corpo.erros ?? {}).join(', ')})`,
    );

    /* --- 5. nenhum dado institucional inventado ---------------------------- */
    console.log('\nDADOS INSTITUCIONAIS');
    const achados = [];
    for (const pasta of PASTAS) varrer(pasta, achados);
    for (const a of achados) console.log(`   ✗ ${a.arquivo}: ${a.tipo} — "${a.trecho}"`);
    ok(
      achados.length === 0,
      `nenhum e-mail, telefone, CNPJ, domínio de exemplo ou link de WhatsApp em ${PASTAS.join('/')} ` +
        `(${achados.length} ocorrência(s))`,
    );

    const config = readFileSync('lib/config/site.ts', 'utf8');
    const nulos = ['url', 'legalName', 'taxId', 'email', 'phone', 'address'].filter((c) =>
      new RegExp(`${c}:\\s*null`).test(config),
    );
    ok(
      nulos.length === 6,
      `lib/config/site.ts segue com os seis campos institucionais em null (${nulos.join(', ')})`,
    );

    /* --- 6. o rodapé é VISÍVEL --------------------------------------------- */
    /*
     * Esta lei não está no §18. Ela existe porque a Fase 10 descobriu que o
     * rodapé nunca tinha sido pintado: `Environment` é uma camada `fixed` com
     * z-index 0, e na ordem de pintura do CSS um elemento posicionado com
     * z-index 0 vem DEPOIS do texto de blocos não posicionados. O rodapé era
     * bloco comum, e o wordmark e a linha legal ficavam por baixo da
     * ambientação — desde a Fase 2.
     *
     * Nenhuma verificação via: o HTML, a árvore de acessibilidade e o contraste
     * estavam todos corretos. Só medindo TINTA. É por isso que a lei mede
     * pixel, e não estilo computado.
     */
    console.log('\nRODAPÉ');
    await navigate(`${url}/`, 2400);
    await evaluate(`window.scrollTo(0, document.documentElement.scrollHeight)`);
    await sleep(1400);
    const caixaRodape = await evaluate(`(() => { const b = document.querySelector('footer')
      .getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
    mkdirSync('.shots/.tmp-contato', { recursive: true });
    const arq = '.shots/.tmp-contato/rodape.png';
    writeFileSync(arq, await screenshot());
    const img = decodePNG(arq);
    let acesos = 0;
    let total_px = 0;
    for (
      let y = Math.max(0, Math.floor(caixaRodape.y));
      y < Math.min(img.h, caixaRodape.y + caixaRodape.h);
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(caixaRodape.x));
        x < Math.min(img.w, caixaRodape.x + caixaRodape.w);
        x++
      ) {
        const i = (y * img.w + x) * 4;
        const lum = 0.2126 * img.rgba[i] + 0.7152 * img.rgba[i + 1] + 0.0722 * img.rgba[i + 2];
        total_px++;
        if (lum > 60) acesos++;
      }
    }
    console.log(
      `   caixa ${Math.round(caixaRodape.w)}x${Math.round(caixaRodape.h)} em y=${Math.round(caixaRodape.y)}   ` +
        `pixels com tinta: ${acesos} de ${total_px}`,
    );
    ok(
      acesos > 400,
      `o rodapé é de fato PINTADO — wordmark e linha legal aparecem (${acesos} pixels de tinta)`,
    );

    if (falhas.length) throw new Error(`${falhas.length} critério(s) da Fase 10 não verificado(s)`);
    console.log('\nOK — FAQ, fechamento do símbolo, formulário e transporte cumprem o §18.');
  },
  { port: Number(argv.port ?? 9498), profile: '.shots/.chrome-contato' },
);
