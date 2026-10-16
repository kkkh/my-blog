# 08 · Markdown 渲染管线

> 本文说明：一篇文章从 Markdown 源文本到最终 HTML 之间，**经过了哪些 AST 变换**、**每条变换由谁实现**、**产出物挂在哪个字段上**、**样式由哪个 CSS 承接**。
> 相关文件：[astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js)、[src/plugins/](file:///Users/qinchao/Music/my-blog/src/plugins)、[markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css)、[shiki.css](file:///Users/qinchao/Music/my-blog/src/styles/shiki.css)

---

## 1. 全局配置总览

关键前提（见 [astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js#L64-L88)）：

```js
markdown: {
  syntaxHighlight: false,   // ← 关闭 Astro 内置 Shiki，改由自定义 rehypeCodeHighlight 接管
  smartypants: false,       // ← 关闭弯引号/破折号自动替换，保持原文
  remarkPlugins: [...],     // 8 个
  rehypePlugins: [...],     // 8 个
  remarkRehype: { footnoteLabel: '参考', footnoteBackLabel: '返回正文' },
}
mdx({
  extendPlugins: false,     // ← 关键：MDX 不继承上面的 markdown 配置
  remarkPlugins: [...],     // 与 markdown 完全相同的 8 个
  rehypePlugins: [...],     // 少一个 rehypeCodeHighlight（7 个）
  remarkRehype: { footnoteLabel: '参考', footnoteBackLabel: '返回正文' },
})
```

**`extendPlugins: false` 的含义**：Astro 的 MDX 集成默认会把 `markdown` 段里配置的插件**追加**到 MDX 自己的管道上；这里显式关闭，意味着两条管道各自独立声明 —— 好处是可控，代价是**两边必须手动保持同步**（见本文 §3 的差异表）。

**`site`/`syntaxHighlight` 之外还有一处易忽略配置**：`vite.build.rollupOptions.external: ['/pagefind/pagefind.js']`（[astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js#L89-L95)），Pagefind 产物是构建后才生成的绝对路径模块，必须标记为 external，否则 Rollup 在构建期会因找不到该文件而报错。这一条是搜索功能能跑起来的前提。

---

## 2. remark 阶段（Markdown AST → Markdown AST）

remark 插件在 mdast 上工作，**只改语法树，不产生 HTML**（唯一例外是 `remarkMark` 用 `html` 节点偷渡）。

### 2.1 remarkMath（第三方）

`remark-math`，把 `$...$` / `$$...$$` 解析为 `inlineMath` / `math` 节点。本身不渲染，需下游 `rehypeKatex` 配对消费。**必须排在管道最前**，否则 `$` 会被当成普通文本吃掉。

### 2.2 remarkIns（第三方）

`remark-ins`，支持 `++插入文本++` → `<ins>`。

### 2.3 remarkMark（自研）

[remarkMark.js](file:///Users/qinchao/Music/my-blog/src/plugins/remarkMark.js)

`==高亮==` → `<mark>`。实现方式不是定义新语法，而是**在 `text` 节点上做字符串切分**：

```js
const parts = node.value.split(/(==[^=]+==)/g)
if (parts.length <= 1) return
```

- 用捕获组正则 split，命中的片段本身就是 `==xxx==` 形态，再手工包成 `{ type:'html', value:'<mark>…</mark>' }` 塞回 `parent.children`。
- **已知局限**：① 只处理单行纯文本节点，`==` 跨节点（如被 `**` 加粗断开）不生效；② 内容是**未转义拼接**的 HTML，若高亮文本含 `<` `>` 会产生非预期标签 —— 仅适合可信内容（自己的博客）。
- 复杂度 O(节点数)，无递归，成本可忽略。

### 2.4 remarkSupersub（第三方）

`remark-supersub`，支持 `^上标^` 与 `~下标~`。

### 2.5 remarkDirective（第三方）

`remark-directive`，提供容器/叶子指令语法（`:::name`、`::name`）。**它自身不渲染任何东西**，只是把语法解析成 `containerDirective` / `leafDirective` / `textDirective` 节点，交给下游 `remarkEmbed` 消费。若单独启用而不接下游，输出会是空的 `<div>`。

### 2.6 remarkEmbed（自研）

[remarkEmbed.js](file:///Users/qinchao/Music/my-blog/src/plugins/remarkEmbed.js)

依赖上游 remarkDirective，把三种叶子指令翻译成 `<iframe>`。**只认 `leafDirective`，且只认白名单三种 name**：

| 指令写法 | `data.hName` | 生成 `src` | `class` |
|---|---|---|---|
| `::youtube{#VIDEO_ID}` | `iframe` | `https://www.youtube.com/embed/{id}` | `video` |
| `::bilibili{#BV_ID}` | `iframe` | `//player.bilibili.com/player.html?isOutside=true&bvid={id}` | `video` |
| `::codepen[author]{#ID}` | `iframe` | `https://codepen.io/{attributes.author}/embed/{id}` | `codepen` |

细节：
- 非白名单 name 或**缺少 `id` 属性**时直接静默跳过（`return`），不报错也不降级 —— 写错只会得到一个空节点。
- 全部带 `loading="lazy"`；YouTube 额外带 `allow` 权限串与 `allowFullScreen`。
- `class: 'video'` 决定样式：`iframe.video` 应用 `@apply aspect-video`（[markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L216-L217)），因此**无需自己算宽高比**。

### 2.7 remarkSpoiler（自研，最复杂）

[remarkSpoiler.js](file:///Users/qinchao/Music/my-blog/src/plugins/remarkSpoiler.js)

`||剧透内容||` → `<span class="spoiler" title="你知道的太多了">`。这是**唯一一个手写 micromark 语法扩展**的插件，因为它需要"标记符不出现在正文中"的精确行为。

实现拆成两半：

**(a) `micromarkExtensions`** —— 词法层。在 `text` 上下文中为竖线字符 `|` 注册 construct：
- `spoilerTokenize`：先 `attempt(markerConstruct)` 吃掉开标记 → 进入 `chunkText` 内容态 → 每次遇到候选标记就 `check(markerConstruct)`，命中则结束、否则 `consume` 一个字符继续。
- `markerTokenize`（带 `partial: true`）：**恰好消费两个 `|`**。`markSize > 1` 时 `nok`（三连竖线不是标记）；`markSize < 2` 时也 `nok`。且检查 `this.previous === codes.verticalBar`，避免把 `|||` 的第三个竖线误判为标记起点。
- 终止条件包含 `code === codes.eof || code < codes.horizontalTab` → `nok`，即**未闭合的 `||` 会让整个构造失败并回退为纯文本**，不会残留半个节点。

**(b) `fromMarkdownExtensions`** —— 实体层。`enter` 建 `spoiler` 节点，`exit` 时把节点从 mdast 迁到 hast 语义：
```js
node.data.hName = 'span'
node.data.hProperties = { className: 'spoiler', title: '你知道的太多了' }
```
注意 exit 里用了 `const node = this.stack[this.stack.length-1]` 取栈顶，而非使用 `token` 参数 —— 这是与 micromark 状态机栈配合的写法。

**样式**：`global.css` 里 `.spoiler` 默认用 `filter: blur(...)` 模糊（[global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L238-L254)），hover 时复原；暗色主题单独覆写 hover 规则。**它同时被 `global.css` 与 `markdown.css` 两处定义**，属历史叠加（详见 §5）。

### 2.8 remarkReadingTime（自研）

[remarkReadingTime.js](file:///Users/qinchao/Music/my-blog/src/plugins/remarkReadingTime.js)

极短（11 行），但**产出被 4 处消费**，是内容层最关键的元数据注入点：

```js
const textOnPage = toString(tree)                 // mdast-util-to-string 抽取全部纯文本
const readingTime = getReadingTime(textOnPage)    // reading-time 按词数估算
data.astro.frontmatter.readingMinutes = readingTime.minutes
data.astro.frontmatter.words = readingTime.words
```

- 写入位置是 `data.astro.frontmatter` —— 即从 `render()` / `getStaticPaths` 拿到的 `remarkPluginFrontmatter`。
- **消费方**：
  | 消费点 | 用途 |
  |---|---|
  | [PostMetaInfo.astro](file:///Users/qinchao/Music/my-blog/src/components/post/PostMetaInfo.astro#L71) | 文章页展示 `Math.ceil(readingMinutes)} 分钟` |
  | [PostCard.astro](file:///Users/qinchao/Music/my-blog/src/components/post/PostCard.astro#L63) | 首页卡片展示 |
  | [utils/content.ts](file:///Users/qinchao/Music/my-blog/src/utils/content.ts#L54) | 全站总字数统计累加 `words` |
  | [\[slug\].astro](file:///Users/qinchao/Music/my-blog/src/pages/%5Byear%5D/%5Bmonth%5D/%5Bday%5D/%5Bslug%5D.astro#L81-L82) | 透传给 PostMetaInfo |
- **注意 `Math.ceil`**：`reading-time` 返回的是小数分钟（如 1.3），展示层统一向上取整，**避免出现「0 分钟」**。
- 副作用警告：`toString(tree)` **包含代码块、脚注、指令节点内的文字**，因此代码密集的文章阅读时长会被显著高估。
- 顺序要求：排在 remark 管道**最后** —— 若不如此，后续插件新插入的文本（如 embed 的 iframe 无文字、无影响；但任何插入文字的自研插件）将不计入。此处它排最后正是稳妥选择。

---

## 3. rehype 阶段（HTML AST → HTML AST）

rehype 插件在 hast 上工作，直接产出真实标签。

### 3.1 rehypeHeadingIds（Astro 内置）

`@astrojs/markdown-remark` 导出，为 `h1~h6` 生成 `id`（slug 化）。**必须在 `rehypeHeading` 之前**，因为后者要用 `node.properties.id` 拼锚点链接。

### 3.2 rehypeKatex（第三方）

`rehype-katex`，把 §2.1 留下的 `inlineMath` / `math` 节点渲染成 KaTeX HTML。
- CSS 由 KaTeX 自带样式表提供（`import 'katex/dist/katex.min.css'` 在布局中引入）。
- 因为是**构建期**渲染，运行时**零 JS**，不会带来 FOUT/布局跳动。
- 反例：`$` 未配对时 KaTeX 会渲染出红色报错文本直出到页面 —— 写作时需自查。

### 3.3 rehypeLink（自研）

[rehypeLink.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeLink.js)

外链自动加固 + 加图标：

```js
const isExternal = node.properties.href.startsWith('http')
```

- 判定方式**只是 `startsWith('http')`** —— 因此 `https://自己的站点` 也会被当外链处理（会加 `target="_blank"`）。
- 对命中节点加 `rel: 'noopener noreferrer'`、`target: '_blank'`，并在 `<a>` **之后插入**一个 `<i class="iconfont icon-external-link">`（`splice(index+1, 0, icon)`）。
- ⚠️ **图标是兄弟节点而非子节点** —— 这是刻意的：若放进 `<a>` 内部，锚点内部文本会变化，可能干扰 Pagefind 索引与文本选中；但也带来一个副作用：图标**不在链接的可点区域内**。
- 该插件不处理 `mailto:`（不以 `http` 开头，故不加图标，属预期行为）。

### 3.4 rehypeImage（自研）

[rehypeImage.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeImage.js)

两件事：**`<img>` 加固** + **独占段落的图片自动升级为 `<figure>`**。

分支逻辑（`visit` 里按父节点形态分流）：

| 条件 | 结果 |
|---|---|
| `p` 且 `children.length === 1` 且子节点是 `img` | 替换为 `figure > [img, figcaption?]`，`figcaption` 内容取 `alt` |
| 自身是 `img`（在其它位置，如表格单元格内） | 原地替换为加固后的 `img` |

加固属性（`buildImage`）：
```js
{ ...imgProps, loading: 'lazy', 'data-fancybox': 'article', 'data-caption': alt }
```
- `data-fancybox="article"` 是**灯箱分组名**：同篇文章内所有图归为一组，可左右翻页；`data-caption` 供灯箱标题栏显示 alt。
- 灯箱本体（Fancybox 6）在 [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro) 中以 UMD 方式加载并配置，见 [10-data-and-external-services.md](./10-data-and-external-services.md)。
- `alt` 为空时**不生成 `figcaption`**（`imgAlt ? h(...) : null`），避免出现空图注条。
- `imgAlt.trim()` 后仍为空串会被 `? :` 判为 falsy —— 依赖的是空串为 falsy，逻辑正确但不够直白。

### 3.5 rehypeHeading（自研）

[rehypeHeading.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeHeading.js)

给每个标题追加锚点图标并打上类名：

```js
node.children.push(h('a', { href: `#${node.properties.id}`, class:'heading-anchor', ariaLabel:'Heading Anchor' }, h('i',{class:'iconfont icon-link'})))
node.properties = { ...node.properties, class: 'heading' }
```

- 产出结构：`<h2 id="x" class="heading">标题文本<a class="heading-anchor">🔗</a></h2>`。
- 与 §3.1 的强顺序耦合：**没有 `id` 就会生成 `href="#"`**。
- 样式侧：`.heading-anchor` 默认 `opacity: 0`，仅 `.heading:hover` 或 `:focus-visible` 时显示（[markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L199-L204)）—— 无鼠标时也能通过键盘聚焦显示，具备无障碍性。
- 该锚点**同时是 PostToc 侧边目录点击的落点**（`href="#id"` 与 TOC 的 `id` 对齐）。

### 3.6 rehypeCodeBlock（自研）

[rehypeCodeBlock.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeCodeBlock.js)

把裸 `<pre><code>` 包成带语言标签与复制按钮的外壳：

```
div.code-block
├── span.lang-tag        "javascript" / "text"
├── button.copy-code     "复制"
└── pre > code           原节点（原地保留）
```

- 语言取自 `code.properties.className[0].slice(9)` —— 硬编码 `slice(9)`，因为 Shiki 加的类名固定是 `language-` 前缀（9 个字符）。**这是与 §3.7 的隐式契约**：若类名前缀变化，标签会显示错误内容。
- 无 `className` 时兜底：主动补 `className: ['language-text']` 并令 `lang = 'text'`。
- `button.copy-code` 只是**外壳**，点击行为由 [Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro) 中一段 body 级常驻脚本用**事件委托**实现（[05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md)）—— 这保证了 Swup 换页后新插入的代码块**同样可复制**，无需重绑。
- 样式：`.code-block` / `.lang-tag` / `.copy-code` / `.copy-code:hover` 全部在 [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L91-L155)。

### 3.7 rehypeCodeHighlight（自研，仅 markdown 管道）

[rehypeCodeHighlight.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeCodeHighlight.js)

**整个插件文件只有 12 行，本质是 `@shikijs/rehype` 的配置数组**：

```js
export const rehypeCodeHighlight = [
  rehypeShiki,
  { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
]
```

- `themes` 双主题 + `defaultColor: false` 是**这一个配置项撑起了暗色模式下的代码高亮**：Shiki 输出 `--shiki-light` / `--shiki-dark` 两组 CSS 变量，颜色切换完全交给 CSS（见 [shiki.css](file:///Users/qinchao/Music/my-blog/src/styles/shiki.css)），**运行时不需要重新高亮**。
- 之所以能作为「插件」被直接写进数组：Astro 的插件列表接受 `[plugin, options]` 元组形式，此处一个小文件承担了"导出元组"的职责。
- **顺序**在 `rehypeCodeBlock` **之前** —— 必须是先高亮（此时加上 `language-*` 类名），再由 `rehypeCodeBlock` 读类名生成标签。反过来 lang-tag 会失效。
- ⚠️ **MDX 管道不包含本插件** → `content/**/*.mdx` 中的代码块**不会被着色**（只有 `.code-block` 外壳）。若以后要写 MDX 文章并需要高亮，需在 mdx 配置中补上本项。

### 3.8 rehypeTableBlock（自研）

[rehypeTableBlock.js](file:///Users/qinchao/Music/my-blog/src/plugins/rehypeTableBlock.js)

两件事：

1. **包一层滚动容器**：`<table>` → `<div class="table-wrapper"><table></table></div>`，使宽表格在窄屏下横向滚动而不撑破正文。
2. **对齐方式迁移**：把 `align` 属性（旧式 HTML 属性）转成内联 `style="text-align: …"` 并 `delete properties.align`。原因是 `align` 在 HTML5 中已废弃，而 `style` 更可控。

- 样式 `.table-wrapper` 在 [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L155)。
- `visit` 在替换 `parent.children[index]` 后**仍会继续访问新节点**，所以「包 wrapper」与「处理 th/td」两条分支在同一次遍历中都能命中，无需二次遍历。

---

## 4. 管道顺序与完整时序图

markdown（非 MDX）管道的**实际执行顺序**：

```
源文本
  │
  ├─ remark 阶段 ───────────────────────────────────────────
  │    remarkMath → remarkIns → remarkMark → remarkSupersub
  │    → remarkDirective → remarkEmbed → remarkSpoiler → remarkReadingTime
  │                                        └── 写 frontmatter.words / readingMinutes
  │
  ├─ remark-rehype（mdast → hast）───────────────────────────
  │    remarkRehype { footnoteLabel:'参考', footnoteBackLabel:'返回正文' }
  │
  ├─ rehype 阶段 ────────────────────────────────────────────
  │    rehypeHeadingIds  （生成 h1~h6 的 id）        ← 供下一步用
  │    → rehypeKatex     （$..$ → KaTeX HTML）
  │    → rehypeLink      （外链 _blank + 外链图标）
  │    → rehypeImage     （img 加固 + figure 升级）
  │    → rehypeHeading   （标题锚点，依赖 id）
  │    → rehypeCodeHighlight（Shiki 双主题）        ← ★ MDX 管道缺失
  │    → rehypeCodeBlock （读 language-* 生成 lang-tag / copy 按钮）
  │    → rehypeTableBlock（表格滚动容器 + 对齐）
  ▼
静态 HTML → 交给 MarkdownLayout → 注入 .markdown 容器
```

**三条不得调换的依赖**（改动管道时必看）：

1. `rehypeHeadingIds` **必须早于** `rehypeHeading` —— 否则锚点 `href="#"` 全错。
2. `rehypeCodeHighlight` **必须早于** `rehypeCodeBlock` —— 否则 `lang-tag` 拿不到语言。
3. `remarkDirective` **必须早于** `remarkEmbed` —— 否则 `leafDirective` 节点不存在。

`remarkReadingTime` 放最后是稳妥选择（当前无插件在其后追加文字），但不是硬约束。

---

## 5. 语法规格速查（写作时对着抄）

| 想要的效果 | 写法 | 实现者 |
|---|---|---|
| 行内公式 | `$E=mc^2$` | remarkMath + rehypeKatex |
| 块级公式 | `$$…$$` | 同上 |
| 插入文本 | `++新增++` | remarkIns |
| 高亮 | `==重点==` | remarkMark |
| 上标 / 下标 | `^上^` / `~下~` | remarkSupersub |
| 剧透遮罩 | `\|\|内容\|\|` | remarkSpoiler |
| 嵌 YouTube | `::youtube{#ID}` | remarkDirective + remarkEmbed |
| 嵌 B 站 | `::bilibili{#BV号}` | 同上 |
| 嵌 CodePen | `::codepen[作者]{#ID}` | 同上 |
| 代码高亮 | ` ```js ` | rehypeCodeHighlight |
| 外链自动加图标 | 任意 `http…` 链接 | rehypeLink |
| 图片自动灯箱 | `![alt](src)` | rehypeImage + Fancybox |
| 图片带图注 | 独占段落 + 有 alt | rehypeImage |
| 脚注 | `[^1]` | remarkRehype（标签"参考"/"返回正文"） |

**脚注中文标签**来自 `remarkRehype` 配置：`footnoteLabel: '参考'`、`footnoteBackLabel: '返回正文'` —— 这两项只在 `remark-rehype` 转换时生效，是纯配置、无代码，容易在后续维护中被遗漏。

---

## 6. 样式挂钩对照表

管线产出的 class 与 CSS 的对应关系（改样式前先查此表）：

| 产出 class / 标签 | 定义文件 | 说明 |
|---|---|---|
| `.code-block` / `.lang-tag` / `.copy-code` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L91-L155) | 代码块外壳 |
| `.heading` / `.heading-anchor` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L199-L204) | 标题与 hover 锚点 |
| `.table-wrapper` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L155) | 表格横向滚动 |
| `.spoiler` | [global.css](file:///Users/qinchao/Music/my-blog/src/styles/global.css#L238-L254) + [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L244-L248) | ⚠️ **两处定义**，global 优先 |
| `iframe.video` / `iframe.codepen` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css#L212-L217) | `aspect-video` 宽高比 |
| Shiki `--shiki-light` / `--shiki-dark` | [shiki.css](file:///Users/qinchao/Music/my-blog/src/styles/shiki.css) | 双主题变量，按 `data-theme` 切换 |
| `figure` / `figcaption` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css) | 图注排版 |
| `i.iconfont.icon-link` / `icon-external-link` | [iconfont.css](file:///Users/qinchao/Music/my-blog/src/styles/iconfont.css) | 图标字体 |
| 容器 `.markdown` | [markdown.css](file:///Users/qinchao/Music/my-blog/src/styles/markdown.css) 全文 | 所有规则的前缀作用域 |

**`.markdown` 前缀是这套样式的隔离手段**：所有规则都写成 `.markdown xxx`，因此它们不会污染首页卡片、导航栏等非正文区域。新增 Markdown 相关样式时必须沿用该前缀。

---

## 7. 已知不一致与维护风险

| # | 现象 | 影响 | 建议 |
|---|---|---|---|
| 1 | **MDX 管道缺 `rehypeCodeHighlight`** | `.mdx` 文章代码无高亮 | 若启用 MDX 写作，补进 mdx.rehypePlugins |
| 2 | **两条管道插件列表手工复制**（`extendPlugins: false`） | 未来新增插件极易只改一边，造成 `.md` / `.mdx` 行为分裂 | 抽成共享常量数组（如 `src/plugins/pipeline.js` 导出 `remarkShared` / `rehypeShared`）后两处引用 |
| 3 | **`.spoiler` 在 global.css 与 markdown.css 双重定义** | 修改时易只改一处，暗色主题下表现不一致 | 统一收敛到 markdown.css（因为 spoiler 只出现在正文） |
| 4 | **`rehypeCodeBlock` 硬编码 `slice(9)`** | Shiki 类名前缀若变化则语言标签错乱 | 改为 `classes.find(c=>c.startsWith('language-'))?.slice(9)` |
| 5 | **`remarkMark` 用未转义 HTML 拼接** | 高亮内含 `<`/`>` 时可能生成非法标签 | 内联做一次 HTML 实体转义 |
| 6 | **`rehypeLink` 用 `startsWith('http')` 判定外链** | 指向本站的绝对 URL 也会 `target="_blank"` | 若在意，加入 `site.url` 白名单排除 |
| 7 | **外链图标为兄弟节点**（不在 `<a>` 内） | 图标不可点击，且夹在段落文本流中 | 若想可点，需把图标移入 `<a>`（同时评估 Pagefind 索引影响） |
| 8 | **`remarkReadingTime` 把代码块文字计入词数** | 代码文的阅读时长/总字数虚高 | 可按需求在 `toString` 前剔除 `code` 节点 |

---

## 8. 相关文档

- 路由与内容集合（`render()` 如何拿到 `remarkPluginFrontmatter`）→ [04-content-and-routing.md](./04-content-and-routing.md)
- 代码复制按钮的运行时实现（事件委托）→ [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md)
- 灯箱与实况照片（消费 `data-fancybox`）→ [10-data-and-external-services.md](./10-data-and-external-services.md)
- 样式与主题变量（`--shiki-*` 与 `data-theme`）→ [09-styles-and-theme.md](./09-styles-and-theme.md)
- 插件文件的依赖（`mdast-util-to-string` / `reading-time` / `micromark-util-symbol` / `hastscript`）→ [12-config-reference.md](./12-config-reference.md)
