/**
 * sync.mjs — 一键同步整个源码仓库（astro-gyoza 根目录）到 GitHub
 *
 * 用法：
 *   node scripts/sync.mjs                     # 默认提交信息 chore: sync <时间>
 *   node scripts/sync.mjs "feat: xxx"         # 自定义提交信息（可选）
 *
 * 与 deploy.mjs 的区别：
 *   - deploy.mjs  推送 dist/ 构建产物到部署仓库（触发静态托管）
 *   - sync.mjs    推送整个源码目录（含 src/、scripts/、vercel.json 等），
 *                 走 .gitignore 排除白文件（dist、node_modules、.reasonix 等）
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..') // astro-gyoza 根目录
const REMOTE_URL = 'https://github.com/rumian0/astro.git'
const TARGET_BRANCH = 'main'
const PROXY_CMD = 'C:\\Program Files\\Git\\mingw64\\bin\\connect.exe -S 127.0.0.1:10808 -5 %h %p'

// 白文件：以下路径必须被 .gitignore 排除，否则中止同步（防止误推构建产物/本地状态）
const MUST_IGNORE = ['dist', 'node_modules', '.astro', '.reasonix', 'reasonix.toml', '.env']

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function isIgnored(p) {
  // 本机不存在的路径不可能被 git 提交，直接视为安全。
  // 这一步必须放在 check-ignore 之前：.gitignore 里的目录型 pattern（带尾斜杠，
  // 如 `.reasonix/`）只在路径确实存在且是目录时才匹配 —— 目录被删掉之后
  // `git check-ignore .reasonix` 会判定 NOT-IGNORED，于是把「本来就已排除、
  // 且根本不在磁盘上」的路径误报成未排除，同步直接被中止。
  if (!existsSync(path.join(ROOT, p))) return true
  try {
    execSync(`git check-ignore -q "${p}"`, { cwd: ROOT, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// 0. 前置检查：白文件必须已被 .gitignore 排除
const bad = MUST_IGNORE.filter((p) => !isIgnored(p))
if (bad.length > 0) {
  console.error(`❌ 以下路径未被 .gitignore 排除，已中止同步：\n  ${bad.join('\n  ')}`)
  console.error('请先在 .gitignore 中追加这些路径后重试。')
  process.exit(1)
}
console.log('✅ 白文件检查通过（dist / node_modules / .astro / .reasonix 等已排除）')

// 1. 进入仓库根目录
process.chdir(ROOT)
console.log('📂 同步目录：', ROOT)

// 2. 确保 origin 指向目标远程仓库
try {
  execSync('git remote get-url origin', { stdio: 'pipe' })
  run(`git remote set-url origin ${REMOTE_URL}`)
} catch {
  run(`git remote add origin ${REMOTE_URL}`)
}

// 3. 暂存全部改动（.gitignore 自动排除白文件）
run('git add -A')

// 4. 提交（支持自定义提交信息，默认 chore: sync <时间>）
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
  now.getHours(),
)}-${pad(now.getMinutes())}`
const msg = (process.argv[2] || `chore: sync ${dateStr}`).replace(/"/g, "'")
console.log(`📝 提交信息：${msg}`)

// 不再用 git diff --cached 预检测（会把"改了被忽略文件/内容未变"误判为无变更）。
// 直接提交；commit 失败时用 git status 兜底区分「真无变更」与真实错误（commitlint/lint-staged 等）。
try {
  run(`git commit -m "${msg}"`)
} catch (e) {
  const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
  if (!dirty) {
    console.log('ℹ️ 无文件变更，同步终止。')
    process.exit(0)
  }
  throw e
}

// 5. 推送（走 connect.exe 代理；普通推送失败说明远程分叉，自动降级强推）
const pushEnv = { ...process.env, GIT_PROXY_COMMAND: PROXY_CMD }
try {
  run(`git push origin ${TARGET_BRANCH}`, { env: pushEnv })
} catch {
  console.log('⚠️ 普通推送失败（远程可能分叉），改用强制推送覆盖远程')
  run(`git push -f origin ${TARGET_BRANCH}`, { env: pushEnv })
}

console.log('\n🎉 同步完成！')
