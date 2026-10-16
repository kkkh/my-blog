# 01 · 架构总览

## 1. 项目定位

`astro-qinchao` 是一个**全静态**个人博客站点：没有任何后端服务、没有 SSR adapter，所有页面在构建期渲染为 HTML，
运行时只依赖浏览器端脚本与少量第三方托管服务（评论、统计、随机图）。

技术选型遵循"**能在构建期算完的，绝不放到运行时**"：

| 层 | 技术 | 在本项目的角色 |
| :--- | :--- | :--- |
| 框架 | Astro 4 | 页面与布局（`.astro`，SSR 一次性输出）、content collections、路由 |
| 交互岛 | React 18 | 需要状态/动画的小块 UI（目录、进度、分享、弹窗、时钟…） |
| 样式 | Tailwind 3 + 原生 CSS 变量 | Tailwind 负责排版工具类；主题色/玻璃材质/壁纸走 CSS 变量 |
| 状态 | Jotai | 跨岛共享的少量全局状态（主题、滚动位置、弹窗栈、元信息） |
| 动画 | Framer Motion | 仅用于需要"真动画"的 9 处组件 |
| 导航 | `@swup/astro` | 站点内 SPA 切页（只替换 `<main>`） |
| 搜索 | Pagefind | 构建期生成索引、运行时纯前端全文检索 |
| 内容管线 | remark / rehype 插件（10 个） | Markdown 增强、代码块包装、图片 figure 化、标题锚点等 |
| 公式 / 高亮 | KaTeX / `@shikijs/rehype` | 数学公式与代码高亮（构建期完成） |
| 评论 | Twikoo + Waline | 双引擎可切换、懒加载 |
| 统计 | Umami + Google Analytics + Microsoft Clarity | 站点访问、单篇浏览量 |

