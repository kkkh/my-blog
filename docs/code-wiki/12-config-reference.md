# 12 · 配置与依赖参考

> 本文是**全量速查手册**：`config.json` 每个键谁在用、`astro.config.js` 每项为什么这样配、`tsconfig`/`vercel.json`/`tailwind` 的要点、依赖分组与其中**未被使用**的部分。
> 相关文件：[config.json](file:///Users/qinchao/Music/my-blog/src/config.json)、[astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js)、[tsconfig.json](file:///Users/qinchao/Music/my-blog/tsconfig.json)、[tailwind.config.ts](file:///Users/qinchao/Music/my-blog/tailwind.config.ts)、[vercel.json](file:///Users/qinchao/Music/my-blog/vercel.json)、[package.json](file:///Users/qinchao/Music/my-blog/package.json)

---

## 1. `src/config.json` 全键说明

### 1.1 `site`

| 键 | 值 | 消费方 | 备注 |
|---|---|---|---|
| `url` | `https://www.43322.cn` | [astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js#L27) `site:` | **决定 RSS/sitemap 的绝对 URL**，改域名必须同步这里 |
| `title` | `超超` | CommonHead / Hero | |
| `description` | `天地广阔，大有可为。` | CommonHead（meta） | |
| `keywords` | 逗号分隔 | CommonHead | |
| `lang` | `zh-CN` | CommonHead `<html lang>` | |
| `favicon` | `/favicon.svg` | CommonHead | 文件存在 ✅ |
| `appleTouchIcon` | `/apple-touch-icon.png` | [CommonHead.astro](file:///Users/qinchao/Music/my-blog/src/components/head/CommonHead.astro#L19) | ⚠️ **`public/` 下无此文件** → iOS 添加到主屏会 404 |

### 1.2 `author`

| 键 | 消费方 |
|---|---|
| `name` | Footer / PostCopyright / Hero |
| `twitterId` | [CommonHead.astro](file:///Users/qinchao/Music/my-blog/src/components/head/CommonHead.astro#L38) → `twitter:site` |
| `avatar` | ProfileCard / Hero（`https://image.43322.cn/image/x-avatar.png`） |

### 1.3 `hero`

| 键 | 消费方 |
|---|---|
| `name` / `bio` / `description` | [Hero.astro](file:///Users/qinchao/Music/my-blog/src/components/hero/Hero.astro) |
| `socials[]`（`name`/`icon`/`url`/`color`） | [SocialList.tsx](file:///Users/qinchao/Music/my-blog/src/components/hero/SocialList.tsx) —— `icon` 是 iconfont 类名（`icon-github` 等） |
| `yiyan` | [YiyanCard.astro](file:///Users/qinchao/Music/my-blog/src/components/sidebar/YiyanCard.astro) —— 侧边栏"一言" |

⚠️ `socials[].color` 是**硬编码 rgb 字符串**，与主题无关 —— 明暗主题下都用同一颜色。

### 1.4 `color`

| 键 | 消费方 | 说明 |
|---|---|---|
| `accent[]` | [AccentColorInjector.astro](file:///Users/qinchao/Music/my-blog/src/components/head/AccentColorInjector.astro) | **10 组 {light,dark}**，每次加载随机选一组 |
| `bg.primary` / `bg.secondary` | 同上 | 各含 light/dark |
| `text.primary` / `text.secondary` | 同上 | |
| `border.primary` | 同上 | |

详见 [09-styles-and-theme.md](./09-styles-and-theme.md) §2。⚠️ **第 1 组与第 10 组 light 均为 `#F55555`**，随机概率翻倍。

### 1.5 `menus` —— ⚠️ **无任何消费方**

```json
"menus": [ { "name":"首页","link":"/","icon":"icon-pantone" }, … ]
```

- **重要更正**：[Navbar.astro](file:///Users/qinchao/Music/my-blog/src/components/header/Navbar.astro#L29) 内部硬编码了 `NAV_LINKS: NavItem[]`，**不读 `config.json.menus`**。
- 全仓库搜索 `menus` 只在 `config.json` 自身命中。
- 结论：**改 `menus` 不会改变导航栏**。若 Navbar 的链接与 menus 出现分歧，以 **Navbar.astro** 为准。
- 另外 `menus` 中有 `children`（下拉子菜单）结构，而 `NAV_LINKS` 是否支持 children 需以 Navbar 实现为准。

### 1.6 `posts.perPage`

| 值 | 消费方 |
|---|---|
| `5` | [\[...page\].astro](file:///Users/qinchao/Music/my-blog/src/pages/%5B...page%5D.astro#L18) 首页分页 **与** [sitemap.xml.ts](file:///Users/qinchao/Music/my-blog/src/pages/sitemap.xml.ts#L10) |

⚠️ **同一个值被两个地方独立读取**（首页分页 + sitemap 分页 URL 生成）。**改它会同时改变首页每页篇数与 sitemap 中的分页链接** —— 两处必须保持一致（当前是靠同读 config 保证的，不要在其中一处硬编码）。

### 1.7 `footer.startTime`

| 值 | 消费方 |
|---|---|
| `2022-03-09T00:00:00Z` | [RunningDays.tsx](file:///Users/qinchao/Music/my-blog/src/components/footer/RunningDays.tsx#L9)「运行 N 天」**与** [Footer.astro](file:///Users/qinchao/Music/my-blog/src/components/footer/Footer.astro#L9) 版权起始年 |

⚠️ 必须带 `Z`（UTC）—— RunningDays 用 `new Date(...)` 计算天数差，无时区标注会在不同运行环境下差一天。

### 1.8 `twikoo.envId` —— ⚠️ **未被消费**

```json
"twikoo": { "envId": "https://twikoo.43322.cn/" }
```

- [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L336) 内**硬编码** `var TWIKOO_ENV_ID = 'https://twikoo.43322.cn/'`，不读 config。
- 结论：改 `config.json.twikoo.envId` **不会生效**。

### 1.9 `sponsor.wechat`

| 值 | 消费方 |
|---|---|
| `https://image.43322.cn/image/wechat.png` | [ActionAside.tsx](file:///Users/qinchao/Music/my-blog/src/components/post/ActionAside.tsx#L138) 赞赏弹窗中的微信收款码 |

### 1.10 `analytics`

```json
"analytics": {
  "enable": true,
  "google": { "measurementId": "G-WPHBHC6LTB" },
  "umami": { "serverUrl": "https://um.43322.cn", "websiteId": "0a0731a2-…" },
  "microsoftClarity": { "projectId": "yuxfhledd6" }
}
```

| 键 | 消费方 |
|---|---|
| `enable` | [WebAnalytics.tsx](file:///Users/qinchao/Music/my-blog/src/components/head/WebAnalytics.tsx#L4)：`if (import.meta.env.DEV \|\| !analytics.enable) return null` |
| `umami.*` | 同上 → `<script defer src="…/script.js" data-website-id="…">` |
| `google.*` | 同上 → gtag.js + 内联 config |
| `microsoftClarity.*` | 同上 → Clarity 内联 loader |

⚠️ **三个重要缺口**：
1. **`enable: false` 无法关掉 Layout 里那两个 Umami script** —— [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L36-L47) 有**两个硬编码的 umami script**（`um.43322.cn` + `cloud.umami.is`），不受 `analytics.enable` 控制。加上 WebAnalytics 注入的第三个，**首页实际会上报 2 次**（`um.43322.cn` 被加载两次，websiteId 相同；`cloud.umami.is` 是另一个 ID）。
2. **DEV 环境仍会加载 Layout 里那两个 script**（只是 WebAnalytics 返回 null）—— 本地开发会污染真实统计数据。
3. `analytics.umami.serverUrl` 与 Layout 硬编码的地址重复表达同一事实。

---

## 2. `astro.config.js` 逐项说明

```js
export default defineConfig({
  site: site.url,                              // ← 来自 config.json；RSS/sitemap 的绝对 URL 基础
  image: { service: passthroughImageService() }, // ← 不用 Sharp，图片原样透传（见下）
  integrations: [tailwind(), react(), mdx({...}), swup({...})],
  markdown: {...},                             // ← 详见 08 文档
  vite: { build: { rollupOptions: { external: ['/pagefind/pagefind.js'] } } },
})
```

| 项 | 值 | 为什么 |
|---|---|---|
| `site` | `config.json.site.url` | **不是硬编码**，改域名只改 config |
| `image.service` | `passthroughImageService()` | **透传图片、不做优化** —— 因为站点图片都在外部 CDN（`cdn.43322.cn` / `image.43322.cn`），本地不生成多尺寸变体。这也意味着**没有响应式 `srcset` 自动生成**，带宽优化靠 CDN 侧完成 |
| `tailwind()` | — | Tailwind 集成（v5），自动注入 `@tailwind` 三条指令 |
| `react()` | — | React 岛支持（`client:*` 指令） |
| `mdx({ extendPlugins:false, … })` | — | MDX 管道，**独立声明插件列表**（详见 [08-markdown-pipeline.md](./08-markdown-pipeline.md)） |
| `swup({ theme:false, animationClass:'swup-transition-', containers:['main'], morph:['[component-export="Provider"]'] })` | — | SPA 换页，**只替换 `<main>`**（详见 §3） |
| `vite.build.rollupOptions.external` | `['/pagefind/pagefind.js']` | Pagefind 产物构建后才生成，必须外部化否则 Rollup 报错 |

### Swup 配置四个键的含义（重点）

| 键 | 值 | 含义与后果 |
|---|---|---|
| `theme: false` | 关闭 | **不使用 Swup 自带 CSS 主题** —— 动画全部自写（[swup.css](file:///Users/qinchao/Music/my-blog/src/styles/swup.css)）。这也是 `animationClass` 需要自定义的原因 |
| `animationClass` | `'swup-transition-'` | Swup 给容器加的类名前缀；**后缀（`fade`）写死在 CSS 里** → 实际类名 `swup-transition-fade`。改这里 CSS 必须同步 |
| `containers` | `['main']` | **只替换 `<main>`**，`<body>` 与 `<head>` 不重建 —— **这是整个项目特殊写法的总根源**（body 级单例脚本、`__xxxBound` 幂等守卫、Twikoo `<style>` 迁移、Waline `<link>` 放 body 全部由此推导） |
| `morph` | `['[component-export="Provider"]']` | 对 Provider 容器启用 **morph（DOM 变形而非重挂）**，避免 React 岛在换页时被卸载重建 —— 状态得以保留 |

> ⚠️ `@swup/astro` **默认开启 `updateHead`（head-plugin）**，它在 `before("content:replace")` 时会**删除 `<head>` 中"下一页静态 HTML 里不存在"的元素**。这是 Twikoo 样式丢失 bug 的根因，也是 Waline 把 `<link>` 放 body 的原因。**配置里看不到它，但必须知道它存在。** 详见 [10-data-and-external-services.md](./10-data-and-external-services.md) §6.3。

---

## 3. `tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "include": ["src/**/*"]
}
```

| 项 | 作用 |
|---|---|
| `extends: astro/tsconfigs/strict` | 启用严格模式基线（`@astrojs/check` 依赖它） |
| `strictNullChecks: true` | 显式重申（strict 已含），额外保险 |
| `paths: { "@/*": ["src/*"] }` | **全项目统一别名的唯一来源** —— 所有 `import ... from '@/config.json'` / `@/utils/...` 都靠它。**改这里会影响全仓库导入** |
| `jsx: react-jsx` + `jsxImportSource: react` | 新 JSX 转换，**React 组件文件无需 `import React`** |
| `include: ["src/**/*"]` | 只检查 `src`；`scripts/*.js`、`*.mjs`、`*.cjs` **不在类型检查范围**（所以脚本里的类型问题不会被 `astro check` 发现） |

---

## 4. `vercel.json`（缓存策略）

```json
{
  "headers": [
    { "source": "/_astro/(.*)", "headers": [{ "key": "Cache-Control",
        "value": "public, max-age=315360000, immutable" }] },
    { "source": "/(.*)", "headers": [{ "key": "Cache-Control",
        "value": "public, max-age=0, s-maxage=315360000, must-revalidate" }] }
  ]
}
```

| 规则 | 策略 | 含义 |
|---|---|---|
| `/_astro/(.*)` | `max-age=315360000, immutable` | **带哈希的构建产物** → 浏览器永久强缓存、**不重新验证**（10 年） |
| `/(.*)`（兜底） | `max-age=0, s-maxage=315360000, must-revalidate` | HTML 等 → **浏览器不缓存（max-age=0）**，但 **CDN 缓存 10 年（s-maxage）**，CDN 过期时回源验证 |

**设计意图**：
- **HTML 永远新鲜**：`max-age=0` + `must-revalidate` → 用户每次拿到最新 HTML（对博客内容更新友好），代价是每次都要请求（由 CDN 承担）。
- **静态资源零成本**：`_astro/` 下文件名含内容哈希，内容变了文件名就变 → 可以放心 `immutable`。
- ⚠️ **注意 `_astro` 之外的其他静态资源**（`/fancybox/` `/waline/` `/fclite/` `/fonts/` 等）**落在兜底规则里** → 会被 `max-age=0` 对待，**每次都要验证**。这些文件名不带哈希，改动后无法自动失效，所以这个保守策略是"正确但不最优"的选择。
- 缓存头只对 **Vercel 部署**生效；本地 `pnpm preview` 无此配置。

---

## 5. `tailwind.config.ts` 要点

（完整逐项见 [09-styles-and-theme.md](./09-styles-and-theme.md) §3，此处只列"容易踩坑"的键）

| 键 | 值 | 踩坑点 |
|---|---|---|
| `content` | `['./src/**/*.{astro,ts,tsx,js,jsx}']` | ⚠️ **不含 `.md` / `.mdx`** → Markdown 正文里写 Tailwind 类名**不会被生成**（正文样式应走 `markdown.css`） |
| `darkMode` | `['selector', '[data-theme="dark"]']` | ⚠️ 与 ThemeLoader 强耦合；改成 `'class'` / `'media'` 会让全站 `dark:` 失效 |
| `colors.accent` | `rgb(var(--color-accent) / <alpha-value>)` | **唯一带 `<alpha-value>`** → 只有 `accent` 支持 `/20` 透明度写法 |
| `backgroundColor.root/primary/secondary` | 各自 `rgb(var(--color-*))` | 无 `<alpha-value>` → `bg-primary/50` **静默失效** |
| `minHeight.main` | `calc(100vh - 200px)` | 短内容页 footer 不上浮 |
| `fontFamily` | 各平台字体栈 | 与 `global.css` 的 `Atkinson` `@font-face` **无关联**（后者无消费方） |

---

## 6. 依赖分组与使用状况

共 **40 个 dependencies + 8 个 devDependencies**（[package.json](file:///Users/qinchao/Music/my-blog/package.json)）。

### 6.1 实际使用的依赖

| 分组 | 包 | 用途 |
|---|---|---|
| **框架** | `astro` 4.x | 静态站点框架 |
| | `@astrojs/mdx` 2.3.1 | MDX 支持（**版本锁定精确版本**，非 `^`） |
| | `@astrojs/react` | React 岛 |
| | `@astrojs/tailwind` | Tailwind 集成 |
| | `@astrojs/markdown-remark` | 提供 `rehypeHeadingIds` |
| | `@astrojs/rss` | RSS endpoint |
| | `@astrojs/check` | `astro check` 类型校验 |
| **Swup** | `@swup/astro` | SPA 换页 |
| **React 生态** | `react` / `react-dom` 18 | |
| | `jotai` | 状态（atoms） |
| | `framer-motion` 11 | 动效（仅 9 处） |
| | `react-toastify` | Toast 通知 |
| | `qrcode.react` | 赞赏/分享二维码 |
| | `clsx` | className 组合 |
| | `@radix-ui/react-dialog` | Modal 无障碍基础 |
| **Markdown** | `remark-math` / `rehype-katex` / `katex` | 数学公式 |
| | `remark-ins` / `remark-supersub` / `remark-directive` | 语法扩展 |
| | `@shikijs/rehype` | 构建期代码高亮 |
| | `hastscript` / `unist-util-visit` | rehype 插件工具 |
| | `mdast-util-to-string` / `reading-time` | 阅读时长 |
| **搜索** | `pagefind` | 站内搜索索引 |
| | `lodash-es` | 工具函数 |
| | `zod` | content schema |
| | `typescript` | |

### 6.2 ⚠️ 声明但**未被使用**的依赖

| 包 | 证据 | 建议 |
|---|---|---|
| `chroma-js` + `@types/chroma-js` | [AccentColorInjector.astro](file:///Users/qinchao/Music/my-blog/src/components/head/AccentColorInjector.astro#L12) 注释明确写着"纯原生 JS 实现 hex→rgb 与 RGB 插值（**替代 chroma-js**）" | 移除 |
| `@astrojs/sitemap` | `astro.config.js` 的 `integrations` 中**没有它**；sitemap 由自写的 `src/pages/sitemap.xml.ts` 生成 | 移除 |
| `@vercel/analytics` | [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L129-L130) 中 `<Analytics />` 被注释，注释文字为 **"已停用"** | 移除（或明确恢复并启用） |
| `zod`（作为直接 dependency） | Astro 内部已依赖 zod；但 [config.ts](file:///Users/qinchao/Music/my-blog/src/content/config.ts#L1) 显式 `import { z } from 'astro:content'`（**从虚拟模块导入，不是从 `zod` 包**） | 技术上可移除，保留亦无害（显式声明版本更可控） |
| `@waline/client` | 全仓库（`src/` `scripts/`）**无任何 import**；Waline 运行时代码由 `public/waline/waline.js` 本地产物提供 | 移除，或明确其版本管理用途 |

**未使用依赖的危害**：拖慢安装、扩大攻击面、误导协作者（"这个包一定在哪里用了"）。**`chroma-js` 尤其容易误导** —— 它自带 `@types/chroma-js`，看起来是"正式使用"的样子。

### 6.3 devDependencies

| 包 | 用途 |
|---|---|
| `@inquirer/prompts` | 交互式 CLI（`scripts/new-*.js`） |
| `simple-git-hooks` | git hooks 管理 |
| `@commitlint/cli` + `config-conventional` | 提交信息规范 |
| `lint-staged` | 暂存区格式化 |
| `prettier` + `prettier-plugin-astro` | 格式化 |
| `micromark-util-symbol` | **remarkSpoiler 专用**（`codes`/`types`/`constants`） |

> ⚠️ `micromark-util-symbol` 只在 [remarkSpoiler.js](file:///Users/qinchao/Music/my-blog/src/plugins/remarkSpoiler.js#L1) 中 import，**但它决定 spoiler 语法能否构建** —— 属于"放在 devDependencies 但生产构建必需"的错位。严格来说应移到 `dependencies`（若部署环境执行 `pnpm install --prod` 会缺包）。

---

## 7. 其它配置文件

| 文件 | 作用 |
|---|---|
| [.prettierrc](file:///Users/qinchao/Music/my-blog/.prettierrc) | 格式化规则（含 `prettier-plugin-astro`） |
| [.gitignore](file:///Users/qinchao/Music/my-blog/.gitignore) | 忽略 `dist/`、`.astro/`、`src/data/ai-summaries.json` 等自动产物 |
| `src/content/config.ts` | 三个 collection 的 zod schema + `noonDefaultDate`（详见 [04-content-and-routing.md](./04-content-and-routing.md)） |

---

## 8. 全仓库「已知不一致」总表（配置视角）

> 与 [11-scripts-and-tooling.md](./11-scripts-and-tooling.md) §5 是同一份清单的不同切面。此处只列**配置/依赖**相关条目；完整 21 条见 11 文档。

| # | 位置 | 问题 | 影响 |
|---|---|---|---|
| 1 | `config.json.menus` | 无消费方（Navbar 硬编码 `NAV_LINKS`） | 改配置不生效 |
| 2 | `config.json.twikoo.envId` | 无消费方（Layout 硬编码） | 同上 |
| 3 | `config.json.site.appleTouchIcon` | 指向不存在的 `public/apple-touch-icon.png` | iOS 图标 404 |
| 4 | `config.json.color.accent` | 第 1 / 10 组 light 值相同 | 该色随机概率翻倍 |
| 5 | `config.json.analytics.enable` | 关不掉 Layout 中两个硬编码 Umami script | 隐私/统计不可控 |
| 6 | `config.json.posts.perPage` | 被首页与 sitemap 两处读取 | 改值影响面比预期大 |
| 7 | 依赖 `chroma-js`（+types） | 已被纯 JS 替代 | 无用依赖 + 误导 |
| 8 | 依赖 `@astrojs/sitemap` | 未在 integrations 启用 | 无用依赖 |
| 9 | 依赖 `@vercel/analytics` | 组件已注释停用 | 无用依赖 |
| 10 | `micromark-util-symbol` | 在 devDependencies 但构建必需 | `--prod` 安装会失败 |
| 11 | `tailwind.config.content` | 不含 `.md` / `.mdx` | Markdown 内的 Tailwind 类不生成 |
| 12 | `tsconfig.include` | 只含 `src/**/*` | `scripts/` 无类型检查 |
| 13 | `vercel.json` 兜底规则 | `/fancybox` `/waline` 等无哈希静态资源 `max-age=0` | 每次都要验证，非最优 |
| 14 | `swup.animationClass` | 前缀在配置、后缀在 CSS | 改一处必须同步另一处 |

---

## 9. 相关文档

- 全部 21 条已知不一致 → [11-scripts-and-tooling.md](./11-scripts-and-tooling.md) §5
- 文档索引与全局约定 → [README.md](./README.md)
- 架构总览（三层模型、构建管线）→ [01-architecture-overview.md](./01-architecture-overview.md)
- 主题变量与 Tailwind 映射详解 → [09-styles-and-theme.md](./09-styles-and-theme.md)
- 构建、部署、CI 与 Vercel 缓存 → [03-run-and-deploy.md](./03-run-and-deploy.md)
- Markdown 管道配置（含 MDX 差异）→ [08-markdown-pipeline.md](./08-markdown-pipeline.md)
