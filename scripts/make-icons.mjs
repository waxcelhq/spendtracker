import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([length, typeBuf, data, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const background = [0x1a, 0x73, 0xe8]
  const foreground = [255, 255, 255]
  const margin = Math.round(size * 0.22)
  const barHeight = Math.max(2, Math.round(size * 0.08))
  const gap = Math.round(size * 0.07)
  const widths = [0.56, 0.4, 0.48]
  const top = Math.round(size * 0.32)

  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      let color = background
      for (let i = 0; i < 3; i++) {
        const y0 = top + i * (barHeight + gap)
        const width = Math.round(size * widths[i])
        if (y >= y0 && y < y0 + barHeight && x >= margin && x < margin + width) color = foreground
      }
      const index = row + 1 + x * 4
      raw[index] = color[0]
      raw[index + 1] = color[1]
      raw[index + 2] = color[2]
      raw[index + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })
writeFileSync(new URL('../public/icons/icon-192.png', import.meta.url), png(192))
writeFileSync(new URL('../public/icons/icon-512.png', import.meta.url), png(512))
