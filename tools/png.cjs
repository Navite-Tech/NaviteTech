// Minimal PNG decoder (8-bit, non-interlaced, colour types 0/2/3/4/6) -> {w,h,rgba}
const fs = require('fs');
const zlib = require('zlib');

function decodePNG(path) {
  const buf = fs.readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8;
  let ihdr = null,
    idat = [],
    plte = null,
    trns = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (ihdr.depth !== 8) throw new Error('unsupported bit depth ' + ihdr.depth);
  if (ihdr.interlace !== 0) throw new Error('interlaced png unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  const bpp = channels;
  const { width: w, height: h } = ihdr;
  const stride = w * bpp;
  const out = Buffer.alloc(stride * h);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.slice(pos, pos + stride);
    pos += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      switch (filter) {
        case 0:
          break;
        case 1:
          v = (v + a) & 255;
          break;
        case 2:
          v = (v + b) & 255;
          break;
        case 3:
          v = (v + ((a + b) >> 1)) & 255;
          break;
        case 4: {
          const p = a + b - c,
            pa = Math.abs(p - a),
            pb = Math.abs(p - b),
            pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
          break;
        }
        default:
          throw new Error('bad filter ' + filter);
      }
      cur[i] = v;
    }
  }
  // expand to rgba
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r,
      g,
      b,
      a = 255;
    const s = i * bpp;
    if (ihdr.colorType === 0) {
      r = g = b = out[s];
    } else if (ihdr.colorType === 2) {
      r = out[s];
      g = out[s + 1];
      b = out[s + 2];
    } else if (ihdr.colorType === 3) {
      const p = out[s] * 3;
      r = plte[p];
      g = plte[p + 1];
      b = plte[p + 2];
      if (trns && out[s] < trns.length) a = trns[out[s]];
    } else if (ihdr.colorType === 4) {
      r = g = b = out[s];
      a = out[s + 1];
    } else {
      r = out[s];
      g = out[s + 1];
      b = out[s + 2];
      a = out[s + 3];
    }
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { w, h, rgba };
}

module.exports = { decodePNG };
