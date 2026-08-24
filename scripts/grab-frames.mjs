/**
 * Extrai frames dos vídeos de referência de movimento.
 *
 * Sem ffmpeg e sem dependências: sobe um servidor HTTP mínimo sobre o repositório,
 * abre o vídeo num Chrome real via CDP e captura a tela em cada instante pedido.
 * Chrome é o único decodificador confiável aqui — o Media Foundation do Windows
 * recusa o HEVC Main10 do higgsfield (MF_E_TOPO_CODEC_NOT_FOUND).
 *
 * `references/` NUNCA é modificado; o servidor só lê.
 *
 *   node scripts/grab-frames.mjs --video=references/flow-symbol-transition.mp4 --n=25
 *   node scripts/grab-frames.mjs --video=references/higgsfield-services-motion.mp4 --times=0,1,2,3
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { args, run, sleep } from './cdp.mjs';

const argv = args();
const video = argv.video ?? 'references/flow-symbol-transition.mp4';
if (!existsSync(video)) {
  console.error(`vídeo não encontrado: ${video}`);
  process.exit(1);
}
const outDir = resolve(argv.out ?? join('.shots/ref', video.replace(/.*[/\\]|\.\w+$/g, '')));
mkdirSync(outDir, { recursive: true });
const port = Number(argv.serve ?? 8731);

const MIME = { '.mp4': 'video/mp4', '.html': 'text/html; charset=utf-8' };
const root = resolve('.');

const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000;overflow:hidden}
video{display:block;width:100vw;height:100vh;object-fit:contain}</style>
<video id="v" src="/${video.replace(/\\/g, '/')}" muted playsinline preload="auto"></video>`;

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(page);
    return;
  }
  // Só leitura, e só dentro do repositório.
  const file = resolve(root, decodeURIComponent(req.url.slice(1)));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  // `Accept-Ranges` importa: sem ele o Chrome não consegue buscar no vídeo.
  const size = statSync(file).size;
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = Number(range[1] || 0);
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, {
      'content-type': type,
      'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`,
      'content-length': end - start + 1,
    });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
    createReadStream(file).pipe(res);
  }
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));

await run(
  async ({ evaluate, setViewport, navigate, screenshot }) => {
    await setViewport(1280, 720);
    await navigate(`http://127.0.0.1:${port}/`, 600);

    const meta = await evaluate(`(async () => {
      const v = document.getElementById('v');
      if (v.readyState < 1) await new Promise((r, j) => {
        v.addEventListener('loadedmetadata', r, { once: true });
        v.addEventListener('error', () => j(new Error('falha ao decodificar o vídeo')), { once: true });
        setTimeout(() => j(new Error('timeout carregando metadados')), 15000);
      });
      return { w: v.videoWidth, h: v.videoHeight, dur: v.duration };
    })()`);

    if (!meta.w) throw new Error('videoWidth 0 — o Chrome não decodificou este arquivo');
    console.log(`${video}  ${meta.w}x${meta.h}  ${meta.dur.toFixed(2)}s`);

    // Captura 1:1 com o vídeo: viewport do tamanho nativo, sem letterbox.
    await setViewport(meta.w, meta.h);
    await sleep(200);

    const times = argv.times
      ? argv.times.split(',').map(Number)
      : Array.from({ length: Number(argv.n ?? 25) }, (_, i) =>
          Number(((i * meta.dur) / (Number(argv.n ?? 25) - 1)).toFixed(3)),
        ).map((t) => Math.min(t, meta.dur - 0.02));

    const hashes = new Map();
    for (const t of times) {
      const got = await evaluate(`(async () => {
        const v = document.getElementById('v');
        v.currentTime = ${t};
        await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
        // dois quadros para o compositor apresentar o frame já decodificado
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return v.currentTime;
      })()`);

      const png = await screenshot();
      const name = `t${String(t.toFixed(2)).replace('.', '_')}.png`;
      writeFileSync(join(outDir, name), png);

      // Assinatura barata só para detectar seek que não saiu do lugar.
      let sig = 0;
      for (let i = 0; i < png.length; i += 997) sig = (sig * 31 + png[i]) >>> 0;
      const dup = hashes.get(sig);
      hashes.set(sig, name);
      console.log(
        `  ${name}  currentTime ${got.toFixed(3)}${dup ? `   ** idêntico a ${dup} **` : ''}`,
      );
    }

    const unique = hashes.size;
    console.log(`\n${times.length} frames em ${outDir} — ${unique} distintos`);
    if (unique < times.length * 0.8) {
      console.log(
        'ATENÇÃO: muitos frames repetidos. O vídeo pode ter um único keyframe;\n' +
          'nesse caso o seek encosta sempre no mesmo lugar e é preciso tocar e capturar.',
      );
    }
  },
  { port: Number(argv.port ?? 9416), profile: '.shots/.chrome-frames' },
);

server.close();
