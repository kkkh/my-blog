#!/usr/bin/env node
/**
 * Motion Photo (.jpg 内嵌 MP4) → 拆分产物 + .pvt 打包器
 * ------------------------------------------------------------------
 * 用法：
 *   node convert.mjs <输入1.jpg> [输入2.jpg ...] [--out 输出目录] [--dry-run] [--pvt-only]
 *
 * --dry-run    只检测不写文件，适合先扫一遍一批照片看哪些是 Motion Photo
 * --pvt-only   只产出 .pvt + 封面，不产单独的视频文件（配合 data-pvt 形态用，最省空间）
 *
 * 单张输入产出 4 个文件（以原名不含扩展名为前缀）：
 *   IMG-cover.jpg   封面，只含 JPEG 部分（缩略图专用，最小）
 *   IMG-video.mp4   视频，只含 MP4 部分（灯箱专用）
 *   IMG.pvt         封面 + 视频打成一个 ZIP（Heo 的 .pvt 约定）
 *
 * 零依赖，只用 Node 内置模块。检测算法与 /livephoto/heolivephoto.js 的
 * extractMotionFromBuffer 完全一致，保证浏览器端解出来的字节和这里一致。
 *
 * 为什么值得拆：Motion Photo 的 jpg 把封面和视频粘在一个文件里，浏览器要
 * 显示缩略图得下载整份、要抠出视频又得整份再 fetch 一遍 —— 同一份字节下两次。
 * 拆开后 <img> 只拿封面、<video> 只拿视频，一份字节只下一次，而且 video 标签
 * 不需要 CORS，跨域也能播。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

// ---------------------------------------------------------------------------
// 1. Motion Photo 检测（移植自 heolivephoto.js，逐分支一致）
// ---------------------------------------------------------------------------
function findMotionParts(u8) {
  const head = new TextDecoder().decode(u8.slice(0, Math.min(u8.length, 200000)))

  // Google 相机写在 EXIF 里，精度最高
  let m = head.match(/GCamera:MicroVideoOffset="(\d+)"/)
  let offset = m ? parseInt(m[1], 10) : null
  if (!offset) {
    m = head.match(/MicroVideoOffset[^0-9]*(\d{4,})/)
    if (m) offset = parseInt(m[1], 10)
  }

  let videoStart = -1
  if (offset && offset > 0 && offset < u8.length) {
    videoStart = u8.length - offset
    let found = -1
    for (let d = -4; d <= 4; d++) {
      const p = videoStart + d
      if (p >= 0 && p + 8 < u8.length && u8[p + 4] === 0x66 && u8[p + 5] === 0x74 && u8[p + 6] === 0x79 && u8[p + 7] === 0x70) {
        found = p
        break
      }
    }
    if (found === -1) {
      for (let i = Math.max(0, videoStart - 16); i < Math.min(u8.length, videoStart + 16); i++) {
        if (u8[i] === 0x66 && u8[i + 1] === 0x74 && u8[i + 2] === 0x79 && u8[i + 3] === 0x70) {
          found = i - 4
          break
        }
      }
    }
    if (found !== -1) videoStart = found
    else if (!(u8[videoStart + 4] === 0x66 && u8[videoStart + 5] === 0x74)) return null
  } else {
    // 没有 EXIF 标记：找 JPEG EOI (ffd9)，往后 100 字节内找 ftyp
    for (let i = 0; i < u8.length - 10; i++) {
      if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
        for (let j = i + 2; j < Math.min(u8.length, i + 100); j++) {
          if (j + 8 < u8.length && u8[j + 4] === 0x66 && u8[j + 5] === 0x74 && u8[j + 6] === 0x79 && u8[j + 7] === 0x70) {
            videoStart = j - 4
            break
          }
        }
        if (videoStart !== -1) break
      }
    }
    if (videoStart === -1) return null
  }

  // 回找最近的 JPEG EOI 作为封面结束位
  let eoi = -1
  for (let i = videoStart - 2; i >= Math.max(0, videoStart - 100000); i--) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
      eoi = i + 2
      break
    }
  }
  if (eoi === -1) eoi = videoStart
  if (videoStart < eoi) videoStart = eoi

  const jpegBytes = u8.slice(0, eoi)
  const videoBytes = u8.slice(videoStart)

  if (jpegBytes.length < 1024 || videoBytes.length < 1024) return null
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) return null
  if (!(videoBytes[4] === 0x66 && videoBytes[5] === 0x74)) return null

  return { cover: jpegBytes, video: videoBytes }
}

// ---------------------------------------------------------------------------
// 2. ZIP 打包（method 0 = store；JPEG/MP4 本身已压缩，deflate 只会白费 CPU）
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u16(v) {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, v, true)
  return b
}
function u32(v) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, v, true)
  return b
}
function concat(arrs) {
  const n = arrs.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(n)
  let p = 0
  for (const a of arrs) {
    out.set(a, p)
    p += a.length
  }
  return out
}

function buildPvt(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const { name, data } of entries) {
    const nb = new TextEncoder().encode(name)
    locals.push(concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc32(data)), u32(data.length), u32(data.length), u16(nb.length), u16(0),
      nb, data
    ]))
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc32(data)), u32(data.length), u32(data.length),
      u16(nb.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nb
    ]))
    offset += locals[locals.length - 1].length
  }
  const cd = concat(centrals)
  const eocd = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(cd.length), u32(offset), u16(0)
  ])
  return concat([...locals, cd, eocd])
}

// ---------------------------------------------------------------------------
// 3. CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const outFlag = args.indexOf('--out')
const outDir = outFlag !== -1 && args[outFlag + 1] ? args[outFlag + 1] : 'assets'
const dryRun = args.includes('--dry-run')
const pvtOnly = args.includes('--pvt-only')
const inputs = args.filter((a, i) =>
  a !== '--out' && args[i - 1] !== '--out' && a !== '--dry-run' && a !== '--pvt-only'
)

if (!inputs.length) {
  console.error('用法：node convert.mjs <输入1.jpg> [...] [--out 输出目录]')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const kb = (n) => (n / 1024).toFixed(1) + ' KB'
const total = inputs.length
let motionCount = 0
let motionBytes = 0
let savedBytes = 0

console.log('扫描 ' + total + ' 个文件' + (dryRun ? '（--dry-run，不写文件）' : ''))
console.log('')

for (const input of inputs) {
  if (!existsSync(input)) {
    console.log('✗ 跳过（文件不存在）：' + input)
    continue
  }
  const size = statSync(input).size
  const u8 = new Uint8Array(readFileSync(input).buffer)
  const parts = findMotionParts(u8)

  if (!parts) {
    console.log('  - 静态图（无内嵌视频）：' + basename(input) + '  ' + kb(size))
    continue
  }

  motionCount++
  motionBytes += size
  savedBytes += parts.video.length // 拆开后可省下的就是整份视频那一份

  if (dryRun) {
    console.log('  + Motion Photo：' + basename(input) + '  ' + kb(size) +
      '  →  封面 ' + kb(parts.cover.length) + '  +  视频 ' + kb(parts.video.length))
    continue
  }

  const base = basename(input, extname(input))
  const coverName = base + '-cover.jpg'
  const videoName = base + '-video.mp4'
  const pvtName = base + '.pvt'

  writeFileSync(join(outDir, coverName), Buffer.from(parts.cover))
  const pvtData = buildPvt([
    { name: base + '.JPG', data: parts.cover },
    { name: base + '.MP4', data: parts.video }
  ])
  writeFileSync(join(outDir, pvtName), Buffer.from(pvtData))
  let wroteVideo = true
  if (!pvtOnly) {
    writeFileSync(join(outDir, videoName), Buffer.from(parts.video))
  } else {
    wroteVideo = false
  }

  console.log('✓ ' + input + '  (' + kb(size) + ')')
  console.log('   封面 ' + coverName.padEnd(28) + kb(parts.cover.length))
  console.log('   打包 ' + pvtName.padEnd(28) + kb(pvtData.length))
  if (wroteVideo) console.log('   视频 ' + videoName.padEnd(28) + kb(parts.video.length))
  console.log('   ── 流量对比 ──')
  console.log('      Motion Photo 现状      2 × ' + kb(size) + ' = ' + kb(size * 2) + '  （<img> 一次 + fetch 一次）')
  console.log('      封面+视频 分离           ' + kb(parts.cover.length + parts.video.length) + '  ← 最省，且 video 标签不需要 CORS')
  console.log('      .pvt + 单独封面          ' + kb(size + parts.cover.length) + '  （仍比现状省一半）')
  console.log('')
}

console.log('')
console.log('──────── 汇总 ────────')
console.log('  Motion Photo   ' + motionCount + ' / ' + total + ' 张')
console.log('  Motion Photo 总源体积   ' + (motionBytes / 1048576).toFixed(2) + ' MB')
console.log('  若现状（Motion Photo 直接给浏览器）需下载 ' + (motionBytes * 2 / 1048576).toFixed(2) + ' MB  ← 2 倍')
console.log('  若拆成 .pvt + 封面         ' + ((motionBytes + motionBytes) / 1048576).toFixed(2) + ' MB 上界（含 .pvt 与单独封面）')
console.log('  若只给封面 + 视频分离     ' + (motionBytes / 1048576).toFixed(2) + ' MB  ← 最省')
console.log('')
if (dryRun) {
  console.log('未写任何文件。确认后去掉 --dry-run 重跑即可。')
} else {
  console.log('输出目录：' + outDir + '（可相对路径写进 data-cover / data-video / data-pvt）')
}
