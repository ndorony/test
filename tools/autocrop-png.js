#!/usr/bin/env node
// autocrop-png.js - trim fully-transparent margins from an RGBA PNG.
// Companion to kenney-iso-render.html, which renders each model into a square
// frame; this crops the result down to the silhouette.
//
//   node autocrop-png.js <in.png> [out.png] [padding]
//
// Handles 8-bit RGBA non-interlaced PNGs (what headless Chromium screenshots
// produce). Re-encodes with filter 0 scanlines - simple, and these are tiny.
'use strict';
const fs = require('fs');
const zlib = require('zlib');

const CRC = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return buf => {
        let c = -1;
        for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        return (c ^ -1) >>> 0;
    };
})();

function readChunks(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
    const out = [];
    let p = 8;
    while (p < buf.length) {
        const len = buf.readUInt32BE(p);
        const type = buf.toString('ascii', p + 4, p + 8);
        out.push({ type, data: buf.slice(p + 8, p + 8 + len) });
        p += 12 + len;
    }
    return out;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(CRC(body));
    return Buffer.concat([len, body, crc]);
}

function decode(buf) {
    const chunks = readChunks(buf);
    const ihdr = chunks.find(c => c.type === 'IHDR').data;
    const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
    const depth = ihdr[8], color = ihdr[9], interlace = ihdr[12];
    if (depth !== 8 || color !== 6 || interlace !== 0) {
        throw new Error(`unsupported PNG (depth ${depth}, colorType ${color}, interlace ${interlace})`);
    }
    const raw = zlib.inflateSync(Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data)));
    const bpp = 4, stride = w * bpp;
    const px = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const filter = raw[y * (stride + 1)];
        const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? px[y * stride + x - bpp] : 0;      // left
            const b = y > 0 ? px[(y - 1) * stride + x] : 0;         // up
            const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;  // up-left
            let v = line[x];
            if (filter === 1) v += a;
            else if (filter === 2) v += b;
            else if (filter === 3) v += (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            } else if (filter !== 0) throw new Error('bad filter ' + filter);
            px[y * stride + x] = v & 0xff;
        }
    }
    return { w, h, px };
}

function encode(w, h, px) {
    const stride = w * 4;
    const raw = Buffer.alloc(h * (stride + 1));
    for (let y = 0; y < h; y++) {
        raw[y * (stride + 1)] = 0;
        px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

const [input, output = input, padArg = '0'] = process.argv.slice(2);
if (!input) { console.error('usage: node autocrop-png.js <in.png> [out.png] [padding]'); process.exit(2); }
const pad = +padArg;

const { w, h, px } = decode(fs.readFileSync(input));
let x0 = w, y0 = h, x1 = -1, y1 = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] === 0) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
}
if (x1 < 0) { console.error('fully transparent, nothing to crop'); process.exit(1); }
x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);

const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
const out = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) px.copy(out, y * cw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4);
fs.writeFileSync(output, encode(cw, ch, out));
console.log(`${input}: ${w}x${h} -> ${cw}x${ch}`);
