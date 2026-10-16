# 06 · 组件体系

`src/components/` 下共 40+ 个组件文件。本页给出**全量清单**（含类型、职责、关键 props、被谁引用），
再对**最复杂的 10 个组件**做实现级说明，最后是依赖拓扑与副作用索引。

---

## 1. 全量组件清单

### 1.1 `ai/`

| 文件 | 类型 | 职责 | 关键 props / 实现 |
| :--- | :--- | :--- | :--- |
| [`AiSummaryCard.astro`](../../src/components/ai/AiSummaryCard.astro) | Astro | 文章顶部 AI 摘要卡 | `slug`；读 [`src/data/ai-summaries.json`](../../src/data/ai-summaries.json)，无记录则**静默不渲染**；`from` 决定角标（AI / 兜底） |

### 1.2 `background/`

| 文件 | 类型 | 职责 | 关键 props / 实现 |
| :--- | :--- | :--- | :--- |
| [`ParticlesBg.tsx`](../../src/components/background/ParticlesBg.tsx) | React `client:visible` | Canvas 2D 粒子与连线背景（文章页） | `className` / `particleCount=40`；rAF 循环、`getComputedStyle` 读 `--color-accent` 转 RGB、DPR ≤ 2、`IntersectionObserver` 视口外停绘、`matchMedia(reduce-motion)` 与触屏设备直接跳过、鼠标斥力；用 `useCleanupOnPageLeave` 释放 |
| [`AuroraBackground.astro`](../../src/components/background/AuroraBackground.astro) | Astro | 极光渐变背景 | `showRadialGradient` / `className`；纯 CSS（3 层 radial-gradient + `mask-image` + `@keyframes aurora-flow` + `--aurora-duration`），reduce-motion 时禁用动画。**当前无任何引用（孤儿组件）** |

### 1.3 `comment/`

| 文件 | 类型 | 职责 | 关键实现 |
| :--- | :--- | :--- | :--- |
| [`Comments.astro`](../../src/components/comment/Comments.astro) | Astro | 评论区块骨架（含引擎切换器） | `#comment-block` → `.comment-driver[data-engine]` × 2 + `.driver-switch`（滑动高亮块）+ `.driver-loading`；`bare` 变体供 `/links/apply` 内嵌；样式 `is:global` |
| [`Twikoo.astro`](../../src/components/comment/Twikoo.astro) | Astro | Twikoo 占位容器 + 样式覆盖 | 外层壳 `[data-engine="twikoo"]`（Vue2 `$mount('#twikoo')` 会替换内层 `#twikoo`，所以显隐/`data-ready`/样式全部锁在外壳上）；大量 `!important` 压制运行时注入样式 |
| [`Waline.astro`](../../src/components/comment/Waline.astro) | Astro | Waline 占位容器 | `#waline.comment-driver[data-engine="waline"]` + `--waline-*` 主题变量覆盖，无脚本 |
| [`index.ts`](../../src/components/comment/index.ts) | TS | 统一导出 | `export { default as Comments } from './Comments.astro'` |

