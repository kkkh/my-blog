# 02 · 目录结构

## 1. 顶层目录

```
my-blog/
├── .github/workflows/          # CI：缓存命中检查、僵尸 issue 自动关闭
├── .vscode/                    # dev server 启动配置
├── dist/                       # 构建产物（.gitignore 忽略）
├── docs/                       # 开发期资料（非站点内容）
│   ├── code-wiki/              #   ← 本套 Code Wiki
│   ├── live-photo-waterfall/   #   实况照片瀑布流原型（index.html + convert.mjs）
│   └── live-photo-waterfall-v2/#   原型 v2（含 heolivephoto.js 本地副本）
├── node_modules/
├── public/                     # 直接拷贝进 dist 的静态资源（含本地化的第三方库）
├── scripts/                    # 构建期与脚手架脚本（Node ESM/CJS）
├── src/                        # 源码（详见第 2 节）
├── astro.config.js             # Astro 配置（集成 + markdown 管线）
├── tailwind.config.ts          # Tailwind 主题（映射到 CSS 变量）
├── tsconfig.json               # TS 严格模式 + @/* 路径别名
├── vercel.json                 # 边缘缓存头
├── commitlint.config.js        # 提交信息规范（Conventional Commits）
├── .prettierrc / .prettierignore
├── pnpm-lock.yaml / pnpm-workspace.yaml
├── package.json                # 脚本入口 + 依赖清单
├── README.md                   # 面向使用者的特性说明与内容组织说明
└── LICENSE                     # MIT
```

---

## 2. `src/` 目录详解

```
src/
├── config.json          # ★ 站点配置单一真源（站点/作者/hero/色板/菜单/分页/页脚/评论/分析）
├── env.d.ts             # Astro 类型声明入口
├── assets/              # 参与构建的静态资源（signature.svg 等）
├── components/          # 组件（详见第 3 节）
├── content/             # 内容集合（Astro Content Collections）
│   ├── config.ts        #   ★ collections 与其 zod schema 定义
│   ├── posts/<slug>/    #   文章：index.md + 同目录图片（单目录自包含）
│   ├── spec/            #   静态页正文：about.md / projects.md / tools.md
│   └── galleries/<slug>/#   相册：index.md + 图片（可含 .pvt 实况包）
├── data/                # 结构化数据（不参与内容集合校验）
│   ├── links.ts         #   友链分类与条目（LinkCategory[] / LinkItem）
│   ├── projects.ts      #   项目卡（Project[]）
│   ├── tools.ts         #   工具清单（Tool[]）
│   ├── ai-summaries.json#   ★ 构建期生成：{ slug: { summary, from, updatedAt } }
│   └── gallery-manifests/#   远端相册清单（CDN 素材声明）
├── hooks/               # 自定义 React Hooks
├── layouts/             # 三个布局：Layout / PageLayout / MarkdownLayout
├── pages/               # 文件路由（Astro 约定式路由）
├── plugins/             # remark / rehype 插件（Markdown 增强的核心）
├── store/               # Jotai atoms（全局状态）
├── styles/              # 全局样式与主题变量
└── utils/               # 纯函数工具（内容查询 / 日期 / 主题）
```

### 路径别名

`tsconfig.json` 中定义 `"@/*": ["src/*"]`，因此源码里统一用 `@/components/...`、`@/utils/content`、`@/config.json` 引用。
（`astro.config.js` 里对插件的引用用的是相对路径 `./src/plugins/...`，因为该文件在仓库根。）

---

## 3. `src/components/` 分组

| 目录 | 职责 | 代表文件 |
| :--- | :--- | :--- |
| `ai/` | 文章 AI 摘要卡 | `AiSummaryCard.astro` |
| `background/` | 背景效果 | `ParticlesBg.tsx`（粒子，文章页）、`AuroraBackground.astro`（**当前未被引用**） |
| `comment/` | 评论系统外壳与样式 | `Comments.astro`、`Twikoo.astro`、`Waline.astro`、`index.ts` |
| `footer/` | 页脚及其子组件 | `Footer.astro`、`ThemeSwitch.tsx`、`RunningDays.tsx`、`SiteVisitors.astro`、`Link.astro` |
| `head/` | `<head>` 注入（SEO / 主题 / 强调色 / 分析 / 控制台横幅） | `CommonHead.astro`、`ThemeLoader.astro`、`AccentColorInjector.astro`、`WebAnalytics.tsx`、`PrintVersion.astro`、`index.ts` |
| `head-gradient/` | 文章页顶部渐隐渐变 | `HeadGradient.tsx`、`index.ts` |
| `header/` | 导航与搜索 | `Navbar.astro`（1217 行，最复杂组件）、`SearchModal.astro` |
| `hero/` | 首页 Hero 与社交链接 | `Hero.astro`、`SocialList.tsx` |
| `post/` | 文章相关的一切（列表、卡片、目录、进度、版权、上下篇…） | `PostList.astro`、`PostToc.tsx`、`ActionAside.tsx` … |
| `provider/` | React 全局 Provider 组合 | `Provider.tsx` 及 4 个副作用 Provider |
| `sidebar/` | 首页右侧栏卡片 | `ProfileCard.astro`、`GreetingClock.tsx`、`BgImageCard.astro` … |
| `ui/modal/` | 弹窗栈基础设施 | `ModalStack.tsx`、`Modal.tsx`、`hooks.ts` |
| `（根）` | 全局单例 UI 与通用排版组件 | `BackToTopFAB.tsx`、`ToastContainer.tsx`、`MarkdownWrapper.astro`、`Timeline.astro` … |

