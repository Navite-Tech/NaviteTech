/**
 * Base compartilhada de Chrome DevTools Protocol.
 *
 * Sem dependências: o Node 22 já traz `fetch` e `WebSocket` globais. Todos os
 * harnesses de verificação (captura, vitals, continuidade do símbolo, qualidade
 * de scroll) falam com o mesmo Chrome por aqui, em vez de cada um repetir o
 * mesmo boilerplate de spawn, handshake e roteamento de mensagens.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Barras normais funcionam no Node em Windows e evitam escaping frágil.
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lê `--chave=valor` da linha de comando. `--flag` vira `'true'`. */
export function args() {
  return Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v = 'true'] = a.replace(/^--/, '').split('=');
      return [k, v];
    }),
  );
}

export function findBrowser(override) {
  const found = override ?? CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) throw new Error('Nenhum Chrome/Edge encontrado. Passe --browser=<caminho>.');
  return found;
}

/**
 * Sobe um Chrome dedicado e devolve uma sessão CDP conectada.
 *
 * O navegador NÃO roda headless de propósito: o `--user-data-dir` é absoluto
 * (obrigatório, senão o DevTools não sobe) e a janela fica fora da tela. Com a
 * janela oculta, `Page.captureScreenshot` trava, e é por isso que
 * `CalculateNativeWinOcclusion` precisa ficar desligado.
 */
export async function connect({
  port = 9412,
  profile = '.shots/.chrome-profile',
  browser,
  headless = false,
  uncapped = false,
} = {}) {
  const dir = resolve(profile);
  mkdirSync(dir, { recursive: true });

  /*
   * `headless: true` para MEDIR TEMPO.
   *
   * Com janela, o vsync efetivo varia entre execuções — a mesma página vazia
   * mediu 60Hz numa hora e 30Hz na seguinte, porque a janela fica fora da tela.
   * Isso torna qualquer comparação de fps uma medição do ambiente. Em headless o
   * relógio de quadros é virtual e estável.
   *
   * Captura de tela continua com janela: foi assim que o HEVC do higgsfield
   * decodificou, e é o caminho já validado para as comparações visuais.
   */
  const child = spawn(
    findBrowser(browser),
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${dir}`,
      '--no-first-run',
      '--no-default-browser-check',
      ...(headless
        ? ['--headless=new', '--hide-scrollbars=false']
        : ['--window-position=-3000,-3000']),
      /*
       * Sem vsync, o intervalo entre quadros deixa de ser o ritmo do display e
       * passa a ser o CUSTO REAL de produzir cada quadro. É a única forma de
       * comparar o custo de uma camada com o de outra neste ambiente, onde o
       * vsync efetivo variou entre 60Hz e 30Hz de uma execução para a seguinte.
       */
      ...(uncapped ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []),
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) wsUrl = page.webSocketDebuggerUrl;
    } catch {
      /* ainda subindo */
    }
    if (!wsUrl) await sleep(250);
  }
  if (!wsUrl) {
    child.kill();
    throw new Error('DevTools inacessível');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r));

  let msgId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method) {
      for (const fn of listeners.get(m.method) ?? []) fn(m.params);
      return;
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.rej(new Error(`${m.error.message} (${JSON.stringify(m.error.data ?? '')})`));
    else p.res(m.result);
  });

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };

  await send('Page.enable');
  await send('Runtime.enable');

  /** Avalia uma expressão na página e devolve o valor já desserializado. */
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(d.exception?.description ?? d.text);
    }
    return r.result.value;
  };

  const setViewport = (w, h, deviceScaleFactor = 1) =>
    send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: h,
      deviceScaleFactor,
      mobile: w < 900,
    });

  /** Navega e espera a página ficar utilizável (dois quadros após o load). */
  const navigate = async (url, settleMs = 1400) => {
    await send('Page.navigate', { url });
    await sleep(settleMs);
    await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  };

  /**
   * `opts` vai direto para o CDP. O uso que importa e `clip`, para recortar a
   * calha da barra de rolagem quando a captura precisa casar com uma referencia
   * que nao tem barra nenhuma.
   */
  const screenshot = async (opts = {}) => {
    const shot = await send('Page.captureScreenshot', { format: 'png', ...opts });
    return Buffer.from(shot.data, 'base64');
  };

  const close = () => {
    try {
      ws.close();
    } finally {
      child.kill();
    }
  };

  return { send, on, evaluate, setViewport, navigate, screenshot, close };
}

/** Envolve um main() garantindo que o Chrome morra mesmo em erro. */
export async function run(main, options) {
  const cdp = await connect(options);
  try {
    await main(cdp);
  } catch (e) {
    console.error('ERRO:', e.message);
    cdp.close();
    process.exit(1);
  }
  cdp.close();
  process.exit(0);
}