> 注意：Vercel Analytics 已在源码中停用（[`Layout.astro`](../../src/layouts/Layout.astro#L12-L13) 顶部有注释说明：本站非 Vercel 部署，`/_vercel/insights/script.js` 必 404），
> 但依赖仍留在 `package.json` 中，见 [12 配置参考与依赖清单](12-config-reference.md)。

---

## 2. 三层架构模型

本仓库最重要的认知模型是"**运行时有三层，且各自的生命周期完全不同**"：

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 第 0 层：构建期（Node，只在 pnpm build 时运行一次）                        │
│   astro check → gen-ai-summaries.mjs → astro build → pagefind --site dist │
│   产出：dist/ 静态 HTML + AI 摘要 JSON + Pagefind 索引                     │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                         生成静态 HTML / CSS / JS
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 第 1 层：静态 HTML（Astro 组件，浏览器只解析、不重跑）                      │
│   layouts/*.astro · pages/*.astro · components/**/*.astro                │
│   生命周期：跟随 Swup 的 <main> 替换（布局/导航/页脚则整站常驻）           │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                     <main> 被 Swup 替换，body 不变
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 第 2 层：body 级常驻运行时（Layout.astro 内的 is:inline 脚本，单例）        │
│   随机壁纸 + Service Worker · Swup 清理广播 · 滚动降级 · 代码复制委托       │
│   友圈 boot · 评论驱动（Twikoo/Waline）· Fancybox + 实况照片 · 搜索模态框   │
│   生命周期：整个会话只初始化一次，靠事件委托 / __xxxBound 幂等守卫自愈       │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                         DOM 内容替换（React 岛被丢弃）
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 第 3 层：main 内的 React 岛（client:only / load / idle / visible）         │
│   Provider · PostToc · ReadingProgress · ActionAside · PostCopyright …    │
│   生命周期：随 <main> 一起被替换 → React 不触发 unmount → 必须显式清理      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 为什么必须这样分层

`@swup/astro` 的配置是 `containers: ['main']`、`morph: ['[component-export="Provider"]']`（见 [`astro.config.js`](../../astro.config.js#L57-L62)）。
这意味着：

- **切页 = 只把 `<main>` 里的 DOM 换成新页面的**，`<body>` 与 `<head>` 的常驻元素不重建；
- 于是**任何"全局单例"必须放 body**（Modal 栈、Toast、回顶按钮、搜索框、评论驱动、Fancybox、壁纸层）；
- 反过来，**React 岛被整段丢弃时 React 不知道**，`useEffect` 的 cleanup 不会执行 →
  定时器 / `requestAnimationFrame` / `IntersectionObserver` / 事件监听会持续泄漏。

仓库为此提供了专用协议（见 [07 React 岛与状态管理](07-react-islands-state.md)）：

```
Layout.astro  ← 监听 swup:content:replace
      │
      └─ dispatchEvent(new CustomEvent('mcy:island-cleanup'))
                     │
                     ▼
            useCleanupOnPageLeave(cleanup)  ← 各 React 岛注册清理函数，触发后自我解绑
```

---

## 3. 构建管线

`pnpm build` 串行执行四段（[`package.json`](../../package.json#L8)）：

```bash
astro check && node scripts/gen-ai-summaries.mjs && astro build && pagefind --site dist
```

| 阶段 | 命令 | 作用 | 失败行为 |
| :--- | :--- | :--- | :--- |
| 1 类型检查 | `astro check` | `.astro` / `.ts` / `.tsx` 全量类型校验（"零 error/warning/hint"是项目要求） | 阻断构建 |
| 2 AI 摘要 | `node scripts/gen-ai-summaries.mjs` | 遍历 `src/content/posts/*/index.md`，调用 EdgeOne AI Chat（SSE）生成 2-3 句摘要，写入 `src/data/ai-summaries.json` | **不阻断**，回退 frontmatter `summary` 并写 `from: "fallback"` |
| 3 站点构建 | `astro build` | 渲染全部路由为静态 HTML，跑 remark/rehype 管线 | 阻断构建 |
| 4 搜索索引 | `pagefind --site dist` | 对 `dist/` 建立全文索引，产出 `dist/pagefind/` | 阻断构建 |

Markdown 增强（KaTeX / Shiki / 各种自定义语法）**全部发生在第 3 段**，因此运行时没有 Markdown 解析开销。

---

## 4. 运行时关键机制

以下机制贯穿多个文件，是理解本仓库的枢纽。

### 4.1 SPA 导航与页面动画

- 集成：`@swup/astro`，`containers: ['main']`、动画类 `swup-transition-`、`morph: Provider`。
- 动画：见 [`styles/swup.css`](../../src/styles/swup.css) —— 离开 `0.3s` 淡出 + `scale(0.965)` + `blur(3px)`；
  进入用弹簧曲线 `cubic-bezier(0.34, 1.56, 0.64, 1)` 从 `scale(0.965)` 弹入；`prefers-reduced-motion` 时全部关闭。
- 页面级脚本：`swup:page:view` 与 `astro:page-load` 是两个主要重挂载时机，仓库中所有"切页后要重做的事"都挂在这两个事件上（并常带 `setTimeout` 兜底 150/200/700ms）。

### 4.2 主题与随机强调色（零闪烁）

| 机制 | 文件 | 要点 |
| :--- | :--- | :--- |
| 主题防闪烁 | [`ThemeLoader.astro`](../../src/components/head/ThemeLoader.astro) | `<head>` 内 `is:inline` 脚本，首帧即写 `html[data-theme]`，读 `localStorage`（key `gyoza-theme`，见 [`utils/theme.ts`](../../src/utils/theme.ts)），支持 `system`；另有哀悼日 `.gray` 处理 |
| 每页随机强调色 | [`AccentColorInjector.astro`](../../src/components/head/AccentColorInjector.astro) | `is:inline` + `define:vars` 把 `config.json` 的 10 组 light/dark 色板序列化进页面，`Math.random()` 选一组，纯 JS 做 hex→rgb 与插值（**替代 chroma-js**），写入 `--color-accent` 等变量；`swup:content:replace` 时重新注入 |
| 主题状态同步 | [`store/theme.ts`](../../src/store/theme.ts) + [`ThemeProvider.tsx`](../../src/components/provider/ThemeProvider.tsx) + [`ThemeSwitch.tsx`](../../src/components/footer/ThemeSwitch.tsx) | Jotai atom 是唯一真源；Provider 把它同步到 DOM 与 `localStorage`，并监听系统主题变化 |

### 4.3 随机壁纸：一次请求、两处复用、跨刷新秒开

```
Layout 内联脚本  ──1 次──> https://webp.43322.cn?v=<timestamp>
        │  Image.decode() 成功后
        ▼
   :root { --random-bg-url: url(...) } + html.bg-ready
        │
        ├─► .site-wallpaper（全局背景层，::before 图片 + ::after 可读性遮罩）
        └─► 侧边栏 BgImageCard（.bg-shared-media）
                     ▲
   Service Worker（public/sw.js）以固定 KEY 缓存 opaque response，
   刷新时命中缓存秒开、后台 Stale-While-Revalidate 更新下一张
```

关键设计：`webp.43322.cn` 不返回 CORS 头，`fetch()` 拿不到字节；Service Worker 用 `no-cors` 拿到 **opaque response**
可以 `cache.put` 并能被 `<img>` / CSS `url()` 渲染——这是**唯一不需要服务端配合的跨域图片缓存方案**。

### 4.4 滚动性能降级

[`Layout.astro`](../../src/layouts/Layout.astro#L139-L159) 维护 `body.is-scrolling`：滚动一发生即加上，停止 `120ms` 后移除。
CSS 在 `is-scrolling` 期间移除 `backdrop-filter`（毛玻璃是滚动重绘卡顿主因）并把玻璃底色提为 `/0.9`。
同时全站的鼠标跟随/进度监听统一用 `requestAnimationFrame` 限流 + `{ passive: true }`。

### 4.5 内容与数据来源

| 来源 | 位置 | 形态 |
| :--- | :--- | :--- |
| 博客文章 | `src/content/posts/<slug>/index.md` | Markdown + 同目录图片，单目录自包含 |
| 规格/静态页正文 | `src/content/spec/*.md` | `about` / `projects` / `tools` 等由 `[spec].astro` 统一渲染 |
| 相册 | `src/content/galleries/<slug>/index.md` + 图片 | 本地图片用 `import.meta.glob` 收集元数据 |
| 远端相册清单 | `src/data/gallery-manifests/<slug>.json` | 素材在 CDN，仓库不背体积 |
| 友链 / 项目 / 工具 | `src/data/links.ts` / `projects.ts` / `tools.ts` | 手写 TS 数组（带 interface） |
| AI 摘要 | `src/data/ai-summaries.json` | **构建期生成**，`from: "ai" \| "fallback"` |
| 站点配置 | `src/config.json` | 站点/作者/hero/色板/分页/页脚/评论/分析 |

---

## 5. 设计原则（改代码前请遵守）

1. **不做运行时重活**：能构建期算的（高亮、公式、目录树、摘要、字数、SEO）绝不放到浏览器。
2. **模块级幂等**：所有 body 级脚本用 `window.__xxxBound` / `dataset.state = 'done'` / `data-ready` 之类标记保证只初始化一次（Swup 会重复触发事件）。
3. **优先 CSS，谨慎引 JS 动画**：Framer Motion 只用于 9 处（`PostToc` / `Outdate` / `BackToTopFAB` / `HeadGradient` / `Modal` / `ModalStack` / `ActionAside` / `TimelineProgress` / `SocialList`），列表类组件（Timeline / TagList / CategoryList）保持纯 CSS。
4. **规避 hydration mismatch**：需要"当前时间/相对时间"的组件首帧输出静态值或占位（`GreetingClock` 首帧 `null`、`RelativeDate` 先渲染绝对日期、`PostCopyright` 挂载后才格式化），注释中明确提到 React error #418/#423/#425。
5. **第三方资源本地化**：Fancybox / Waline / friend-circle-lite / HeoLivePhoto 全部放 `public/`，不依赖外部 CDN（规避浏览器跟踪防护拦截）。
6. **不改 `config.json` / `astro.config.js` / `package.json` 里的高风险键**：仓库 README 明确把这几个文件列为高风险变更。

---

## 6. 相关文档

- 目录与文件职责 → [02 目录结构](02-directory-structure.md)
- 具体命令与部署 → [03 运行与部署](03-run-and-deploy.md)
- 布局里的那堆内联脚本逐条说明 → [05 布局与全局运行时](05-layouts-and-global-runtime.md)
- 组件清单与实现细节 → [06 组件体系](06-components.md)
