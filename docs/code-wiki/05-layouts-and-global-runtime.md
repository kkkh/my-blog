# 05 · 布局与全局运行时

本页是整个 Wiki 的**枢纽**：`Layout.astro` 里的内联脚本群是"切页后一切仍然正常"的根本原因，也是排障时最先要看的地方。

---

## 1. 三个布局的分工

| 布局 | 使用方 | 职责 |
| :--- | :--- | :--- |
| [`Layout.astro`](../../src/layouts/Layout.astro) | 被另两个布局包裹 | `<html>`/`<head>` 注入（SEO、主题、强调色、分析、控制台横幅）+ **全部 body 级常驻运行时** + 全局单例 UI 挂载 |
| [`PageLayout.astro`](../../src/layouts/PageLayout.astro) | 首页/归档/标签/分类/相册/友链/关于/404 等 | `Layout` + `Provider`(`client:only`) + `Navbar` + `<main>` + `Footer` |
| [`MarkdownLayout.astro`](../../src/layouts/MarkdownLayout.astro) | 文章详情页、`[spec]` 长文页 | `PageLayout` 的内容 + 文章页专属件（`HeadGradient`、`CommentFAB`、`ParticlesBg`）+ KaTeX 样式 |

### 1.1 `PageLayout.astro`

```astro
<Layout title={title} description={description} image={image}>
  <Provider pathName={Astro.url.pathname} client:only="react" />
  <Navbar />
  <main class={`relative z-1 pt-16 min-h-main ${transparentBg ? 'page-bg-home' : 'bg-primary/25'}`}>
    <div class="swup-transition-fade">
      <slot />
    </div>
  </main>
  <Footer />
</Layout>
```

- props：`title?` / `description?` / `image?` / `transparentBg = false`（首页专用，露出全局壁纸）；
- `swup-transition-fade` 是 Swup 动画的挂载点（样式见 [`styles/swup.css`](../../src/styles/swup.css)）；
- **`Provider` 是唯一带 `morph: ['[component-export="Provider"]']` 的节点**：Swup 切页时对它做 DOM morph 而不是整体替换，从而让 Jotai 状态与 DOM 保持连续。

### 1.2 `MarkdownLayout.astro`

在 PageLayout 基础上增加：

| 组件 | 指令 | 作用 |
| :--- | :--- | :--- |
| `HeadGradient` | `client:idle` | 文章页顶部渐隐渐变（Framer Motion 淡入） |
| `CommentFAB` | （Astro，内部内联脚本） | 评论悬浮按钮 |
| `ParticlesBg` | `client:visible` | Canvas 粒子背景 |
| `katex/dist/katex.min.css` | — | 数学公式样式（只在 Markdown 页引入，避免全站加载） |

`<main>` 底色为 `bg-primary/60`（比 PageLayout 更实，保证长文可读性）。

---

## 2. `Layout.astro` 结构

### 2.1 `<head>` 注入顺序

