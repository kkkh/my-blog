# 03 · 运行与部署

## 1. 环境要求

| 项 | 要求 | 说明 |
| :--- | :--- | :--- |
| Node | **18+** | 构建脚本 `gen-ai-summaries.mjs` 使用全局 `fetch` 与 `DecompressionStream`（仅在浏览器端用到） |
| 包管理器 | pnpm | 仓库有 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml`（含 `allowBuilds` 白名单：esbuild / sharp / simple-git-hooks） |
| 浏览器 | 现代浏览器 | 依赖 `backdrop-filter`、`IntersectionObserver`、`DecompressionStream`、Service Worker；均有降级分支 |

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发服务器 http://localhost:4321
```

---

## 2. 命令表

`package.json` 中的全部脚本（[`package.json`](../../package.json#L5-L17)）：

| 命令 | 实际执行 | 说明 |
| :--- | :--- | :--- |
| `pnpm dev` | `astro dev` | 开发服务器，`localhost:4321`。**Pagefind 索引在 dev 下不可用**（索引只由 `pnpm build` 生成） |
| `pnpm build` | `astro check && node scripts/gen-ai-summaries.mjs && astro build && pagefind --site dist` | 完整生产构建，四段见下文 |
| `pnpm preview` | `astro preview` | 预览 `dist/` 产物（此时搜索索引可用） |
| `pnpm lint` | `prettier --write .` | 全仓格式化（Prettier 3 + `prettier-plugin-astro`） |
| `pnpm astro` | `astro` | 透传 Astro CLI |
| `pnpm new-post` | `node scripts/new-post.js` | 交互式新建文章目录与 `index.md` |
| `pnpm new-project` | `node scripts/new-project.js` | 新建项目 YAML（**目标路径已过时**，见 [11 脚本与工程化](11-scripts-and-tooling.md#5-已知不一致汇总)） |
| `pnpm new-friend` | `node scripts/new-friend.js` | 交互式添加友链到 `src/data/links.ts` + `public/js/friend.json` |
| `pnpm mcy` | `node scripts/deploy.mjs` | **脚本文件不存在，命令会失败** |
| `pnpm d` | `node scripts/sync.mjs` | **脚本文件不存在，命令会失败** |
| `pnpm prepare` | `pnpm exec simple-git-hooks` | 安装 git hooks（`pnpm install` 自动触发） |

---

## 3. `pnpm build` 四段管线

```
① astro check                    类型检查：.astro/.ts/.tsx，要求零 error/warning/hint
        │ 通过
        ▼
② node scripts/gen-ai-summaries.mjs  AI 摘要生成 → src/data/ai-summaries.json
        │ 失败不阻断（回退 frontmatter summary，写 from:"fallback"）
        ▼
③ astro build                   渲染全部路由 → dist/（跑完整 remark/rehype 管线）
        │
        ▼
④ pagefind --site dist          建全文索引 → dist/pagefind/
```

### 第 2 段的环境变量与开关

| 变量 / 参数 | 默认值 | 作用 |
| :--- | :--- | :--- |
| `AI_CHAT_URL` | `https://ai.43322.cn/chat` | AI Chat SSE 接口地址 |
| `AI_CONCURRENCY` | `2` | 并发请求数（上限受 EdgeOne 会话限制） |
| `--force` | 关闭 | 忽略 `ai-summaries.json` 缓存，全量重新生成 |
| `--retry-fallback` | 关闭 | 只重试上次落到 `from: "fallback"` 的条目 |

细节（SSE 解析、429 指数退避、缓存结构）见 [11 脚本与工程化](11-scripts-and-tooling.md#2-gen-ai-summariesmjs-详解唯一进构建的脚本)。

---

## 4. 部署

### 4.1 Vercel（推荐）

推送到 `main` 后自动构建。缓存策略由 [`vercel.json`](../../vercel.json) 控制：

| source | Cache-Control | 意图 |
| :--- | :--- | :--- |
| `/_astro/(.*)` | `public, max-age=315360000, immutable` | 带 hash 的构建产物，浏览器一年强缓存、不校验 |
| `/(.*)` | `public, max-age=0, s-maxage=315360000, must-revalidate` | HTML 不客户端缓存、交给边缘节点长缓存 |

> 注意：[`Layout.astro`](../../src/layouts/Layout.astro#L12-L13) 中 **Vercel Analytics 已停用**（本站非 Vercel 部署，`/_vercel/insights/script.js` 必 404），
> 但 `vercel.json` 仍在仓库中生效于边缘缓存头。

### 4.2 GitHub Actions

两个工作流在 `.github/workflows/`：

| 工作流 | 触发 | 做的事 |
| :--- | :--- | :--- |
| `cache-hit-check.yml` | `push` 到 `main`（`HIT.txt` 变更除外，防死循环）+ 手动 | 等 120s 让 Vercel 构建完成后：从 `/sitemap.xml` 提取全部 URL → **第一遍 curl 预热边缘缓存** → **第二遍 curl 检查 `X-Vercel-Cache` 是否 HIT**，统计命中率；结果写入 `HIT.txt` |
| `close-inactive-issues.yml` | 每天 `01:30` cron + 手动 | 用 `actions/stale`：issue 14 天无活动标 `stale`，再过 7 天自动关闭；PR 只标记不关闭 |

`cache-hit-check` 能成立的前提是 [自定义 sitemap](../../src/pages/sitemap.xml.ts) 覆盖了首页/分页/文章/分类/标签/静态页。

---

## 5. 本地开发与验证要点

### 5.1 需要"整页刷新"才能看到的改动

- **Pagefind 搜索**：本地 `dev` 没有索引，需 `pnpm build && pnpm preview` 后验证。
- **Service Worker 缓存**：`sw.js` 只在 `https` / `localhost` / `127.0.0.1` 下注册；改动后需在 DevTools → Application → Service Workers 里 Unregister 再刷新。
- **构建期 AI 摘要**：只在 `pnpm build` 时跑；要测试单篇效果可 `node scripts/gen-ai-summaries.mjs --force`。
- **随机强调色**：每页随机选一组，刷新即变（[`AccentColorInjector.astro`](../../src/components/head/AccentColorInjector.astro)）；要固定调试可临时把 `Math.random()` 写死。

### 5.2 修改"交互类"代码后的必测清单（Swup 相关回归）

因为 Swup 只替换 `<main>`，以下场景必须逐条走一遍：

1. 首页 → 文章页 → 返回首页：确认**无白屏**、壁纸不闪变、强调色不跳变；
2. 文章页 → 另一篇文章：确认 **Twikoo/Waline 评论仍正常渲染**（历史 bug：Twikoo 运行时注入的 `<style>` 被 `@swup/head-plugin` 清出 head）；
3. 文章页 → 相册页：确认 **Fancybox 灯箱仍可打开**、实况照片可播放（历史 bug：UMD 被 SwupScriptsPlugin 重复克隆重定义）；
4. 任意切页后：确认 **搜索框（Pagefind）可打开且有样式**、回顶按钮/Toast/Modal 正常；
5. DevTools → Performance：切页数次后确认**监听器数量不持续增长**（`__xxxBound` 幂等守卫是否生效）。

### 5.3 本地类型检查

```bash
pnpm exec astro check
```

仓库要求"零 error / warning / hint"，`pnpm build` 第一段会强校验。

---

## 6. 提交规范（会影响构建链路）

`simple-git-hooks` 安装了两个 hook：

| hook | 命令 | 作用 |
| :--- | :--- | :--- |
| `commit-msg` | `pnpm exec commitlint --edit $1` | 校验 Conventional Commits（`commitlint.config.js` 继承 `@commitlint/config-conventional`） |
| `pre-commit` | `pnpm exec lint-staged` | 对暂存的 `js/jsx/ts/tsx/astro/md/css/json` 跑 `prettier --write` |

Prettier 配置要点（[`.prettierrc`](../../.prettierrc)）：`printWidth: 100`、`semi: false`、`singleQuote: true`、启用 `prettier-plugin-astro`。

---

## 7. 高风险变更清单

仓库 README 明确提示：**修改 [`src/config.json`](../../src/config.json)、[`astro.config.js`](../../astro.config.js)、[`package.json`](../../package.json) 属于高风险变更**，提交前请确认。原因是：

- `config.json` 被站点配置、SEO、页脚、分析脚本、AI 摘要回退等多处消费；
- `astro.config.js` 决定 Markdown 管线（插件顺序影响所有文章渲染）与 Swup/集成行为；
- `package.json` 的 `build` 串行链路一旦改动，可能静默跳过类型检查或 Pagefind 索引。