> **真正运行逻辑在 [`Layout.astro`](../../src/layouts/Layout.astro#L325-L688)**，不在这三个文件里。原因见 [05 §3](#3-body-级常驻脚本清单排障索引) 与 [10 §6](10-data-and-external-services.md#6-评论系统双引擎驱动twikoo--waline)。

### 1.4 `footer/`

| 文件 | 类型 | 职责 | 关键实现 |
| :--- | :--- | :--- | :--- |
| [`Footer.astro`](../../src/components/footer/Footer.astro) | Astro | 页脚：版权、备案、总字数、徽章 | `await getAllPostsWordCount()`；引用 `ThemeSwitch`、`RunningDays`（均 `client:only="react"`）、`SiteVisitors`、`Link` |
| [`Link.astro`](../../src/components/footer/Link.astro) | Astro | 链接封装 | `href` + 透传 `<a>` 属性；`http` 开头自动 `target="_blank"` + `rel` |
| [`SiteVisitors.astro`](../../src/components/footer/SiteVisitors.astro) | Astro | 全站累计曝光 | `is:inline`：Umami share API，`sessionStorage['mcy:total-visitors']` 按天缓存，失败回退缓存；`__siteVisitorsInit` 幂等；rAF 延迟启动 |
| [`RunningDays.tsx`](../../src/components/footer/RunningDays.tsx) | React `client:only` | 站点运行天数 | `useLayoutEffect` + `getDiffInDays(footer.startTime)` |
| [`ThemeSwitch.tsx`](../../src/components/footer/ThemeSwitch.tsx) | React `client:only` | 三态主题切换滑块 | Jotai `themeAtom`（`useAtom`）；滑块位置由 mode 映射驱动 |

### 1.5 `head/` 与 `head-gradient/`

| 文件 | 类型 | 职责 | 关键实现 |
| :--- | :--- | :--- | :--- |
| [`CommonHead.astro`](../../src/components/head/CommonHead.astro) | Astro | SEO / OG / Twitter / canonical / 图标 / RSS / sitemap | props `title` / `description` / `image` |
| [`ThemeLoader.astro`](../../src/components/head/ThemeLoader.astro) | Astro（`is:inline` 脚本） | 首屏主题，防闪烁 | 直接调 `utils/theme` 的三个函数；另有哀悼日 `.gray` |
| [`AccentColorInjector.astro`](../../src/components/head/AccentColorInjector.astro) | Astro（`is:inline` + `define:vars`） | 每页随机强调色（10 组色板） | 纯 JS hex→rgb 与插值（**替代 chroma-js**）；输出 `--color-accent` 等变量；`swup:content:replace` 重新注入 |
| [`WebAnalytics.tsx`](../../src/components/head/WebAnalytics.tsx) | React（**无 client 指令**，纯 SSR） | 输出 Umami / GA / Clarity `<script>` | `import.meta.env.DEV` 或 `analytics.enable=false` 时返回 `null` |
| [`PrintVersion.astro`](../../src/components/head/PrintVersion.astro) | Astro（`is:inline`） | 控制台版本横幅 | — |
| [`head/index.ts`](../../src/components/head/index.ts) | TS | 统一再导出上述组件 | 供 `Layout.astro` 一行导入 |
| [`HeadGradient.tsx`](../../src/components/head-gradient/HeadGradient.tsx) | React `client:idle` | 文章页顶部渐隐渐变 | Framer Motion 淡入；[`index.ts`](../../src/components/head-gradient/index.ts) 再导出 |

### 1.6 `header/`（见 [§2.1](#21-navbarastro最复杂组件)）

| 文件 | 类型 | 职责 |
| :--- | :--- | :--- |
| [`Navbar.astro`](../../src/components/header/Navbar.astro) | Astro（内含大段 `is:inline` 脚本与样式） | 双胶囊悬浮导航 + 二级下拉 + 移动抽屉 + 弹簧滑动药丸 + 搜索入口 |
| [`SearchModal.astro`](../../src/components/header/SearchModal.astro) | Astro（内含 `is:inline` 脚本） | Pagefind 搜索模态框（body 级常驻） |

### 1.7 `hero/`

| 文件 | 类型 | 职责 | 关键实现 |
| :--- | :--- | :--- | :--- |
| [`Hero.astro`](../../src/components/hero/Hero.astro) | Astro | 首页 Hero 区 | 读 `hero` / `author` / `site`；内嵌 `SocialList` |
| [`SocialList.tsx`](../../src/components/hero/SocialList.tsx) | React | 社交链接按钮 | `hero.socials`（含自定义 `color`）；`clsx` + Framer Motion |

### 1.8 `post/`

| 文件 | 类型 | 指令 | 职责 / 关键点 |
| :--- | :--- | :--- | :--- |
| [`PostList.astro`](../../src/components/post/PostList.astro) | Astro | — | 列表容器；`is:inline` 事件委托：`mousemove` 写 `--mouse-x/--mouse-y`（rAF 限流，`pointer:coarse` 跳过），点击注入 `.card-press` 弹簧；`__postListGlowBound` 守卫 |
| [`PostCard.astro`](../../src/components/post/PostCard.astro) | Astro | — | 单卡：封面/标题/摘要/分类/置顶；`await entry.render()` 取 `readingMinutes`；内嵌 `RelativeDate`(`client:idle`)、`ReadCount` |
| [`PostMetaInfo.astro`](../../src/components/post/PostMetaInfo.astro) | Astro | — | 日期/字数/阅读时长/阅读量行；内嵌 `RelativeDate`、`ReadCount` |
| [`PostArchiveInfo.astro`](../../src/components/post/PostArchiveInfo.astro) | Astro | — | 分类与标签链接（`slugify` → `/tags/...` `/categories/...`） |
| [`PostToc.tsx`](../../src/components/post/PostToc.tsx) | React | `client:idle` | 浮动目录；见 [§2.3](#23-posttoctsx目录) |
| [`PostPagination.astro`](../../src/components/post/PostPagination.astro) | Astro | — | 分页器；props `current` / `total` / `getPageUrl` |
| [`PostNav.astro`](../../src/components/post/PostNav.astro) | Astro | — | 上/下篇导航；props `prev` / `next` |
| [`PostCopyright.tsx`](../../src/components/post/PostCopyright.tsx) | React | `client:visible` | 版权块：`navigator.clipboard` 复制 + `toast.success`；挂载后才格式化时间（避免 hydration mismatch）；内嵌 `AnimatedSignature` |
| [`ReadCount.astro`](../../src/components/post/ReadCount.astro) | Astro | — | 单篇浏览量；见 [§2.4](#24-readcountastro--sitevisitorsastro统计读取) |
| [`RelativeDate.tsx`](../../src/components/post/RelativeDate.tsx) | React | `client:idle` | 首帧渲染绝对日期，`useEffect` 后替换为相对时间（防 mismatch） |
| [`ReadingProgress.tsx`](../../src/components/post/ReadingProgress.tsx) | React | `client:idle` | 阅读进度百分比；读 Jotai `pageScrollLocationAtom`，按 `#markdown-wrapper` 尺寸计算（`lodash-es/floor`） |
| [`Outdate.tsx`](../../src/components/post/Outdate.tsx) | React | `client:idle` | `getDiffInDays(lastMod) > 30` 时提示可能过时；Framer Motion `AnimatePresence` |
| [`ActionAside.tsx`](../../src/components/post/ActionAside.tsx) | React | `client:idle` | 分享/赞赏侧栏：二维码（`qrcode.react`）、Twitter 分享（`window.open`）、复制链接（`toast`）、微信赞赏图（`sponsor.wechat`）；用 `useModal` 打开弹窗 |
| [`CommentFAB.astro`](../../src/components/post/CommentFAB.astro) | Astro | — | 评论悬浮按钮：滚动过 100px 显现，点击平滑滚动到 `.comment-driver.is-active`；`__commentFabBound` 守卫 + `swup:page:view` 复检 |

### 1.9 `provider/`（详见 [07](07-react-islands-state.md)）

| 文件 | 职责 |
| :--- | :--- |
| [`Provider.tsx`](../../src/components/provider/Provider.tsx) | 组合 4 个副作用 Provider，全部返回 `null` |
| [`HeaderMetaInfoProvider.tsx`](../../src/components/provider/HeaderMetaInfoProvider.tsx) | 写入路径 / 标题 / 描述 / slug 到 `store/metaInfo` |
| [`PageScrollInfoProvider.tsx`](../../src/components/provider/PageScrollInfoProvider.tsx) | `lodash-es/throttle(16ms)` 监听 scroll，写 `store/scrollInfo` |
| [`ThemeProvider.tsx`](../../src/components/provider/ThemeProvider.tsx) | 同步主题 atom → DOM + localStorage，监听系统主题 |
| [`ViewportProvider.tsx`](../../src/components/provider/ViewportProvider.tsx) | `matchMedia('(min-width: 768px)')` → `isMobileAtom` |

### 1.10 `sidebar/`

| 文件 | 类型 | 职责 |
| :--- | :--- | :--- |
| [`ProfileCard.astro`](../../src/components/sidebar/ProfileCard.astro) | Astro | 头像 + 快捷导航 + 社交；读 `author` / `hero` |
| [`BgImageCard.astro`](../../src/components/sidebar/BgImageCard.astro) | Astro | 随机插画卡；与 `.site-wallpaper` 共用 `--random-bg-url` |
| [`SiteInfoCard.astro`](../../src/components/sidebar/SiteInfoCard.astro) | Astro | 站点信息（版本读 `package.json` + `process.version`）；`is:inline` 脚本实现"收起/展开" |
| [`GreetingClock.tsx`](../../src/components/sidebar/GreetingClock.tsx) | React `client:load` | 问候语时钟；首帧 `null` 占位 + mount 后 `setInterval(1s)`（防 hydration mismatch #418/#423/#425） |
| [`YiyanCard.astro`](../../src/components/sidebar/YiyanCard.astro) | Astro | "今日一言"（`hero.yiyan`），纯静态 |

### 1.11 `ui/modal/`（详见 [07 §5](07-react-islands-state.md#5-modal-栈)）

| 文件 | 职责 |
| :--- | :--- |
| [`ModalStack.tsx`](../../src/components/ui/modal/ModalStack.tsx) | 读 `modalStackAtom`，用 `AnimatePresence` 渲染栈内全部弹窗 |
| [`Modal.tsx`](../../src/components/ui/modal/Modal.tsx) | 单个弹窗：`@radix-ui/react-dialog` + Framer Motion；z-index 按栈内 index 递增；点遮罩关闭 |
| [`context.ts`](../../src/components/ui/modal/context.ts) | `CurrentModalContext`（提供 `dismiss`） |
| [`hooks.ts`](../../src/components/ui/modal/hooks.ts) | `useModal()`（`useId` + ref 生成 id 入栈/出栈）、`useCurrentModal()` |
| [`index.ts`](../../src/components/ui/modal/index.ts) | 再导出 hooks 与 `ModalStack` |

### 1.12 根级通用组件

| 文件 | 类型 | 指令 / 引用位置 | 职责 |
| :--- | :--- | :--- | :--- |
| [`RootPortal.tsx`](../../src/components/RootPortal.tsx) | React | **无引用（孤儿）** | `createPortal(children, document.body)` |
| [`Flashlight.tsx`](../../src/components/Flashlight.tsx) | React | `client:only` @ [404.astro](../../src/pages/404.astro#L17) | 鼠标探照灯；`useLayoutEffect` 绑 document mousemove；`matchMedia('(hover:hover)')` 为假直接返回 `null` |
| [`BackToTopFAB.tsx`](../../src/components/BackToTopFAB.tsx) | React | `client:only` @ [Layout.astro](../../src/layouts/Layout.astro#L126) | 滚动 > 100px 显示；读 `pageScrollLocationAtom`；Framer Motion |
| [`ToastContainer.tsx`](../../src/components/ToastContainer.tsx) | React | `client:only` @ [Layout.astro](../../src/layouts/Layout.astro#L127) | 全局 toast（`react-toastify`）+ 自定义 CloseButton |
| [`AnimatedSignature.tsx`](../../src/components/AnimatedSignature.tsx) | React | 随 `PostCopyright` 渲染 | `signature.svg?raw` + `dangerouslySetInnerHTML` |
| [`MarkdownWrapper.astro`](../../src/components/MarkdownWrapper.astro) | Astro | 文章/Markdown 页 | `id="markdown-wrapper"` —— **`ReadingProgress` 依赖它的尺寸** |
| [`Highlight.astro`](../../src/components/Highlight.astro) | Astro | 各页标题 | 斜底高亮（纯 CSS） |
| [`SectionBlock.astro`](../../src/components/SectionBlock.astro) | Astro | 文章页/相册页 | 带标题的区块容器 |
| [`Timeline.astro`](../../src/components/Timeline.astro) | Astro | 归档/标签/分类页 | 按年份分组的时间线；`getShortDate` |
| [`TimelineProgress.tsx`](../../src/components/TimelineProgress.tsx) | React | `client:load` @ [archives.astro](../../src/pages/archives.astro#L19) | 年度/当日进度；`setInterval(1s)`；Framer Motion `animate` 做数字滚动；`useCleanupOnPageLeave` |
| [`TagList.astro`](../../src/components/TagList.astro) | Astro | `/tags` | 标签胶囊；props `tags: {name,slug,count}[]` |
| [`CategoryList.astro`](../../src/components/CategoryList.astro) | Astro | 分类相关页 | 分类列表；props `categories[]` |
| [`ToolList.astro`](../../src/components/ToolList.astro) | Astro | `/tools` | 工具清单；读 [`data/tools.ts`](../../src/data/tools.ts)，含空态 |
| [`ProjectList.astro`](../../src/components/ProjectList.astro) | Astro | `/projects` | 项目卡网格；读 [`data/projects.ts`](../../src/data/projects.ts)；`onerror="this.remove()"` 处理坏图 |
| [`LinkCard.astro`](../../src/components/LinkCard.astro) | Astro | **无实际引用**（仅在 `content/posts/astro-gyoza/index.md` 的示例代码块中被提及） | 友链卡；props `title` / `url` / `desc?` / `image?` |

---

## 2. 关键组件实现详解

### 2.1 `Navbar.astro`（最复杂组件）

**DOM 分区**

```
header#site-navbar.navbar
└── .navbar__filter → .navbar__layout（限宽 950px，≥1280px 变 1100px）
    └── #navbar-wrap.navbar__wrap（flex, space-between）
        ├── .navbar__float.navbar__float-left      ← Logo 胶囊（圆角 16px）
        └── nav#nav-menu.navbar__float.navbar__float-right
            └── ul.navbar__menu[data-glide-track]
                ├── li.glide-pill[data-glide-pill]        ← 滑动药丸指示器
                ├── a.navbar__link[data-glide-item] / button.navbar__trigger   ← 一级项
                ├── ul.navbar__dropdown[data-glide-track] ← 二级下拉（胶囊玻璃）
                └── #search-btn、#menu-btn.navbar__burger
#navbar-drawer.navbar__drawer   ← 移动端抽屉（header 之外）
```

**菜单数据来源（重要更正）**：菜单**不是**来自 `config.json.menus`，而是在该组件 frontmatter 内硬编码的 `NAV_LINKS: NavItem[]`
（`NavLink | NavGroup`，共 5 组：导航 / 整理 / 相册 / 友人 / 关于）。
激活判定：外链永不高亮；`/` 精确匹配；其余 `path === href || path.startsWith(href + '/')`；分组有任一子项命中即算激活。

**弹簧物理滑动药丸（核心机制，非 CSS transition）**

| 常量 | 值 | 含义 |
| :--- | :--- | :--- |
| `STIFFNESS` | `7000` | 弹簧刚度 |
| `DAMPING` | `96` | 阻尼系数 |
| `TOL_POS` | `0.1` px | 位置收敛容差 |
| `TOL_VEL` | `0.6` | 速度收敛容差 |
| `HIDDEN_SCALE` | `0.92` | 隐藏态缩放 |
| `MIN_FRAME` | `0.002` s | `dt` 下限（上限 `1/30`） |

逐帧积分（每个 `[data-glide-track]` 各持一份 state，四个轴 centerX / centerY / width / height 各自独立）：

```
velocity += (target - value) * k * dt
velocity *= exp(-damping * dt)
value    += velocity * dt
```

收敛条件：`|target - value| < TOL_POS && |velocity| < TOL_VEL`，全轴收敛即吸附归零并停止 rAF。
`render()` 写 `translate3d + width + height`，并按速度方向加 `lead = min(|v| * MIN_FRAME, 10)` 模拟拖尾。
监听器（`pointerover` / `pointerleave` / `focusin` / `focusout` / `resize` / `scroll`）经 **`AbortController`** 绑定，
切页时 `ac.abort()` 后重建——这正是防止"监听器累加"的手段。
启动条件：`(hover: hover) and (pointer: fine)` 且非 `prefers-reduced-motion`，通过 `requestIdleCallback` 惰性启动；
reduce-motion 时改为瞬移（`aim(..., instant)`）。

**滚动玻璃态**

- 阈值 `THRESHOLD = 15`：`window.scrollY > 15` 给 `#site-navbar` 加 `.is-scrolled`（rAF 节流）；
- 触发点：初始化 / `scroll`(passive) / `load` / `pageshow` / `swup:page:view` / `astro:page-load`；
- `.is-scrolled` 效果：header 由 `absolute` 转 `fixed` 且 `pointer-events: none`（空白区穿透），两个胶囊恢复 `pointer-events: auto`、加边框与投影、整体 `translateY(.35rem)`，`::before` 玻璃层 opacity 0→1；
- 与 `body.is-scrolling`（[05 §3](#3-body-级常驻脚本清单排障索引) #4）**互不依赖**：前者管"玻璃出现"，后者管"滚动时临时关掉 backdrop-filter"。

**二级下拉**：纯 CSS，`.navbar__item:hover > .navbar__dropdown, :focus-within` 切换 opacity/visibility/transform；
胶囊形（`border-radius: 999px` + `backdrop-filter: blur(12px)`）；`::before` 造 0.5rem 透明"悬浮桥"，避免鼠标移出即消失；下拉内同样内嵌 `glide-pill`。

**移动端抽屉（`< 1024px`）**

- 隐藏横向菜单、显示汉堡；抽屉 `#navbar-drawer` 为 `fixed` 全宽毛玻璃；
- `setDrawer` 切换 `.is-open` / `aria-hidden` / `aria-expanded` / `aria-label`（打开菜单/关闭菜单）及 header 的 `.is-drawer-open`；
- 关闭路径：点面板外 / `Esc` / 点抽屉内链接 / `swup:page:view`；
- 分组用**原生** `<details class="navbar__drawer-group" open={isGroupActive(...)}>`（服务端渲染即自动展开当前分组）+ `<summary>` + chevron（`[open]` 时 `rotate(180deg)`，子项播 `navbar-drawer-sub-in`）——零 JS 折叠。

**幂等与无障碍**：脚本 `data-swup-ignore-script` + `window.__gyozaNavbarInit`；
`nav[aria-label]`、按钮 `aria-label`、trigger 的 `aria-haspopup` / `aria-expanded`、`:focus-visible` 描边、
当前页用**波浪下划线**（不只靠颜色）、药丸同时由 `focusin/focusout` 驱动。

### 2.2 `SearchModal.astro`

- 挂载点：`Layout.astro` body 末尾（Swup 不替换 → 单例，切页无需重初始化）；
- 打开：点 `#search-btn`（在 header 内，只绑一次）→ 加 `.is-open`、`aria-hidden=false`、`body.overflow=hidden`、`ensureInit()`；
- 关闭：`Esc` / 点遮罩 `[data-search-close]`；**没有全局快捷键**（无 `Cmd+K` / `/`）；
- Pagefind 懒加载：`initialized` 标志保证只注入一次 `/pagefind/pagefind-ui.js`（UMD），onload 后
  `new PagefindUI({ element: '#search', showSubResults: true, showImages: false, autofocus: true })`；
  索引缺失时静默降级，不报错；
- 样式：`/pagefind/pagefind-ui.css` 在 head 全局引入（[05 §2.1](#21-head-注入顺序) 第 7 项），
  并把 `--pagefind-ui-*` 映射到站内变量，使搜索框跟随随机强调色与明暗主题；
- 无障碍：面板 `role="dialog" aria-modal="true" aria-label`。

### 2.3 `PostToc.tsx`（目录）

- props：`headings`（来自 `post.render()` 的 `headings`）；
- 高亮：`useActiveItem` 用 `IntersectionObserver`（`rootMargin: '-80px'`）监听标题；
  命中变化用 React `startTransition` 更新，避免阻塞滚动；
- 指示器：Framer Motion 的 `layoutId` 实现"波浪滑动条"；
- 点击项 → `scrollIntoView` 平滑滚动并同步高亮；
- 清理：`useCleanupOnPageLeave` 断开 observer（Swup 切页时 React 不会 unmount）；
- 只在 `lg` 以上显示（外层容器 `hidden lg:block`，且带 `data-pagefind-ignore`）。

### 2.4 `ReadCount.astro` / `SiteVisitors.astro`（统计读取）

两者思路一致：**用 Umami 的 share API 纯读取，不产生写入副作用**（替代 Twikoo 的 `COUNTER_GET`，后者读取即自增、且多篇文章共享同一 doc）。

| 组件 | 接口 | 缓存 | 刷新时机 | 幂等守卫 |
| :--- | :--- | :--- | :--- | :--- |
| `ReadCount.astro` | Umami `metrics?type=path`（**全量拉取一次**建 `path → pv` 映射） | `sessionStorage['mcy:umami-pageviews']` 按天 | `swup:content:replaced` / `astro:page-load` / `popstate` 重扫并更新所有 `.read-count[data-path]` | `__umamiReadCountInit` |
| `SiteVisitors.astro` | Umami share API（全站曝光） | `sessionStorage['mcy:total-visitors']` 按天 | 首屏一次（rAF 延迟启动） | `__siteVisitorsInit` |

细节：`ReadCount` 用 `normalizePath` 归并"尾斜杠不同但实际同页"的 PV；失败时回退缓存值；初始渲染 `--` 占位。

### 2.5 `ActionAside.tsx` + Modal 栈

```tsx
import { useModal } from '@/components/ui/modal'   // 内部用 useId + jotai modalStackAtom
const { open } = useModal()
// open() → 往栈里 push 一个 { id, content }；ModalStack 用 AnimatePresence 渲染
```

- 分享：复制链接（`navigator.clipboard` + `toast`）、Twitter（`window.open`）、二维码（`qrcode.react` 的 `QRCodeSVG`）；
- 赞赏：读 `sponsor.wechat` 显示微信收款码；
- 样式：`motion` 过渡 + `clsx`；
- 数据来源：Jotai `metaSlugAtom` / `metaTitleAtom`（由 `Provider` 写入）——这也是 `Provider` 必须存在于页面上的原因。

### 2.6 `ParticlesBg.tsx`（文章页粒子）

- 只在 `client:visible` 时初始化；`IntersectionObserver` 视口外**停止绘制**（仍保留 rAF 结构）；
- `getComputedStyle(document.documentElement)` 读 `--color-accent` → 转 RGB → 粒子与连线色跟随每页随机强调色；
- `devicePixelRatio` 上限 2；`matchMedia('(prefers-reduced-motion: reduce)')` 或触屏设备**直接跳过初始化**；
- 鼠标斥力：粒子受指针排斥；
- 释放：`useCleanupOnPageLeave` 取消 rAF + 移除监听。

### 2.7 三个"防 hydration mismatch"组件

| 组件 | 策略 |
| :--- | :--- |
| [`GreetingClock.tsx`](../../src/components/sidebar/GreetingClock.tsx) | 首帧 `useState(null)` 占位，`useEffect` 后挂 `setInterval(1s)`；注释明确提到 React error #418/#423/#425 |
| [`RelativeDate.tsx`](../../src/components/post/RelativeDate.tsx) | 首帧输出 `getFormattedDateWithOptionalTime`（绝对日期），`useEffect` 后替换为 `getRelativeTime` |
| [`PostCopyright.tsx`](../../src/components/post/PostCopyright.tsx) | 挂载后再写 `lastModStr` |

共性原因：这些内容依赖"当前时间/时区"，服务端渲染结果与客户端首帧必然不同，直接渲染会触发 hydration 告警。

---

## 3. 依赖拓扑

```
Layout.astro（根）
├─ head/: CommonHead · WebAnalytics · ThemeLoader · AccentColorInjector · PrintVersion
└─ body 级: BackToTopFAB(client:only) · ToastContainer(client:only) · ModalStack(client:only) · SearchModal
      └─ ModalStack → Modal → ui/modal/context

PageLayout.astro
├─ Provider(client:only) → 4 个 Provider
├─ Navbar.astro
├─ <main> → swup-transition-fade → slot
└─ Footer.astro → ThemeSwitch(client:only) · RunningDays(client:only) · SiteVisitors · Link

MarkdownLayout.astro（含 PageLayout 全部）
├─ HeadGradient(client:idle)
├─ CommentFAB
└─ ParticlesBg(client:visible)

[...page].astro（首页/分页）
├─ Hero.astro → SocialList.tsx
├─ PostList.astro → PostCard.astro → RelativeDate(client:idle) + ReadCount
├─ PostPagination.astro
└─ aside: ProfileCard · YiyanCard · GreetingClock(client:load) · BgImageCard · SiteInfoCard

[year]/[month]/[day]/[slug].astro（文章页）
├─ PostMetaInfo.astro → RelativeDate(client:idle) + ReadCount
├─ PostArchiveInfo.astro
├─ Outdate(client:idle)
├─ AiSummaryCard.astro
├─ MarkdownWrapper.astro → <Content />
├─ PostToc(client:idle) · ReadingProgress(client:idle) · ActionAside(client:idle)
└─ PostCopyright(client:visible) → AnimatedSignature · PostNav.astro · Comments（→ Twikoo/Waline 容器）

[spec].astro
├─ PageLayout 分支: Highlight · ProjectList / ToolList · MarkdownWrapper · Comments
└─ MarkdownLayout 分支: 同文章页的目录/进度部分

archives.astro        → Highlight · TimelineProgress(client:load) · Timeline
tags/index.astro      → Highlight · TagList
tags/[tag].astro      → Highlight · Timeline
categories/index.astro→ Highlight
categories/[cat].astro→ Highlight · Timeline
galleries/index.astro → SectionBlock
galleries/[slug].astro→ 自定义瀑布流 + Fancybox 数据属性
links/index.astro     → data/links.ts（纯 Astro 渲染）
links/apply.astro     → Comments（bare）
404.astro             → Flashlight(client:only)
```

**孤儿 / 低使用度组件**（删除或复用前请确认）：

| 组件 | 状态 |
| :--- | :--- |
| [`AuroraBackground.astro`](../../src/components/background/AuroraBackground.astro) | 无任何引用 |
| [`RootPortal.tsx`](../../src/components/RootPortal.tsx) | 无任何引用（Modal 栈自己处理 portal） |
| [`LinkCard.astro`](../../src/components/LinkCard.astro) | 无任何引用（仅作为示例写入 `content/posts/astro-gyoza/index.md` 的代码块，仓库内无 `.mdx` 文件实际导入它） |

---

## 4. 副作用索引（按浏览器 API 分组）

| API | 使用组件 |
| :--- | :--- |
| `IntersectionObserver` | `ParticlesBg`、`PostToc`、Layout 的实况照片懒加载池 |
| `requestAnimationFrame` | `ParticlesBg`、`PostList`（鼠标高光）、`CommentFAB`、`SiteVisitors`、`ReadCount`、Layout 的滚动降级 |
| `setInterval` | `GreetingClock`（1s）、`TimelineProgress`（1s） |
| `localStorage` | `ThemeLoader` / `ThemeSwitch`（key `gyoza-theme`）、Layout 评论驱动（key `mcy-comment-driver`） |
| `sessionStorage` | `SiteVisitors`（`mcy:total-visitors`）、`ReadCount`（`mcy:umami-pageviews`），均按天缓存 |
| `fetch` | `SiteVisitors` / `ReadCount`（Umami）、Layout（`fc.43322.cn/link.json`、Fancybox 的 `.pvt` / Motion Photo 解包） |
| `matchMedia` | `ParticlesBg`（reduce-motion、触屏）、`Flashlight`（`hover:hover`）、`PostList`（`pointer:coarse`）、`ThemeProvider`、`ViewportProvider` |
| Service Worker | Layout 注册 `public/sw.js`（壁纸缓存） |
| `navigator.clipboard` | Layout 代码复制委托、`PostCopyright`、`ActionAside` |
| Canvas 2D | `ParticlesBg` |
| `createPortal` | `ui/modal/Modal`（`RootPortal` 未使用） |

> 所有"需要跨切页存活"的副作用都必须挂 `document` / `window`，并在卸载时用 `useCleanupOnPageLeave` 或 `AbortController` 释放。