完整组件清单与实现细节见 [06 组件体系](06-components.md)。

---

## 4. `public/` 静态资源

站点直接拷贝到 `dist/`，因此所有**第三方库都本地化**在这里（规避 CDN 拦截与跟踪防护）：

| 目录 / 文件 | 用途 |
| :--- | :--- |
| `beian/` | 备案相关图标 |
| `fancybox/` | Fancybox 6 灯箱（`fancybox.min.css` + `fancybox.umd.min.js`） |
| `fclite/` | friend-circle-lite 友圈插件（`fclite.js` / `fclite.css` / `avatar-fallback.svg`） |
| `fcircle/` | 友圈页附属资源 |
| `fonts/` | 字体（`robots.txt` 中已 Disallow） |
| `image/` | 站点图片（头像、项目预览图如 `blog.webp` / `note.webp`、友链头像等） |
| `js/` | `friend.json`、`twikoo.json` |
| `livephoto/` | `heolivephoto.js`（实况照片解包，已打补丁去掉自动 scan） |
| `waline/` | Waline 客户端（`waline.js` / `waline.css`） |
| `vendor/` | 其他第三方资源 |
| `sw.js` | 随机壁纸 Service Worker（固定 KEY 缓存 + Stale-While-Revalidate） |
| `pagefind/` | **构建期生成**的搜索索引与 UI（`.gitignore` 已忽略） |
| `favicon.svg` / `favicon.ico` | 站点图标（`config.json` 里 `site.appleTouchIcon` 指向的 `/apple-touch-icon.png` **当前在 `public/` 下不存在**） |
| 各类验证文件（`bo-ke-verify-*.txt`、`jizhlt-og.webp` 等） | 平台验证与 OG 图 |

---

## 5. 文件规模热点（修改风险提示）

| 文件 | 行数 | 说明 |
| :--- | :--- | :--- |
| [`src/layouts/Layout.astro`](../../src/layouts/Layout.astro) | ~1270 | 全局运行时 + 全部 body 级内联脚本，**改动前务必读 [05 布局与全局运行时](05-layouts-and-global-runtime.md)** |
| [`src/components/header/Navbar.astro`](../../src/components/header/Navbar.astro) | ~1217 | 双胶囊导航 + 弹簧物理药丸 + 抽屉，含大量内联 `<style>` 与脚本 |
| [`src/components/comment/Twikoo.astro`](../../src/components/comment/Twikoo.astro) | ~690 | 占位容器 + 大量 `!important` 样式覆盖 |
| [`src/pages/links/fcircle.astro`](../../src/pages/links/fcircle.astro) | ~624 | 友圈页样式与结构（初始化在 Layout） |
| [`src/pages/galleries/[slug].astro`](../../src/pages/galleries/[slug].astro) | ~414 | 相册瀑布流 + 实况三形态解析 |
| [`src/components/comment/Comments.astro`](../../src/components/comment/Comments.astro) | ~331 | 评论骨架与切换器 |
| [`scripts/fix-frontmatter.cjs`](../../scripts/fix-frontmatter.cjs) | ~290 | 历史遗留的 frontmatter 批处理脚本 |
| [`scripts/gen-ai-summaries.mjs`](../../scripts/gen-ai-summaries.mjs) | ~206 | AI 摘要生成（SSE + 限流退避） |
| [`src/styles/global.css`](../../src/styles/global.css) | ~673 | 主题令牌、玻璃卡片、壁纸、通用工具类 |
| [`src/styles/markdown.css`](../../src/styles/markdown.css) | ~647 | Markdown 增强语法的全部样式（与插件输出强耦合） |

> 经验：`Layout.astro`、`Navbar.astro`、`markdown.css`、`Twikoo.astro` 这四个文件的改动最容易产生**跨页面回归**（例如切页后样式丢失、监听器重复累加），改完请务必在真实浏览器里做一次"多页面切换"验证。

---

## 6. 构建产物与忽略项

`.gitignore` 关键条目：

```
dist/           # 构建产物
.astro/         # Astro 生成的类型
node_modules/
.env / .env.production
public/pagefind # ← 搜索索引属于构建产物，不进 Git
```

`pnpm-workspace.yaml` 只用于 pnpm 的构建白名单：

```yaml
allowBuilds:
  esbuild: true
  sharp: true
  simple-git-hooks: true
```
