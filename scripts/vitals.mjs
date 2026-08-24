/**
 * Mede Core Web Vitals reais numa página servida, via CDP. Sem dependências.
 *
 *   node scripts/vitals.mjs --url=http://localhost:3000
 *   node scripts/vitals.mjs --url=http://localhost:3000/tokens --w=390x844
 *
 * CLS é o critério de aceite da Fase 2 (fonte self-hosted com size-adjust deve
 * dar zero). LCP e INP entram de verdade na Fase 13, com CPU/rede emuladas.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const url = argv.url ?? 'http://localhost:3000';
const [vw, vh] = (argv.w ?? '1440x900').split('x').map(Number);
const cpuThrottle = Number(argv.cpu ?? 1);
const port = Number(argv.port ?? 9414);
// Chrome exige caminho absoluto em --user-data-dir
const profile = resolve(join('.shots', '.chrome-vitals'));
mkdirSync(profile, { recursive: true });

const browser = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!browser) {
  console.error('Nenhum Chrome/Edge encontrado.');
  process.exit(1);
}

const child = spawn(
  browser,
  [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-position=-3000,-3000',
    `--window-size=${vw},${vh}`,
    '--disable-features=CalculateNativeWinOcclusion',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let msgId = 0;
const pending = new Map();

async function wsEndpoint() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* ainda subindo */
    }
    await sleep(250);
  }
  throw new Error('DevTools inacessível');
}

/**
 * Coletor injetado ANTES de qualquer script da página, para não perder as
 * primeiras entradas de layout-shift.
 */
const COLLECTOR = `
window.__vitals = { cls: 0, shifts: [], lcp: 0 };
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (e.hadRecentInput) continue;
    window.__vitals.cls += e.value;
    if (e.value > 0.0005) {
      window.__vitals.shifts.push({
        value: Number(e.value.toFixed(5)),
        nodes: e.sources.map((s) => (s.node ? (s.node.nodeName || '') + (s.node.className ? '.' + String(s.node.className).split(' ')[0] : '') : '?')),
      });
    }
  }
}).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) window.__vitals.fcp = e.startTime;
}).observe({ type: 'paint', buffered: true });
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    window.__vitals.lcp = e.startTime;
    // Qual elemento, e nao so quando: um LCP alto sem saber o culpado nao
    // aponta para lugar nenhum.
    (window.__vitals.lcpTodos ||= []).push(
      Math.round(e.startTime) + 'ms ' + Math.round(e.size) + 'px2 ' +
      (e.element ? e.element.tagName + '.' + String(e.element.className).split(' ')[0] : '?')
    );
    window.__vitals.lcpAlvo = e.element
      ? e.element.tagName + ' .' + String(e.element.className).split(' ')[0] +
        ' "' + (e.element.textContent || '').trim().slice(0, 34) + '"'
      : null;
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
`;

(async () => {
  const ws = new WebSocket(await wsEndpoint());
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    const p = m.id && pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.rej(new Error(JSON.stringify(m.error)));
    else p.res(m.result);
  });
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: vw,
    height: vh,
    deviceScaleFactor: 1,
    mobile: vw < 900,
  });
  if (cpuThrottle > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECTOR });

  await send('Page.navigate', { url });
  await sleep(3500);
  // rola um pouco e volta: mudanças tardias de layout também contam
  await send('Runtime.evaluate', {
    expression: 'window.scrollTo(0, innerHeight); ',
  });
  await sleep(1200);
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 0);' });
  await sleep(800);

  const { result } = await send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__vitals)',
    returnByValue: true,
  });
  const v = JSON.parse(result.value);

  console.log(`\n${url}  @ ${vw}x${vh}${cpuThrottle > 1 ? `  cpu ${cpuThrottle}x` : ''}`);
  console.log(`  CLS: ${v.cls.toFixed(4)}   (meta < 0,02)`);
  console.log(`  LCP: ${(v.lcp / 1000).toFixed(2)}s  (local, sem emulação de rede)`);
  if (v.fcp !== undefined) console.log(`  FCP: ${(v.fcp / 1000).toFixed(2)}s`);
  if (v.lcpAlvo) console.log(`       alvo: ${v.lcpAlvo}`);
  if (v.lcpTodos) for (const e of v.lcpTodos) console.log(`       · ${e}`);
  if (v.shifts.length) {
    console.log('  deslocamentos observados:');
    for (const s of v.shifts) console.log(`    ${s.value}  ${s.nodes.join(', ')}`);
  } else {
    console.log('  nenhum deslocamento de layout registrado');
  }

  ws.close();
  child.kill();
  process.exit(v.cls < 0.02 ? 0 : 1);
})().catch((e) => {
  console.error('ERRO:', e.message);
  child.kill();
  process.exit(1);
});
