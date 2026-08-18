#!/usr/bin/env node
/**
 * gen-ai-summaries.mjs — 构建期 AI 摘要生成（路线 C）
 *
 * 遍历 src/content/posts 下各文章目录的 index.md，调用已部署的 EdgeOne
 * AI Chat Assistant（/chat 接口，SSE 流式），为每篇文章生成 2-3 句中文摘要，
 * 输出到 src/data/ai-summaries.json。
 *
 * 用法：
 *   node scripts/gen-ai-summaries.mjs            # 全量生成
 *   node scripts/gen-ai-summaries.mjs --force    # 忽略缓存强制重新生成
 *
 * 依赖：Node 18+（内置 fetch），无需额外 npm 包。
 * 说明：/chat 接口采用 SSE（text/event-stream），需要解析 data: 行拼接增量文本。
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const POSTS_DIR = resolve(ROOT, 'src/content/posts')
const OUT_FILE = resolve(ROOT, 'src/data/ai-summaries.json')

const AI_CHAT_URL = process.env.AI_CHAT_URL || 'https://ai.mingcy.cn/chat'
const CONCURRENCY = Number(process.env.AI_CONCURRENCY || 2)
const FORCE = process.argv.includes('--force')
const RETRY_FALLBACK = process.argv.includes('--retry-fallback')
// 复用同一会话 id：EdgeOne 限制同时活跃会话数，共享会话可避免 429 并发限制
const CONVERSATION_ID = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const MAX_RETRY = 4

// 已存在则复用（除非 --force）
let cache = {}
try {
  cache = JSON.parse(await readFile(OUT_FILE, 'utf-8'))
} catch {}

/** 解析 md 的简易 frontmatter（只取 title/summary/category/tags） */
function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { title: '', summary: '', category: '', tags: [] }
  const block = m[1]
  const get = (key) => {
    const re = new RegExp(`^${key}:\\s*(.*)$`, 'm')
    const hit = block.match(re)
    return hit ? hit[1].trim().replace(/^['"]|['"]$/g, '') : ''
  }
  return {
    title: get('title'),
    summary: get('summary'),
    category: get('category'),
    tags: get('tags'),
  }
}

/** 从 frontmatter 块末尾之后取正文前 maxChars 字符（去掉代码块噪音） */
function extractBody(md, maxChars = 3000) {
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, maxChars)
}

/** 调用 /chat，解析 SSE，返回拼接后的完整回复；带 429 指数退避重试 */
async function fetchSummary(post) {
  const suffix = post.tags.length ? `（标签：${post.tags.join('、')}）` : ''
  const message = [
    '请阅读以下博客文章内容，用 2-3 句简洁的中文概括这篇文章的核心内容与价值，',
    '直接输出摘要本身，不要任何前缀或解释。',
    `\n\n【文章标题】${post.title}${suffix}\n【正文】\n${post.body}`,
  ].join('')

  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const res = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': CONVERSATION_ID,
      },
      body: JSON.stringify({ message }),
    })
    if (res.status === 429) {
      const wait = 1000 * Math.pow(2, attempt) + Math.random() * 500
      console.log(`  ⏳ 429 限流，${Math.round(wait)}ms 后重试（${attempt + 1}/${MAX_RETRY + 1}）`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    // 读取 SSE
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') break
        try {
          const evt = JSON.parse(payload)
          if (evt.type === 'text_delta' && evt.delta) text += evt.delta
          if (evt.type === 'error_message' && evt.content) throw new Error(evt.content)
        } catch {}
      }
    }
    return text.trim()
  }
  throw new Error('429 重试耗尽')
}

// ── 收集任务 ─────────────────────────────────────────────
const files = []
for (const dir of await readdir(POSTS_DIR)) {
  const indexFile = join(POSTS_DIR, dir, 'index.md')
  try {
    const s = await stat(indexFile)
    if (s.isFile()) files.push(indexFile)
  } catch {}
}
const tasks = []
for (const file of files) {
  const slug = file.split(/[\\/]/).slice(-2, -1)[0]
  const md = await readFile(file, 'utf-8')
  const fm = parseFrontmatter(md)
  // 兼容 tags 为数组（兜底）或字符串（单行 YAML 数组）两种情况
  const tagsRaw = Array.isArray(fm.tags) ? fm.tags.join(',') : (fm.tags || '')
  tasks.push({
    slug,
    title: fm.title,
    tags: tagsRaw.replace(/^\[|\]$/g, '').replace(/['"]/g, '').split(',').map((t) => t.trim()).filter(Boolean),
    frontmatterSummary: fm.summary,
    body: extractBody(md),
  })
}

const todo = tasks.filter(
  (t) => FORCE || !cache[t.slug] || (RETRY_FALLBACK && cache[t.slug]?.from === 'fallback')
)
console.log(`[gen-ai-summaries] ${tasks.length} 篇文章，待生成 ${todo.length} 篇（并发 ${CONCURRENCY}）`)

let cursor = 0
let ok = 0
let fail = 0

async function worker() {
  while (cursor < todo.length) {
    const idx = cursor++
    const post = todo[idx]
    try {
      const summary = await fetchSummary(post)
      if (summary) {
        cache[post.slug] = { summary, from: 'ai', updatedAt: new Date().toISOString() }
        ok++
      } else {
        // 空回复 → 用 frontmatter summary 兜底
        cache[post.slug] = { summary: post.frontmatterSummary, from: 'fallback', updatedAt: new Date().toISOString() }
        fail++
      }
    } catch (e) {
      cache[post.slug] = { summary: post.frontmatterSummary, from: 'fallback', updatedAt: new Date().toISOString() }
      fail++
      console.error(`  ✗ ${post.slug}: ${e.message}`)
    }
    const doneCount = ok + fail
    if (doneCount % 5 === 0 || doneCount === todo.length) {
      console.log(`  … 完成 ${doneCount}/${todo.length}（AI ${ok} · 兜底 ${fail}）`)
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, () => worker()))

await mkdir(dirname(OUT_FILE), { recursive: true })
await writeFile(OUT_FILE, JSON.stringify(cache, null, 2) + '\n')
console.log(`[gen-ai-summaries] 完成。写入 ${OUT_FILE}（AI ${ok} · 兜底 ${fail}）`)
// AI 服务不可用时以 frontmatter summary 兜底，不阻断构建
if (fail > 0) console.warn(`[gen-ai-summaries] ${fail} 篇使用文章自带摘要兜底（AI 接口可能暂时不可用）`)