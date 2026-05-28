#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const outDir = path.join(process.cwd(), "assets");
const outPath = path.join(outDir, "icon.ico");
const pngPath = path.join(outDir, "icon.png");
fs.mkdirSync(outDir, { recursive: true });

const size = 256;
const dibHeaderSize = 40;
const pixelBytes = size * size * 4;
const maskBytes = (Math.ceil(size / 32) * 4) * size;
const imageSize = dibHeaderSize + pixelBytes + maskBytes;
const icoSize = 6 + 16 + imageSize;
const buffer = Buffer.alloc(icoSize);

let offset = 0;
buffer.writeUInt16LE(0, offset); offset += 2;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(1, offset); offset += 2;

buffer.writeUInt8(0, offset); offset += 1;
buffer.writeUInt8(0, offset); offset += 1;
buffer.writeUInt8(0, offset); offset += 1;
buffer.writeUInt8(0, offset); offset += 1;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(32, offset); offset += 2;
buffer.writeUInt32LE(imageSize, offset); offset += 4;
buffer.writeUInt32LE(22, offset); offset += 4;

buffer.writeUInt32LE(dibHeaderSize, offset); offset += 4;
buffer.writeInt32LE(size, offset); offset += 4;
buffer.writeInt32LE(size * 2, offset); offset += 4;
buffer.writeUInt16LE(1, offset); offset += 2;
buffer.writeUInt16LE(32, offset); offset += 2;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(pixelBytes, offset); offset += 4;
buffer.writeInt32LE(2835, offset); offset += 4;
buffer.writeInt32LE(2835, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;
buffer.writeUInt32LE(0, offset); offset += 4;

const colors = {
  transparent: [0, 0, 0, 0],
  paper: [248, 244, 234, 255],
  ink: [23, 32, 29, 255],
  green: [31, 122, 79, 255],
  gold: [185, 132, 43, 255],
  red: [180, 63, 63, 255]
};

function putPixel(x, y, rgba) {
  const bottomUpY = size - 1 - y;
  const index = offset + (bottomUpY * size + x) * 4;
  buffer[index] = rgba[2];
  buffer[index + 1] = rgba[1];
  buffer[index + 2] = rgba[0];
  buffer[index + 3] = rgba[3];
}

function fillRect(x, y, width, height, rgba) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (xx >= 0 && xx < size && yy >= 0 && yy < size) putPixel(xx, yy, rgba);
    }
  }
}

function fillCircle(cx, cy, radius, rgba) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) putPixel(x, y, rgba);
    }
  }
}

fillRect(0, 0, size, size, colors.transparent);
fillRect(34, 34, 188, 188, colors.ink);
fillRect(44, 44, 168, 168, colors.paper);
fillRect(58, 70, 96, 14, colors.ink);
fillRect(58, 105, 132, 14, colors.ink);
fillRect(58, 140, 82, 14, colors.ink);
fillRect(58, 175, 116, 14, colors.ink);
fillCircle(178, 78, 23, colors.green);
fillRect(169, 56, 18, 44, colors.paper);
fillRect(156, 69, 44, 18, colors.paper);
fillCircle(178, 164, 34, colors.gold);
fillCircle(178, 164, 20, colors.paper);
fillRect(174, 122, 8, 48, colors.red);
fillRect(178, 166, 38, 8, colors.red);

fs.writeFileSync(outPath, buffer);
console.log(`Icon written to ${outPath}`);

fs.writeFileSync(pngPath, createPng(size, (x, y) => {
  const dx = x - 128;
  const dy = y - 128;
  const outside = x < 34 || x >= 222 || y < 34 || y >= 222;
  if (outside) return colors.transparent;
  if (x < 44 || x >= 212 || y < 44 || y >= 212) return colors.ink;
  if (inCircle(x, y, 178, 78, 23)) return colors.green;
  if ((x >= 169 && x < 187 && y >= 56 && y < 100) || (x >= 156 && x < 200 && y >= 69 && y < 87)) return colors.paper;
  if (inCircle(x, y, 178, 164, 34) && !inCircle(x, y, 178, 164, 20)) return colors.gold;
  if ((x >= 174 && x < 182 && y >= 122 && y < 170) || (x >= 178 && x < 216 && y >= 166 && y < 174)) return colors.red;
  if ((x >= 58 && x < 154 && y >= 70 && y < 84) || (x >= 58 && x < 190 && y >= 105 && y < 119) || (x >= 58 && x < 140 && y >= 140 && y < 154) || (x >= 58 && x < 174 && y >= 175 && y < 189)) return colors.ink;
  return colors.paper;
}));
console.log(`Icon written to ${pngPath}`);

function inCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function createPng(width, pixelAt) {
  const zlib = require("node:zlib");
  const height = width;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelAt(x, y);
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0])
    ])),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc32(crcInput))
  ]);
}

function uint32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value >>> 0);
  return out;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
