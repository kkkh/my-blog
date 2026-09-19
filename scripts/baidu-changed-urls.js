const { execFileSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const siteOrigin = (process.env.SITE_ORIGIN || 'https://mingcy.cn').replace(/\/$/, '')
const isPush = process.env.GITHUB_EVENT_NAME === 'push'
const base = process.env.GITHUB_EVENT_BEFORE
const head = process.env.GITHUB_SHA

const files = []

if (isPush && base && head && !base.startsWith('000')) {
  files.push(
    ...execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', `${base}...${head}`], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  )
} else {
  files.push(
    ...execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD~1...HEAD'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

const postDirs = new Map()
const touchedDirs = new Set()
let touchedSitemapOrConfig = false
let touchedPageOrComponent = false

for (const file of files) {
  const normalized = file.replace(/\\/g, '/')

  const postMatch = normalized.match(/^src\/content\/posts\/(.+)\/index\.(md|mdx)$/)
  if (postMatch) {
    const slug = postMatch[1].replace(/\/index$/, '')
    if (slug && !postDirs.has(slug))
      postDirs.set(slug, siteOrigin + '/' + slug.replace(/\/$/, '') + '/')
    touchedDirs.add('posts')
    continue
  }

  const contentMatch = normalized.match(
    /^src\/content\/(projects|galleries)\/(.+)\/index\.(md|mdx|json|yaml|yml)$/,
  )
  if (contentMatch) {
    touchedDirs.add(contentMatch[1])
    continue
  }

  if (normalized === 'src/pages/sitemap.xml.ts') touchedSitemapOrConfig = true
  if (
    normalized === 'src/config.json' ||
    normalized === 'astro.config.js' ||
    normalized === 'src/utils/content.ts'
  )
    touchedSitemapOrConfig = true
  if (/^src\/pages\/(?!sitemap\.xml\.ts)[^/]+/.test(normalized)) touchedPageOrComponent = true
  if (/^src\/components\//.test(normalized) || /^src\/layouts\//.test(normalized))
    touchedPageOrComponent = true
}

let urls = Array.from(postDirs.values())

if (urls.length === 0 && (touchedSitemapOrConfig || touchedPageOrComponent)) {
  // 新增/更新文章没有被本次 diff 直接识别到，但页面结构或配置变了：回退为 sitemap 全量推送。
  urls = []
}

if (touchedDirs.has('projects')) urls.push(siteOrigin + '/projects/')
if (touchedDirs.has('galleries')) urls.push(siteOrigin + '/galleries/')

// 如果只改了文章正文，只推对应文章；不推 sitemap 全量。
if (urls.length > 0) urls = [...new Set(urls)]

fs.writeFileSync('changed-urls.txt', urls.join('\n') + (urls.length ? '\n' : ''), 'utf8')
fs.writeFileSync(
  'changed-urls.meta.json',
  JSON.stringify(
    { files, urls, touchedDirs: [...touchedDirs], touchedSitemapOrConfig, touchedPageOrComponent },
    null,
    2,
  ),
  'utf8',
)

console.log(`Changed files: ${files.length}`)
console.log(`Changed post URLs: ${urls.length}`)
for (const url of urls) console.log(`  ${url}`)