| 顺序 | 内容 | 说明 |
| :--- | :--- | :--- |
| 1 | `CommonHead` | title/description/keywords/canonical/OG/Twitter/图标/RSS/sitemap |
| 2 | `WebAnalytics` | **不是 React 岛**：纯 SSR 输出 `<script>`（DEV 或 `analytics.enable === false` 时返回 `null`） |
| 3 | `ThemeLoader` | `is:inline` 首屏主题脚本（防闪烁） |
| 4 | `AccentColorInjector` | `is:inline` 随机强调色 CSS 变量注入 |
| 5 | `PrintVersion` | `is:inline` 控制台版本横幅 |
| 6 | 两段 Umami `<script>`（硬编码） | `um.43322.cn` + `cloud.umami.is`（与 `WebAnalytics` 有重复，见 [10 §3](10-data-and-external-services.md#3-外部服务总清单)） |
| 7 | `fclite.css` / `fancybox.min.css` / `pagefind-ui.css` | **三个第三方样式放 head 全局加载**：Swup 不替换 head，避免切页后样式未加载 |

### 2.2 `<body>` 结构

```
body
├── .site-wallpaper            # 全局壁纸层（::before 图片 + ::after 可读性遮罩）
├── .site-grain                # 颗粒噪点层（hidden-mobile）
├── <slot />                   # 页面内容（Navbar / main / Footer）
├── <BackToTopFAB client:only="react" />
├── <ToastContainer client:only="react" />
├── <ModalStack client:only="react" />
├── <SearchModal />            # Pagefind 搜索模态框（body 级常驻）
└── 若干 is:inline <script>    # 见 §3 全部脚本清单
```

> `BackToTopFAB` / `ToastContainer` / `ModalStack` / `SearchModal` 全部挂在 **body 末尾**，因为它们必须在 Swup 切页时存活。

---

## 3. body 级常驻脚本清单（排障索引）

这些脚本按出现顺序位于 [`Layout.astro`](../../src/layouts/Layout.astro)，**全部**是 `is:inline`，
其中标 `data-swup-ignore-script` 的不会被 `SwupScriptsPlugin` 克隆重跑。

| # | 脚本 | 位置 | 目的 | 关键机制 / 幂等守卫 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Service Worker 注册 | [L61-75](../../src/layouts/Layout.astro#L61-L75) | 让随机壁纸跨刷新秒开 | 仅在 `https` / `localhost` / `127.0.0.1` 下注册；`data-swup-ignore-script`（只跑一次） |
| 2 | 随机壁纸 | [L76-122](../../src/layouts/Layout.astro#L76-L122) | 一次请求、多处复用 | `new Image()` + `decode()` → 写 `:root --random-bg-url` + `html.bg-ready`；失败静默保持纯色；`settled` 哨兵防重复；`data-swup-ignore-script` |
| 3 | Swup 清理广播 | [L132-138](../../src/layouts/Layout.astro#L132-L138) | 通知 React 岛释放资源 | 监听 `swup:content:replace` → `dispatchEvent(CustomEvent('mcy:island-cleanup'))` |
| 4 | 滚动降级 | [L139-159](../../src/layouts/Layout.astro#L139-L159) | 滚动时去掉毛玻璃 | rAF 节流 + `body.is-scrolling`，停止 `120ms` 后移除；`{ passive: true }` |
| 5 | 代码块复制 | [L160-184](../../src/layouts/Layout.astro#L160-L184) | 复制按钮（事件委托到 document） | 命中 `.copy-code` → 读 `.code-block pre` 的 `innerText` → `navigator.clipboard.writeText`，成功/失败各有文案回退 |
| 6 | 友圈页 boot | [L185-323](../../src/layouts/Layout.astro#L185-L323) | 驱动 `/links/fcircle` 与友链状态 | `window.UserConfig` 兜底；`ensureFclite()`（`data-fclite` 守卫 + 失败 1s 重试）；`ensureFcliteCss()`；`#links-summary.dataset.state === 'done'` 防重复拉取 `fc.43322.cn/link.json`；`swup:page:view` / `astro:page-load` 各延迟 150/700ms 重跑 |
| 7 | 评论驱动 | [L325-688](../../src/layouts/Layout.astro#L325-L688) | Twikoo / Waline 双引擎切换与懒加载 | localStorage key `mcy-comment-driver`；`window.__mcyCommentDriverBound` 只绑一次；详见 [10 §6](10-data-and-external-services.md#6-评论系统双引擎驱动twikoo--waline) |
| 8 | Fancybox UMD | [L696](../../src/layouts/Layout.astro#L696) | 灯箱运行时 | `data-swup-ignore-script` **必须**：否则每切页被克隆重定义，`openers` 清空导致灯箱失效 |
| 9 | Fancybox 初始化 + 实况照片 | [L700-1167](../../src/layouts/Layout.astro#L700-L1167) | 全站图片预览、`.pvt` / Motion Photo / 封面+视频 三形态实况播放 | `Carousel.contentReady` / `attachSlideEl` 钩子注入播放器；`.pvt` 零依赖 ZIP 解析；Motion Photo `MicroVideoOffset` 解析；移动端"长按 ≥300ms 抑制点击"；`close`/`destroy` 时 `stopAll()`；监听器全挂 document + `data-swup-ignore-script` |
| 10 | HeoLivePhoto 懒加载池 | [L1168-1266](../../src/layouts/Layout.astro#L1168-L1266) | 缩略图侧按需解包实况素材 | `IntersectionObserver`（`rootMargin: '0px'`，滚进视口才 scan）；并发上限 `MAX_CONCURRENT = 2`；`generation` token 让切页后旧队列作废；`HeoLivePhoto` 自身已打补丁去掉自动 scan |
| 11 | `SearchModal` | [L1268](../../src/layouts/Layout.astro#L1268) | Pagefind 搜索框 | body 级常驻单例，见 [06 § Navbar/SearchModal](06-components.md) |

### 3.1 三条施工规则（改动这些脚本时务必遵守）

1. **监听器挂 `document` / `window`，不要挂被 Swup 替换的 `main` 内节点**。
2. **加幂等守卫**：`window.__xxxBound`、`dataset.state`、`data-ready`、`generation`——
   Swup 会在每次切页重复派发 `swup:page:view` / `astro:page-load`（仓库惯用在两个事件上都挂，并加 `setTimeout(..., 150/200/700)` 兜底）。
3. **要不要 `data-swup-ignore-script`？**
   - 需要：脚本只该初始化一次（UMD 定义、监听器注册、SW 注册、壁纸）；
   - 不需要：脚本必须每次切页重跑（通常已在组件里的 `is:inline` 脚本，由 SwupScriptsPlugin 负责重跑）。
   加错会出现两类典型故障：**灯箱彻底失效**（重复 define）或 **监听器无限累加**。

---

## 4. Swup 集成细节

配置来自 [`astro.config.js`](../../astro.config.js#L57-L62)：

```js
swup({
  theme: false,                                    // 不引入 Swup 自带主题，动画全自主管理
  animationClass: 'swup-transition-',               // 动画类前缀
  containers: ['main'],                             // ★ 只替换 <main>
  morph: ['[component-export="Provider"]'],         // ★ Provider 走 DOM morph，保状态连续
})
```

由此推导出的全部结论（这也是本仓库大量"奇怪写法"的根源）：

| 结论 | 具体表现 |
| :--- | :--- |
| `<head>` 与 `<body>` 直接子节点不重建 | 第三方样式放 head、单例 UI 放 body |
| `main` 内 inline `<script>` 会被重跑 | 组件内脚本默认重跑；重跑有害的必须 `data-swup-ignore-script` |
| `main` 内 React 岛被丢弃但不会 unmount | 必须用 `useCleanupOnPageLeave` 主动清理 |
| `@swup/head-plugin` 会清理 head 中"下一页静态 HTML 里不存在"的元素 | Twikoo 运行时注入的 16 个 `<style>` 会被删 → 仓库把 `tk-`/`el-`/`OwO` 特征的 style 主动挪到 body |
| Waline 的 `<link>` 放 body 而非 head | 同上原因，避免切页出现 150~300ms 无样式窗口 |

动画与过渡类：

- 容器：`.swup-transition-fade`（PageLayout/MarkdownLayout 内包住 `<slot />`）；
- 离开：`html.is-animating` → `opacity 0` + `scale(0.965)` + `blur(3px)`，0.3s（低于 Swup 默认 400ms 超时，避免闪跳）；
- 进入：`html.is-changing` → 弹簧曲线 `cubic-bezier(0.34, 1.56, 0.64, 1)`；
- `prefers-reduced-motion` 时全部 `none`。

---

## 5. 两个页面级脚本（不在 Layout 内，但同类）

| 脚本 | 位置 | 说明 |
| :--- | :--- | :--- |
| 导航栏脚本 | [`Navbar.astro`](../../src/components/header/Navbar.astro) | `data-swup-ignore-script` + `window.__gyozaNavbarInit` 守卫；`AbortController` 在切页时 `abort()` 并重建监听，防"弹簧药丸"监听器累加 |
| 友圈页快速路径 | [`links/fcircle.astro`](../../src/pages/links/fcircle.astro) | 页内保留 `window.UserConfig` 赋值与 `<script src="/fclite/fclite.js">` 以并行下载；真正的初始化仍由 Layout 的 #6 脚本负责 |

---

## 6. 如何在浏览器里验证全局运行时

| 要验证的事 | 操作 | 期望 |
| :--- | :--- | :--- |
| Service Worker 生效 | DevTools → Application → Service Workers | 有 `sw.js`，状态 activated |
| 壁纸只请求一次 | Network 面板过滤 `webp.43322.cn`，切页几次 | 不因切页产生新请求（URL 写入 `:root` 变量后复用） |
| 清理协议生效 | 切页前后在 Console 数 `window.__xxx` 标记 | `__mcyCommentDriverBound` 等始终为 `true`，不重复绑定 |
| 滚动降级 | 滚动时看 `<body>` class | 出现/移除 `is-scrolling` |
| 评论驱动 | 切到另一篇文章 | 评论正常渲染；`localStorage['mcy-comment-driver']` 记住选择 |
| 灯箱 | 点文章图片 / 相册 | 打开灯箱，滑动/键盘可用；实况项播放视频 |
| 搜索 | 点导航搜索按钮（`pnpm preview` 下） | 面板打开、样式正常、Pagefind 出结果（DEV 下无索引属正常） |
