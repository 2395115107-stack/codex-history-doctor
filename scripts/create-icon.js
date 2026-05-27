#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const outDir = path.join(process.cwd(), "assets");
const outPath = path.join(outDir, "icon.ico");
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
