# 11 · 脚本与工具链

> 本文说明：**`scripts/` 下每个脚本做什么、怎么跑、失败会怎样**，以及 **git hooks / CI / 代码规范** 的落地方式。
> 相关文件：[scripts/](file:///Users/qinchao/Music/my-blog/scripts)、[package.json](file:///Users/qinchao/Music/my-blog/package.json)、[.github/workflows/](file:///Users/qinchao/Music/my-blog/.github/workflows)、[.prettierrc](file:///Users/qinchao/Music/my-blog/.prettierrc)

---

## 1. 脚本总览

| 脚本 | npm 命令 | 用途 | 是否被 `pnpm build` 调用 |
|---|---|---|---|
| [gen-ai-summaries.mjs](file:///Users/qinchao/Music/my-blog/scripts/gen-ai-summaries.mjs) | （内联在 build 里） | 构建期批量生成 AI 摘要 | ✅ **第 2 段** |
| [new-post.js](file:///Users/qinchao/Music/my-blog/scripts/new-post.js) | `pnpm new-post` | 交互式创建文章骨架 | ❌ |
| [new-friend.js](file:///Users/qinchao/Music/my-blog/scripts/new-friend.js) | `pnpm new-friend` | 交互式添加友链（改两台文件） | ❌ |
| [new-project.js](file:///Users/qinchao/Music/my-blog/scripts/new-project.js) | `pnpm new-project` | 交互式创建"项目" | ❌ **目标路径已失效** |
| [utils.js](file:///Users/qinchao/Music/my-blog/scripts/utils.js) | — | 公共工具（文件名校验） | 被上面几个 import |
| [fix-frontmatter.cjs](file:///Users/qinchao/Music/my-blog/scripts/fix-frontmatter.cjs) | （无命令） | **一次性迁移脚本**（Hexo → Astro） | ❌ |
| `deploy.mjs` / `sync.mjs` | `pnpm mcy` / `pnpm d` | — | **文件不存在**（见 §4） |

---

## 2. `gen-ai-summaries.mjs` 详解（唯一进构建的脚本）

这是工具链里最需要理解的一个，因为它**在每次生产构建时都会执行**，且依赖外部 AI 服务。

### 2.1 定位与数据流

```
遍历 src/content/posts/*/index.md
  → 简易解析 frontmatter（title / summary / category / tags）
  → 抽取正文前 3000 字符（剥离代码块/图片/链接噪音）
  → POST https://ai.43322.cn/chat （SSE 流式）
  → 解析 data: 行拼接增量文本 → 得到 2-3 句中文摘要
  → 写入 src/data/ai-summaries.json（作为缓存 + 数据源）
```

- 服务是已部署的 **EdgeOne AI Chat Assistant**（`POST /chat`，`text/event-stream`）。
- 输出文件 `src/data/ai-summaries.json` 是**构建产物兼缓存**：已存在则读取复用（除非 `--force`）。

### 2.2 使用方式

```bash
node scripts/gen-ai-summaries.mjs                 # 全量生成（命中缓存则跳过）
node scripts/gen-ai-summaries.mjs --force         # 忽略缓存，全部重新生成
node scripts/gen-ai-summaries.mjs --retry-fallback # 只重试上次兜底（from:'fallback'）的条目
```

环境变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `AI_CHAT_URL` | `https://ai.43322.cn/chat` | 接口地址 |
| `AI_CONCURRENCY` | `2` | 并发 worker 数 |

### 2.3 SSE 解析（核心逻辑）

```js
const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''            // ← 保留最后一段不完整行，下轮再拼
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6).trim()
    if (payload === '[DONE]') break
    const evt = JSON.parse(payload)
    if (evt.type === 'text_delta' && evt.delta) text += evt.delta
    if (evt.type === 'error_message' && evt.content) throw new Error(evt.content)
  }
}
```

三个要点：
1. **`buffer` 断行策略**是流式解析的标准写法：`split('\n')` 后把最后一段（可能被网络切在半行中间）留到下一轮。**不做这件事会把 JSON 切坏**。
2. `decoder.decode(value, { stream: true })` 也必须带 `{stream:true}`，否则多字节 UTF-8 字符（中文）跨 chunk 时会乱码。
3. 错误事件 `error_message` 从**流内部**抛出，与外层 HTTP 错误区分开。

### 2.4 限流与重试

```js
if (res.status === 429) {
  const wait = 1000 * Math.pow(2, attempt) + Math.random() * 500   // 指数退避 + 抖动
  await new Promise((r) => setTimeout(r, wait))
  continue
}
```
- **指数退避**（1s / 2s / 4s / 8s）+ **0~500ms 随机抖动**（避免多 worker 同时重试形成同步脉冲）。
- `MAX_RETRY = 4`（累计最多 5 次尝试），耗尽后 `throw new Error('429 重试耗尽')`。
- **共享会话 ID** 是刻意的：
  ```js
  const CONVERSATION_ID = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
  headers: { 'makers-conversation-id': CONVERSATION_ID }
  ```
  注释说明：*"复用同一会话 id：EdgeOne 限制同时活跃会话数，共享会话可避免 429 并发限制"* —— 即**用同一个会话跑完所有文章**，而不是每篇开一个会话。

### 2.5 兜底与"失败不阻断构建"（最重要的设计）

```js
} catch (e) {
  cache[post.slug] = {
    summary: post.frontmatterSummary,   // ← 用文章自带 summary 兜底
    from: 'fallback',
    updatedAt: new Date().toISOString(),
  }
  fail++
}
...
// AI 服务不可用时以 frontmatter summary 兜底，不阻断构建
if (fail > 0) console.warn(`… ${fail} 篇使用文章自带摘要兜底…`)
```

- **任何单篇失败都不会 `throw` 出去** → 构建永远能继续。
- 缓存记录带 **`from: 'ai' | 'fallback'`** 字段：
  - `from: 'ai'` → 真·AI 摘要；
  - `from: 'fallback'` → 用了 frontmatter 的 `summary`。
- 这使 `--retry-fallback` 成为可能：只重跑上次兜底的条目，**不必浪费 token 重跑已成功的**。
- 失败条目**也会写进缓存**（未被跳过），所以不加 `--retry-fallback` 时下次构建**不会**重试它们 —— 这是刻意的取舍（避免每次构建都为失败条目反复请求）。
- 空回复（`summary` 为空串）走与异常**相同**的兜底分支。
- 进度输出按 `doneCount % 5 === 0` 打印，避免刷屏。

### 2.6 正文抽取的清洗规则

```js
body.replace(/```[\s\S]*?```/g, ' ')          // 去代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // 去图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // 链接只留文字
    .replace(/[#>*_`~-]/g, ' ')               // 去 Markdown 符号
    .replace(/\s+/g, ' ')                      // 压空白
    .slice(0, 3000)                            // 截断 3000 字符
```
**去代码块是必要的一步** —— 否则代码文章会把 3000 字符配额全用在代码上，摘要质量崩坏。3000 字符是**篇幅与 token 成本**之间的折中。

### 2.7 消费方

`src/data/ai-summaries.json` 由文章页/卡片读取作为摘要显示（与 frontmatter `summary` 协同）。**它是自动生成产物，按仓库约定不进 Git**（见 [02-directory-structure.md](./02-directory-structure.md)）—— 因此 CI 构建必须先跑本脚本。

---

## 3. 内容创建脚本

### 3.1 `new-post.js`（可用）

```
pnpm new-post
  → 交互：文件名（校验 ^[a-z0-9]+(-[a-z0-9]+)*$ 且不存在）+ 标题
  → mkdir src/content/posts/<name>/
  → 写 src/content/posts/<name>/index.md（含基础 frontmatter）
  → 提示"图片请放在 <dir>/ 目录下"
```

- 生成的是**目录 + `index.md`** 结构（页包形式），因为该仓库文章支持**同目录放图片**（相对路径引用）。
- 文件名校验来自 [utils.js](file:///Users/qinchao/Music/my-blog/scripts/utils.js) 的 `isFileNameSafe()`：仅小写字母、数字、连字符，**不允许中文/空格** —— 因为文件名会变成 URL slug。
- 模板 frontmatter 只给 `title / date / tags / comments / draft`，**没有 `category`、`summary`、`cover`**（这些靠后续手填）。
- `date` 用 `new Date().toISOString()` → 带完整时间，因此**不会**触发 `noonDefaultDate` 归一化（归一化只对 UTC 午夜生效，见 [04-content-and-routing.md](./04-content-and-routing.md)）。

### 3.2 `new-friend.js`（可用，会改两台文件）

```
pnpm new-friend
  → 交互：名称 / 描述 / 地址（必须 startsWith('http')）/ 头像 / 分类（5 选 1）
  → ① 正则定位 src/data/links.ts 中该分类的 links 数组，插入新条目
  → ② 追加到 public/js/friend.json 的 friends 数组
```

- **改两台文件是刻意的**：`links.ts` 供友链页渲染，`friend.json` 供友圈（fclite）脚本消费 —— 数据源分离导致必须双写。
- ⚠️ **分类名不一致**：脚本的候选值是 `'大佬们'`，而 [links.ts](file:///Users/qinchao/Music/my-blog/src/data/links.ts#L15) 里实际标题是 `'来看看大佬们'`。若选「大佬们」，正则匹配不到 → 打印 `未找到分类…` 并 `process.exit(1)`。**这是一个真实的 bug**。
- 插入用正则替换而非 AST 解析 —— 对格式敏感：若 `links.ts` 被 Prettier 大幅重排（如引号风格变化），正则可能失配。
- `friend.json` 写入失败**只 warn 不退出**（`links.ts` 那一步已成功，视为部分成功）。
- 插入的条目字段顺序是 `name, url, avatar, desc`，而 `links.ts` 中现有条目是 `name, url, avatar, desc` —— 一致，Prettier 不会因顺序改写。

### 3.3 `new-project.js`（**已失效**）

```
→ 写入 ./src/content/projects/<name>.yaml
```
- ⚠️ **`src/content/projects/` 目录不存在**，`astro.config` 中也没有 `projects` collection（只有 `posts` / `spec` / `galleries`，见 [config.ts](file:///Users/qinchao/Music/my-blog/src/content/config.ts#L57-L62)）。
- 且使用 `fs.writeFileSync` 而**未 `mkdirSync`** → 目标目录不存在时会直接 `ENOENT` 崩溃。
- 当前项目数据实际在 [src/data/projects.ts](file:///Users/qinchao/Music/my-blog/src/data/projects.ts)。**结论：此脚本是旧架构残留，跑必然失败，应改造为追加到 `projects.ts`（参考 `new-friend.js` 的做法）或直接删除。**

### 3.4 `fix-frontmatter.cjs`（一次性迁移工具，勿再运行）

专属 **Hexo → Astro 迁移**阶段的历史脚本，硬编码了：

```js
const OLD_POSTS_DIR = 'G:\\文档\\hexo\\blog\\shokax-can\\source\\_posts'   // Windows 路径
const SLUG_MAP = { 'mothers-day': "mother's-day" }
if (slug === 'qqth') return true        // 单个 slug 特判
```

- 它做三件事：① 从旧 Hexo 文章补齐缺失的 `category` / `tags`；② 修复 tags 里的**中文逗号**（把 `"a，b"` 拆成 `["a","b"]`）；③ 按固定字段顺序重写 frontmatter。
- 内含一个**手写简易 YAML 解析器** `simpleYamlParse()`（不依赖 js-yaml，专为旧 frontmatter 的怪格式写）。
- ⚠️ **有副作用且不可重入**：它会**直接覆写 `src/content/posts/*/index.md`**，且强依赖一个 `G:\` 盘路径。**在新环境下运行会报错或写坏文章，请勿执行**；保留它只为记录迁移历史。
- 字段顺序表 `fieldOrder`（title → date → lastMod → summary → cover → category → tags → draft → comments → sticky）可作为**frontmatter 书写顺序的参考规范**。

---

## 4. 缺失脚本（`pnpm mcy` / `pnpm d` 会直接报错）

[package.json](file:///Users/qinchao/Music/my-blog/package.json#L9-L10) 声明：

```json
"mcy": "node scripts/deploy.mjs",
"d":   "node scripts/sync.mjs"
```

但 `scripts/` 下**没有 `deploy.mjs` 也没有 `sync.mjs`** → 执行会 `Cannot find module`。

- 推测用途：部署（`mcy` = 名字缩写）、同步（`d`）。
- 当前部署实际走**Vercel Git 集成**（推送到仓库即自动构建），因此这两个命令**并非必需**。
- **建议**：要么删除这两个 script 条目，要么补上实现。**留在 package.json 里会让新协作者踩坑。**

---

## 5. 已知不一致（汇总）

> 本节是 [README.md](./README.md)「已知不一致清单」的展开版；同一份清单也在 [12-config-reference.md](./12-config-reference.md) 中从**依赖/配置视角**列出。

| # | 位置 | 问题 | 影响 | 建议 |
|---|---|---|---|---|
| 1 | `package.json` | `mcy` / `d` 指向不存在的 `deploy.mjs` / `sync.mjs` | 命令直接报错 | 删除或补实现 |
| 2 | `new-project.js` | 写入不存在的 `src/content/projects/*.yaml`，且缺 `mkdirSync` | 命令必然失败 | 重写为追加 `projects.ts` 或删除 |
| 3 | `new-friend.js` | 分类候选 `'大佬们'` 与 `links.ts` 实际 `'来看看大佬们'` 不匹配 | 选该项必失败并退出 | 统一分类名（改为从 links.ts 动态读取分类列表更稳） |
| 4 | `fix-frontmatter.cjs` | 硬编码 Windows 盘符路径 + 直接覆写文章 | 新环境运行会坏数据 | 归档/删除，勿执行 |
| 5 | `config.json` | `menus` 段无任何消费方（Navbar 硬编码 `NAV_LINKS`） | 改配置不生效，误导性强 | 让 Navbar 读 config，或删除该段 |
| 6 | `config.json` | `twikoo.envId` 未被消费（Layout 内硬编码 `https://twikoo.43322.cn/`） | 同上 | 改为读 config |
| 7 | `sitemap.xml.ts` | 硬编码了**不存在的相册 slug** | 生成的 sitemap 含死链 | 改为从 `getCollection('galleries')` 派生 |
| 8 | `config.json` | `site.appleTouchIcon` 指向 `/apple-touch-icon.png`，但 `public/` 下**该文件不存在** | 部分浏览器 iOS 图标 404 | 补文件或删配置 |
| 9 | 依赖 | `chroma-js` / `@types/chroma-js` 无消费方（AccentColorInjector 用纯 JS 替代） | 无用依赖 | 移除 |
| 10 | 依赖 | `@astrojs/sitemap` 声明但未在 `astro.config` 中启用（站点自带 `sitemap.xml.ts`） | 无用依赖 | 移除 |
| 11 | 依赖 | `@vercel/analytics` 声明但已停用（[Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L129-L130) 中 `<Analytics />` 被注释） | 无用依赖 | 移除 |
| 12 | 依赖 | `zod` 直接列为 dependency（Astro 内部已依赖） | 冗余 | 可移除（但 `config.ts` 显式 `import { z }`，保留亦合理） |
| 13 | 代码 | `utils/content.ts` 的 `getHotTags` 无消费方 | 死代码 | 删除 |
| 14 | 代码 | `useDebounceValue` 无调用方 | 死代码 | 删除或补使用方 |
| 15 | 组件 | `AuroraBackground` / `RootPortal` / `LinkCard` 无引用 | 孤儿组件 | 删除或接入 |
| 16 | 字体 | `Atkinson` `@font-face` 与 `/fonts/*.woff` 存在，但无 `font-family: Atkinson` 消费方 | 白加载两个字重 | 移除或启用 |
| 17 | 统计 | Umami 脚本**双重加载**（Layout 内两个不同 websiteId + WebAnalytics 再注入一个） | 重复上报 | 收敛为一处并纳入 config 开关 |
| 18 | 路由 | `pages/about.astro` 与 `[spec].astro` 都生成 `/about`（静态路由优先，`spec/about.md` 为死内容） | 维护时易改错文件 | 删除 `spec/about.md` 或改路由 |
| 19 | 样式 | `.spoiler` 在 `global.css` 与 `markdown.css` 双重定义，且 global 后置覆盖 | 改一处无效 | 收敛到 markdown.css |
| 20 | 管道 | MDX 管道缺 `rehypeCodeHighlight`；两管道插件列表手工复制 | `.mdx` 代码无高亮；未来易两边不同步 | 抽共享数组 |
| 21 | 脚本 | `gen-ai-summaries` 失败条目写入缓存后**默认不再重试** | 需要 `--retry-fallback` 才补 | 已在文档中说明；可考虑在 CI 中自动加该参数 |

---

## 6. Git Hooks 与提交规范

由 **simple-git-hooks** 管理（[package.json](file:///Users/qinchao/Music/my-blog/package.json#L70-L73)）：

```json
"simple-git-hooks": {
  "commit-msg": "pnpm exec commitlint --edit $1",
  "pre-commit": "pnpm exec lint-staged"
},
"lint-staged": {
  "*.{js,jsx,ts,tsx.astro,md,css,json}": "prettier --write"
}
```

| Hook | 作用 |
|---|---|
| `commit-msg` | `commitlint` 校验提交信息符合 **Conventional Commits**（`feat:` / `fix:` / `docs:` / `chore:` …） |
| `pre-commit` | `lint-staged` 只对**暂存区**的文件跑 `prettier --write`，避免全仓库格式化 |

- 安装时机：`pnpm install` 时由 `"prepare": "pnpm exec simple-git-hooks"` 自动写入 `.git/hooks`。**若 hooks 未生效，先手动跑一次 `pnpm prepare`。**
- ⚠️ **`lint-staged` 的 glob 有笔误**：`"ts,tsx.astro"` 中间是 `.` 而不是逗号 —— 实际匹配的是 `tsx.astro` 这一种复合扩展名（不存在），**`.tsx` 与 `.astro` 其实没被覆盖**。正确写法应为 `*.{js,jsx,ts,tsx,astro,md,css,json}`。
- `prettier --write` 会直接改写暂存文件；若它与编辑器格式化配置不同，可能出现"提交后文件又变了"的现象。格式化规则见 [.prettierrc](file:///Users/qinchao/Music/my-blog/.prettierrc)（含 `prettier-plugin-astro`）。
- 提交信息风格参考：仓库使用 conventional 前缀（如 `feat:` / `fix:` / `docs:`）。

---

## 7. CI（GitHub Actions）

仓库有 **两个 workflow**（[.github/workflows/](file:///Users/qinchao/Music/my-blog/.github/workflows)），均**不负责 lint / 构建**。职责分工（详见 [03-run-and-deploy.md](./03-run-and-deploy.md)）：

| Workflow | 触发 | 主要动作 |
|---|---|---|
| `cache-hit-check.yml` | `push` 到 `main`（`HIT.txt` 变更除外，防死循环）+ 手动 | 等 120s 让 Vercel 部署完成后：从 `/sitemap.xml` 取全部 URL → 第一遍 curl 预热边缘缓存 → 第二遍 curl 检查 `X-Vercel-Cache` 是否 HIT，统计命中率并写入 `HIT.txt` |
| `close-inactive-issues.yml` | 每天 `01:30` cron + 手动 | `actions/stale`：issue 14 天无活动标 `stale`，再过 7 天自动关闭；PR 只标记不关闭 |

> ⚠️ **没有 CI 类型检查 / 构建工作流**：`astro check` 与 `pnpm build` 只在本地（或 Vercel 侧）执行，PR 不会自动跑校验。

**必读约束**：

1. CI 中的 **`pnpm build` 会执行 `gen-ai-summaries.mjs`** —— 意味着 CI 需要能访问 `ai.43322.cn`。若外网不可达，脚本会走**兜底分支**（frontmatter summary），构建仍然成功，只是摘要质量降级。**这是"失败不阻断"设计的最大价值体现。**
2. CI 若不设置 `AI_CONCURRENCY`，默认并发为 **2**，构建时间会明显长于本地（大量文章时）。
3. **Pagefind 必须在 `astro build` 之后**运行（它索引 `dist/` 产物）。
4. `dist/` 与 `src/data/ai-summaries.json` 等自动产物**不进 Git**（见 `.gitignore`），因此 **CI 必须完整跑一遍构建，不能复用仓库中的产物**。

---

## 8. 本地开发常用命令

```bash
pnpm dev                # 开发服务器（Astro dev，默认 4321）
pnpm build              # 完整构建（check + AI 摘要 + astro build + pagefind）
pnpm preview            # 预览 dist（注意：Pagefind 依赖构建产物）
pnpm lint               # prettier --write . （全仓库格式化）
pnpm astro check        # 只做类型/内容校验
pnpm new-post           # 新建文章
pnpm new-friend         # 新增友链
```

⚠️ **`pnpm dev` 下不要期待搜索可用** —— Pagefind 索引是构建期产物，dev 模式下不存在索引（且 `rollupOptions.external` 只影响构建）。

---

## 9. 相关文档

- 构建管线四段与部署（Vercel 缓存头、CI 细节）→ [03-run-and-deploy.md](./03-run-and-deploy.md)
- `config.json` / `astro.config.js` / 依赖分组全表 → [12-config-reference.md](./12-config-reference.md)
- AI 摘要的消费方（文章页/卡片）→ [04-content-and-routing.md](./04-content-and-routing.md)、[06-components.md](./06-components.md)
- `src/data/*` 数据层全貌 → [10-data-and-external-services.md](./10-data-and-external-services.md)
