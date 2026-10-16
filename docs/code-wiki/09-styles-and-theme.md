# 09 · 样式与主题体系

> 本文说明：**颜色从哪来、如何随主题切换、Tailwind 如何映射到这套变量、动效和性能降级分别写在哪**。
> 相关文件：[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css)、[markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css)、[shiki.css](file:///Users/qinchao/Music/my-blog/src/styles/shiki.css)、[swup.css](file:///Users/qinchao/Music/my-blog/src/styles/swup.css)、[signature.css](file:///Users/qinchao/Music/my-blog/src/styles/signature.css)、[iconfont.css](file:///Users/qinchao/Music/my-blog/src/styles/iconfont.css)、[tailwind.config.ts](file:///Users/qinchao/Music/my-blog/tailwind.config.ts)、[AccentColorInjector.astro](file:///Users/qinchao/Music/my-blog/src/components/head/AccentColorInjector.astro)、[ThemeLoader.astro](file:///Users/qinchao/Music/my-blog/src/components/head/ThemeLoader.astro)

---

## 1. 设计核心：三层颜色来源，最后收敛为 CSS 变量

这套站点**没有**在源码里硬编码任何主题色。所有颜色都来自 CSS 变量，而变量值由三段拼接而成：

```
① config.json 的 color 段（10 组 accent 双色 + bg/text/border 各 light/dark）
        │
        │  AccentColorInjector.astro（HTML 内联脚本，定义于 <head>，解析期同步执行）
        ▼
② :root / [data-theme='dark'] 上的 CSS 变量
        │
        │  Tailwind 配置把语义名映射到变量
        ▼
③ 组件里写 theme('colors.accent') / rgb(var(--color-accent) / <alpha-value>)
        │
        │  ThemeLoader.astro 在 <html> 上设 data-theme
        ▼
④ 明暗切换 → 变量另一组取值生效，全站即时变色（无需重渲染）
```

**为什么走变量而不是类**：Swup 只替换 `<main>`，若颜色靠 body 级 class 切换，换页后 class 会保留但 main 内新 DOM 可能已丢失上下文；而 CSS 变量挂在 `document.documentElement` 上，**永远不被 Swup 触碰**，天然全局稳定。

---

## 2. 随机强调色：AccentColorInjector

[AccentColorInjector.astro](file:///Users/qinchao/Music/my-blog/src/components/head/AccentColorInjector.astro) 是整个主题体系里最"重"的一环。

### 2.1 它做什么

每次整页加载（以及 Swup 换页时，见 §2.4）**随机挑一组** `config.json.color.accent`，同时向 `<html>` 注入 7 个变量 **两套取值**（亮/暗）：

| 变量 | 来源 | 备注 |
|---|---|---|
| `--color-accent` | `accent[i].light` / `.dark` | 随机选中的那一组，两个主题各取各的 |
| `--color-bg-root` | **不是直接取值**，而是 `mix(RGB_BASE, accent, t)` 算出的混色 | 见下 |
| `--color-bg-primary` | `color.bg.primary.light/.dark` | |
| `--color-bg-secondary` | `color.bg.secondary.light/.dark` | |
| `--color-text-primary` | `color.text.primary.light/.dark` | |
| `--color-text-secondary` | `color.text.secondary.light/.dark` | |
| `--color-border-primary` | `color.border.primary.light/.dark` | |

`--color-bg-root` 的算法（与旧版 `chroma.mix` 行为一致）：

```js
var ROOT_BASE_LIGHT = [242,245,236]   // 浅绿底
var ROOT_BASE_DARK  = [0,2,18]        // 深蓝黑底
rootLight = mixRgb(ROOT_BASE_LIGHT, accentLight, 0.05)   // 只掺 5%
rootDark  = mixRgb(ROOT_BASE_DARK,  accentDark,  0.12)   // 掺 12%
```

**含义**：整站最外层的 `html` 背景不是纯色，而是**带一点点当前强调色倾向的底**。亮色下几乎看不出（5%），暗色下略明显（12%）。这样切换强调色时，整体氛围会微微跟着变，而不是只有按钮变色。

### 2.2 为什么写成内联脚本（重要历史决策）

文件顶部注释记录了一次重构动因：

> 原实现为**打包脚本**，与 Vercel Analytics 等共享同一模块；该共享模块在模块作用域执行 `customElements.define(...)`，任一环节出错会导致整个模块失效、注入器被"连坐"，随机色完全消失。
> 现改为 **HTML 内联脚本**：HTML 解析期同步执行、零模块依赖、不受任何打包影响。

配套决策：**去掉 `chroma-js`，改用 20 行纯 JS（`hexToRgb` / `mixRgb` / `rgbStr`）**。这是"减少依赖 + 消除模块耦合"的同一策略 —— 现在 `chroma-js` 仍是 package.json 里的依赖，但**已无任何消费方**（见 [12-config-reference.md](./12-config-reference.md)）。

关键属性：
- `is:inline` + `define:vars` → 配置数据由 Astro 在构建期序列化进脚本，**无额外请求、无模块加载**。
- `define:vars` 会把变量注入为脚本内常量，因此脚本内**不能**再写 `import`。

### 2.3 防"蓝闪/白闪"的时序保证

因为脚本在 `<head>` 中**同步执行**（HTML 解析到就执行，不 defer），变量在**首帧渲染前**就已写入。所以页面从第一帧起就是正确颜色 —— 不存在"先亮后暗"的闪烁。这也是它必须是内联（而非外部模块）的第二个理由。

同一 `<head>` 中还有 [ThemeLoader.astro](file:///Users/qinchao/Music/my-blog/src/components/head/ThemeLoader.astro)，负责给 `<html>` 打 `data-theme`，同样解析期同步执行：

```js
const localTheme = getLocalTheme()          // localStorage 'gyoza-theme'，非法值回落 'system'
const systemTheme = getSystemTheme()        // matchMedia('(prefers-color-scheme: dark)')
changePageTheme(localTheme === 'system' ? systemTheme : localTheme)
document.documentElement.classList.add('gray')   // 哀悼日
```

**注入顺序不能改**：`CommonHead → WebAnalytics → ThemeLoader → AccentColorInjector → PrintVersion`（[Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L30-L35)）。`ThemeLoader` 先定 `data-theme`，注入器随后写入的变量才会被正确的那组选择器命中。

### 2.4 Swup 换页时**重新随机**强调色

```js
inject()
document.addEventListener('swup:content:replace', inject)   // ← 换页再随机一次
```

- 监听的是 **`document`**（而非 `main`），因为 Swup 会替换 main、但不重建 document —— 挂在 document 上的监听器是持久的（这正是 [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md) 里"监听器必须挂 document"规则的一个实例）。
- 每次 `inject()` 都会 **append 一个新的 `<style>`**，而旧 `<style>` 不会被移除。**这是本仓库一个既有现象**：连续浏览 N 页后 head 中会累积 N 个 style 标签。因为 `<html>` 上的变量是**后声明者覆盖前者**（同名 `html{…}` 规则以最后一个为准），所以视觉结果始终"正确"且最新 —— 代价是 DOM 中存在冗余节点（无功能故障，属可优化项）。

### 2.5 哀悼日

```js
const MOURNING_DAYS = ['4-4','5-12','7-7','9-18','12-13']
```

命中即给 `<html>` 加 `.gray`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L39-L41)）：

```css
html.gray { filter: grayscale(1); }
```

用**整页 filter** 而不是逐元素调色 —— 一行覆盖全站，避免遗漏。副作用：`filter` 会创建新的包含块，对 `position: fixed` 元素（如导航栏）在部分浏览器上会产生定位基准变化，属可接受范围。

注意 [ThemeLoader.astro](file:///Users/qinchao/Music/my-blog/src/components/head/ThemeLoader.astro#L28) 中的 `swup:content:replace` 监听**被注释掉了** —— 即**换页不再重跑 theme/gray 判定**。这是刻意的：`data-theme` 与 `.gray` 都在 `<html>` 上，Swup 不替换 html，无需重跑；且重启时重新读 localStorage 反而可能引入与用户当前状态不一致的跳变。

---

## 3. Tailwind 映射层

[tailwind.config.ts](file:///Users/qinchao/Music/my-blog/tailwind.config.ts) 是变量与工具类之间的唯一桥梁。**它不定义任何具体颜色**，只做语义映射：

```ts
darkMode: ['selector', '[data-theme="dark"]'],     // ← 关键：暗色模式的判定依据
theme.extend = {
  colors:      { accent: 'rgb(var(--color-accent) / <alpha-value>)' },
  textColor:   { primary: 'rgb(var(--color-text-primary))',
                 secondary: 'rgb(var(--color-text-secondary))' },
  backgroundColor: { root: 'rgb(var(--color-bg-root))',
                     primary: 'rgb(var(--color-bg-primary))',
                     secondary: 'rgb(var(--color-bg-secondary))' },
  borderColor: { primary: 'rgb(var(--color-border-primary))' },
  minHeight:   { main: 'calc(100vh - 200px)' },
  transitionProperty: { 'bg-color': 'background-color' },
  zIndex:      { '1': '1' },
  keyframes:  { aurora: { from: { backgroundPosition: '50% 50%, 50% 50%' },
                          to:   { backgroundPosition: '350% 50%, 350% 50%' } } },
  animation:  { aurora: 'aurora 60s linear infinite' },
}
```

要点逐条：

1. **`darkMode: ['selector', '[data-theme="dark"]']`** —— Tailwind 的 `dark:` 变体不再跟随系统 `prefers-color-scheme`，**而是跟随 `data-theme` 属性**。这正是 ThemeLoader 打属性、而非加 class 的原因；两者必须配对。`dark:` 写法的类会在暗色主题下生效。
2. **`<alpha-value>` 只出现在 `accent`** —— 因为 `--color-accent` 存的是**空格分隔的 RGB 三元值**（`"245 85 85"`），Tailwind 可把 `<alpha-value>` 替换为透明度并拼成 `rgb(245 85 85 / 0.5)`。这使 `bg-accent/20`、`text-accent/60` 等透明度工具类可用。
   - 其余变量（`--color-bg-primary` 等）**没有** `<alpha-value>`，因此 `bg-primary/50` 这类写法**不可用**。需要半透明时改用 `rgb(from var(--color-x) r g b / 0.5)`（见 §5 的现代语法）。
3. **`theme()` vs `rgb(from …)` 两种取色写法并存**：
   - `theme('colors.accent')` / `theme('backgroundColor.root')` —— Tailwind 编译期求值，**能拿到 `<alpha-value>`**，但只能用于 `theme.extend` 里声明过的键（global.css 里的 `::selection`、`html`、`.spoiler:hover` 就是这种用法）。
   - `rgb(from var(--color-accent, 245 85 85) r g b / 0.15)` —— **相对颜色语法（CSS Color 5）**，运行时求值，支持任意透明度且能带 fallback 值。global.css 中大量 `cloud-badge` / `glow-border` 都用这种写法。
   - ⚠️ 相对颜色语法需要较新的浏览器（Safari 16.4+ / Chrome 119+），老浏览器会**整条 `background` 声明失效**（不是退化到无色）。因此关键处都带了 fallback 默认值 `var(--color-accent, 245 85 85)`。
4. **自定义 `keyframes.aurora` + `animation.aurora`** —— 供 `ParticlesBg` / 极光背景类效果使用（60s 线性循环的关键帧动画）。
5. **`minHeight.main: calc(100vh - 200px)`** —— 保证主内容区在内容很少时也把 footer 顶下去，避免短页面 footer 上浮。

CSS 入口：[Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L17) 只有一处 `import '@/styles/global.css'`；Tailwind 的 `@tailwind` 三条指令由 `@astrojs/tailwind` 集成在构建期注入，**源码 global.css 中看不到这三行**（这是初次读源码时最容易困惑的地方）。

---

## 4. 六个样式文件的分工

| 文件 | 规模量级 | 职责 | 是否被 global.css 汇总导入 |
|---|---|---|---|
| [global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css) | ~673 行 | 入口；`@import` 其余样式；字体 face；`::selection`；玻璃卡片令牌；随机壁纸背景层；云徽章/描边发光/噪点；滚动降级；首页三栏栅格 | 入口本身 |
| [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css) | ~647 行 | 正文（`.markdown` 前缀）全部排版：代码块外壳、标题锚点、表格、图注、spoiler、iframe | ✅ |
| [shiki.css](file:///Users/qinchao/Music/my-blog/src/styles/shiki.css) | — | Shiki 双主题变量在 `data-theme` 下的切换 | ✅ |
| [swup.css](file:///Users/qinchao/Music/my-blog/src/styles/swup.css) | 34 行 | 页面切换弹簧过渡（含 reduced-motion 降级） | ✅ |
| [signature.css](file:///Users/qinchao/Music/my-blog/src/styles/signature.css) | — | 签名/手写体相关 | ✅ |
| [iconfont.css](file:///Users/qinchao/Music/my-blog/src/styles/iconfont.css) | — | 图标字体（`icon-*` 类，Markdown 插件生成的图标依赖它） | ✅ |

**导入顺序即层叠顺序**（global.css 第 1~5 行）：`iconfont → shiki → markdown → signature → swup`，之后才是 global.css 自身的规则。⚠️ 这个顺序导致**global.css 自身的规则总是覆盖前面五个文件** —— 这正是 §7 中 `.spoiler` 双重定义问题的成因。修改样式时若发现"改了 markdown.css 不生效"，先查是否被 global.css 的后置规则覆盖。

---

## 5. 玻璃卡片令牌体系

`global.css` 用一组 `--card-glass-*` 令牌统一了"毛玻璃卡片"外观，`:root` 与 `html[data-theme='dark']` 各给一套值（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L258-L289)）：

| 令牌 | 亮色 | 暗色 | 用途 |
|---|---|---|---|
| `--card-glass-bg` | `rgb(from var(--color-bg-primary) r g b / 0.45)` | `… / 0.18` | 卡片底；暗色更透 |
| `--card-glass-border` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.06)` | 描边 |
| `--card-glass-shadow` | 淡阴影 | 深阴影 | 静态投影 |
| `--card-glass-hover-shadow` | 三层（描边+大投影+accent 微光） | 四层（多一层 accent 外扩） | hover 状态 |
| `--card-glass-hover-translate` | `-6px` | `-6px` | hover 上浮距离 |
| `--card-glass-radius` | `18px` | `18px` | 圆角 |
| `--post-card-border` | `rgba(48,92,220,.45)`（深蓝） | `rgba(78,134,255,.45)` | 首页文章卡片专用 |

设计取向：**亮色下卡片是"半透白纸"，暗色下卡片是"薄雾玻璃"**。`--card-glass-bg` 从 `--color-bg-primary` 派生，因此**强调色/背景色变化时卡片底色自动同族**，不会出现"底变了卡片还是旧色"的割裂。

配套还有全局壁纸层（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L291-L380)）：

- `.site-wallpaper`：`position: fixed; inset: -48px; filter: blur(12px) saturate(1.1); contain: strict;` —— **向外扩 48px** 是为了让模糊边缘不出现白边；**`inset` + fixed 等效实现视差**，注释明确说明**故意不用 `background-attachment: fixed`**（iOS Safari 上会重绘卡顿甚至被忽略）。
- 图片真正画在 `::before`（`::after` 被可读性遮罩占用）；侧边栏卡片复用同一变量画在 `::after`：`.site-wallpaper::before, .bg-shared-media::after` 合并为一条规则 → **同一 `--random-bg-url`、同一 `opacity .9s` transition**，因此两处必然同步淡入。由 `html.bg-ready` 统一切换 `opacity: 1`。
- 兜底值 `--random-bg-url: none`：脚本未跑/图未加载时 `::before` 无背景图 → 露出元素纯色底（回到"无随机图"的原貌），**不触发任何兜底图片下载**。这段注释是理解背景层设计意图的钥匙。

---

## 6. 动效体系

### 6.1 Swup 页面切换（swup.css）

[swup.css](file:///Users/qinchao/Music/my-blog/src/styles/swup.css) 全文只有两条状态规则 + 一条降级：

| 选择器 | 含义 | 曲线 |
|---|---|---|
| `html.is-changing .swup-transition-fade` | **进入**（目标态 + 过渡定义） | 淡入 `0.45s cubic-bezier(.22,1,.36,1)`；位移 `0.55s cubic-bezier(.34,1.56,.64,1)`（**overshoot 弹簧**）；模糊 `0.45s ease` |
| `html.is-animating .swup-transition-fade` | **离开**（隐藏态 + 新页起点） | `opacity:0; scale(.965); blur(3px)`；`transition-duration` 统一压到 **0.3s** |

两个设计要点：

1. **进入用超冲曲线（1.56 > 1）、离开用普通时长** —— 进入时 `scale(.965) → 1` 会**略微过冲再回落**，形成"弹出来"的观感；离开压到 0.3s 是因为 **Swup 默认超时是 400ms**，若离开动画超过就会被截断产生闪跳。这条 0.3s 是硬约束，不能随意调大。
2. `animationClass: 'swup-transition-'`（[astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js#L59)）→ 实际类名 `swup-transition-fade`。**前缀在配置、后缀在 CSS**，改配置时 CSS 必须同步。

`.card-press`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L444-L455)）是与之配套的"点击反馈"：首页卡片被点时 `scale(1.03)` + accent 描边 + accent 光晕，`0.16s` 弹簧曲线。**它与 Swup 进入动画叠加**，成就"文章从卡片里弹出来"的整体观感（swup.css 首行注释即描述此事）。实现上由卡片点击事件临时加/移除该类，属运行时脚本（见 [06-components.md](./06-components.md)）。

### 6.2 弹簧药丸与其它

- 导航栏的"弹簧药丸"（选中项指示器）不是 CSS，而是 **Framer Motion 的 spring 物理量**，常量表见 [06-components.md](./06-components.md) §Navbar。
- `.border-glow-card`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L49-L152)）：跟随鼠标的**边缘光**，靠 `--edge-proximity` / `--cursor-angle` / `--cone-spread` 等变量由 JS 实时驱动（`--edge-proximity: 0` 是默认值，未驱动态下不发光）。
- `.site-grain`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L221-L229)）：由内联 SVG **feTurbulence** 生成的噪点纹理，`mix-blend-mode: overlay; opacity: .09; contain: paint;` —— 用 SVG data-URI 而不是图片，**零请求**。
- `.card-glow-effect`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L425-L437)）：`radial-gradient(460px circle at var(--mouse-x) var(--mouse-y) …)`，跟随鼠标的卡片辉光，只在 `.post-list .card-glass:hover` 时 `opacity: 1`。

### 6.3 reduced-motion 降级

- [swup.css](file:///Users/qinchao/Music/my-blog/src/styles/swup.css#L26-L33)：`prefers-reduced-motion: reduce` 下 **`transition: none`** 并强制锁定 `opacity:1 / transform:none / filter:none`（用 `!important`，因为要压过上面的状态规则）。
- [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L636)：正文内动效同样降级。

---

## 7. 性能手段清单

| 手段 | 位置 | 解决的问题 |
|---|---|---|
| `contain: strict` | `.site-wallpaper` | 把 fixed 全屏层的重绘范围压到最小，避免整页重排 |
| `contain: paint` | `.site-grain` | 噪点层不参与外部布局计算 |
| **滚动时移除 `backdrop-filter`** | `body.is-scrolling .card-glass / .sidebar-card / .cloud-badge / .comment-block`（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L457-L466)） | `backdrop-filter` 每帧重算背景模糊是滚动掉帧主因；滚动期玻璃"退化"为半透明纯色，**停止 120ms 后自动恢复** |
| `will-change: transform` | 导航栏（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L380)） | 提前提升为合成层，滚动时导航栏不抖 |
| `translate3d(0,0,0.01px)` | `.border-glow-card` | 强制 GPU 合成层 |
| 内联 SVG 噪点 | `.site-grain` | 免一次图片请求 |
| 双主题变量（非运行时再高亮） | shiki.css | 代码高亮切换零 JS 成本 |
| `--random-bg-url` 单变量复用 | global.css | 全局背景 + 侧边栏卡片共用一次下载 |

`body.is-scrolling` 的实现侧在 [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L139-L159)（滚动事件 + 去抖），见 [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md)。

---

## 8. 配色与字体速查

**`config.json.color` 的 10 组强调色**（[config.json](file:///Users/qinchao/Music/my-blog/src/config.json#L42-L54)）：

| # | light | dark | | # | light | dark |
|---|---|---|---|---|---|---|
| 1 | `#F55555` | `#325ea3` | | 6 | `#FF6666` | `#A1CCD1` |
| 2 | `#0396FF` | `#ABDCFF` | | 7 | `#F6416C` | `#838BC6` |
| 3 | `#fb7287` | `#99D8CF` | | 8 | `#32CCBC` | `#90F7EC` |
| 4 | `#F072B6` | `#3ac8f6` | | 9 | `#33A6B8` | `#79F1A4` |
| 5 | `#9F44D3` | `#E2B0FF` | | 10 | `#F55555` | `#297aa0` |

⚠️ **第 1 组与第 10 组的 light 值完全相同**（`#F55555`），即从 10 组里随机时，`#F55555` 的**实际出现概率是 2/10**。若不希望重复，需替换其中一组的 `light` 值。

**字体族**（[tailwind.config.ts](file:///Users/qinchao/Music/my-blog/tailwind.config.ts#L7-L19)）：`sans` = Noto Sans SC → Source Han Sans SC → sans-serif → 各平台 Emoji 字体；`serif` = Noto Serif SC 族；`mono` = JetBrains Mono → Fira Code → Consolas。另外 global.css 声明了 **`Atkinson`** 两档 `@font-face`（400/700，`font-display: swap`，从 `/fonts/*.woff` 加载）—— 这是 Astro 模板残留字体，**当前未见 `font-family: Atkinson` 的消费方**。

---

## 9. 已知问题与维护要点

| # | 现象 | 影响 | 建议 |
|---|---|---|---|
| 1 | **`.spoiler` 在 global.css 与 markdown.css 双重定义**，且 global.css 在导入顺序上**后置覆盖** | 修一处不生效，暗色 hover 表现不一致 | 收敛到 markdown.css |
| 2 | **AccentColorInjector 每次换页 append `<style>` 且不移除旧标签** | head 中累积冗余节点 | 改为复用单一 `<style>` 元素、只更新 `textContent`（同时可避免重排） |
| 3 | **`dark:` 变体依赖 `data-theme`**，与 ThemeLoader 强耦合 | 若有人误把 `darkMode` 改回 `'class'` 或 `'media'`，全站 `dark:` 类立即失效 | 两处必须一起改，建议加注释互指 |
| 4 | **`<alpha-value>` 仅对 `accent` 可用** | 误写 `bg-primary/50` 会静默失效 | 需半透明时用 `rgb(from var(--color-bg-primary) r g b / .5)` |
| 5 | **相对颜色语法 `rgb(from …)` 无天然降级** | 老浏览器丢弃整条声明（不是变透明，而是变"无样式"） | 关键视觉属性保留传统 `rgba()` 或 `var(…, fallback)` 兜底 |
| 6 | `config.json` accent **第 1/10 组 light 重复** | 该颜色出现率翻倍 | 换掉一组 |
| 7 | `html.gray` 用整页 `filter` | 生成新包含块，fixed 元素定位基准可能变化 | 若出现定位异常，改为逐元素 `filter` + 白名单 |
| 8 | ThemeLoader 的 Swup 监听被注释 | 换页不重判哀悼日/本地主题 | 当前设计正确（都挂在 html 上）；若将来改为 body 级 class 则必须重启监听 |

---

## 10. 相关文档

- 主题变量注入与 `data-theme` 的运行时上下文 → [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md)
- 随机壁纸 + Service Worker 缓存策略 → [10-data-and-external-services.md](./10-data-and-external-services.md)
- Shiki 双主题与 Markdown 样式挂钩 → [08-markdown-pipeline.md](./08-markdown-pipeline.md)
- Tailwind 配置逐项说明与未使用依赖 → [12-config-reference.md](./12-config-reference.md)
- Navbar 弹簧物理常量、玻璃态交互 → [06-components.md](./06-components.md)
