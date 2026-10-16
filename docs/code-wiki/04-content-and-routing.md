# 04 · 内容与路由

## 1. Content Collections

定义在 [`src/content/config.ts`](../../src/content/config.ts)，使用 Astro Content Collections（`type: 'content'`，Markdown/MDX 文件）。

### 1.1 `posts`（博客文章）

目录约定：**`src/content/posts/<slug>/index.md`**，图片放同目录，正文里用相对路径引用（`![](./cover.webp)`），实现"单目录自包含"。

| 字段 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | `string` | 必填 | 文章标题 |
| `date` | `Date`（经 `noonDefaultDate` 变换） | 必填 | 发布日期 |
| `lastMod` | `Date?` | 无 | 最后修改时间；未填则回退 `date`（见 [文章页](../../src/pages/[year]/[month]/[day]/[slug].astro#L58)） |
| `summary` | `string?` | 无 | 简介；同时是 SEO `description` 与 AI 摘要兜底来源 |
| `cover` | `string?` | 无 | 封面图 |
| `category` | `string?` | 无 | 单分类（不是数组） |
| `tags` | `string[]` | `[]` | 标签数组 |
| `comments` | `boolean` | `true` | 是否显示评论区 |
| `draft` | `boolean` | `false` | 生产构建时过滤（`import.meta.env.PROD` 下 `draft !== true`） |
| `sticky` | `number` | `0` | 置顶权重，越大越靠前 |

### 1.2 `noonDefaultDate`：日期归一化的关键约定

```ts
// frontmatter 只写日期（如 `2026-09-19`）时 js-yaml 解析为 UTC 午夜（00:00:00Z）
// → 本变换把它归一到 UTC 正午 12:00:00Z
```

三个连锁影响，改动相关内容前必须知道：

1. 日期只有"日期"时，instant 固定为 `12:00:00Z`，**跨构建机时区稳定**（用本地时区会在 UTC+8 本机与 UTC 的 CI 产物间产生不同 instant）；
2. [`hasTimeFilled()`](../../src/utils/date.ts#L55-L57) 用"UTC 12:00:00 未被填时间"作为哨兵，决定是否展示 `HH:MM`；
3. 文章 URL 的 `year/month/day` 取自 `post.data.date` 的**本地**年月日（`getFullYear/getMonth/getDate`），见 [`getPostUrl`](../../src/utils/content.ts#L66-L72)。

### 1.3 `spec`（静态页正文）

| 字段 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | `string` | 必填 | 标题 |
| `description` | `string` | 必填 | 描述（用于 SEO 与页面副标题） |
| `comments` | `boolean` | `true` | 是否显示评论区 |

现有条目与处理方式（见 [§2.2 `[spec]` 静态页](#22-spec-静态页)）：

| 文件 | 路由 | 渲染方式 |
| :--- | :--- | :--- |
| `spec/projects.md` | `/projects` | `PageLayout` + `ProjectList`（正文为空，可留） |
| `spec/tools.md` | `/tools` | `PageLayout` + `ToolList` |
| `spec/about.md` | `/about` | **实际不会生效**：`src/pages/about.astro` 静态路由优先，此文件是主题遗留内容（正文仍在讲 Gyoza 主题） |

### 1.4 `galleries`（相册）

| 字段 | 类型 | 默认 | 说明 |
| :--- | :--- | :--- | :--- |
| `title` | `string` | 必填 | 相册标题 |
| `description` | `string` | 必填 | 描述 |
| `date` | `Date` | 必填 | 日期（列表倒序用） |
| `draft` | `boolean` | `false` | 过滤草稿 |
| `cover` | `string?` | 无 | 封面（可为字符串 URL 或本地图片；未填则取第一张图） |
| `tags` | `string[]` | `[]` | 标签 |

现有相册：`qinchao`、`xiaoxiaoshi-photo`、`flash-photo`。

---

## 2. 路由总表

Astro 文件路由，全部**构建期静态生成**（无 SSR adapter）。产物结构见 `dist/`。

| URL | 源文件 | 生成方式 | 数据来源 |
| :--- | :--- | :--- | :--- |
| `/` | [`pages/[...page].astro`](../../src/pages/[...page].astro) | `getStaticPaths`（分页第 1 页，`params.page = undefined`） | `getSortedPosts()` 按 `posts.perPage` 切分 |
| `/page/2`、`/page/N` | 同上 | 同上（`params.page = 'page/N'`） | 同上 |
| `/YYYY/MM/DD/<slug>` | [`pages/[year]/[month]/[day]/[slug].astro`](../../src/pages/[year]/[month]/[day]/[slug].astro) | `getStaticPaths` 由 `post.data.date` 构造三段日期 + `post.slug` | `getSortedPosts()` |
| `/about` | [`pages/about.astro`](../../src/pages/about.astro) | 静态页（**优先级高于 `[spec].astro` 生成的同名路由**） | `config.json` 的 `author` / `hero` |
| `/projects` | `[spec].astro` | `getStaticPaths` 遍历 `getCollection('spec')` | `spec/projects.md` + [`data/projects.ts`](../../src/data/projects.ts) |
| `/tools` | `[spec].astro` | 同上 | `spec/tools.md` + [`data/tools.ts`](../../src/data/tools.ts) |
| `/archives` | [`pages/archives.astro`](../../src/pages/archives.astro) | 静态页 | `getOldestPosts()`（升序）+ `Timeline` + `TimelineProgress` |
| `/tags` | [`pages/tags/index.astro`](../../src/pages/tags/index.astro) | 静态页 | `getAllTags()` |
| `/tags/<tagSlug>` | [`pages/tags/[tag].astro`](../../src/pages/tags/[tag].astro) | `getStaticPaths` 遍历 `getAllTags()` | `getOldestPosts()` 过滤 `slugify(tag)` 命中 |
| `/categories` | [`pages/categories/index.astro`](../../src/pages/categories/index.astro) | 静态页 | `getAllCategories()`，按 `count` 降序、同数按中文名排序 |
| `/categories/<catSlug>` | [`pages/categories/[category].astro`](../../src/pages/categories/[category].astro) | `getStaticPaths` | `getOldestPosts()` 过滤 `slugify(category)` |
| `/galleries` | [`pages/galleries/index.astro`](../../src/pages/galleries/index.astro) | 静态页 | `getCollection('galleries')` 过滤 draft + `import.meta.glob` 收集本地图 |
| `/galleries/<slug>` | [`pages/galleries/[slug].astro`](../../src/pages/galleries/[slug].astro) | `getStaticPaths`（`g.id` 去掉 `/index.md`） | 本地图 + `.pvt` + `data/gallery-manifests/<slug>.json` |
| `/links` | [`pages/links/index.astro`](../../src/pages/links/index.astro) | 静态页 | [`data/links.ts`](../../src/data/links.ts) 的 `friendLinks` |
| `/links/apply` | [`pages/links/apply.astro`](../../src/pages/links/apply.astro) | 静态页 | 内嵌 `Comments`（`bare` 变体） |
| `/links/fcircle` | [`pages/links/fcircle.astro`](../../src/pages/links/fcircle.astro) | 静态页 | 友圈插件挂载点 + `fc.43322.cn/link.json` 状态 |
| `/404` | [`pages/404.astro`](../../src/pages/404.astro) | 静态页 | 内嵌 `Flashlight`（鼠标探照灯） |
| `/rss.xml` | [`pages/rss.xml.ts`](../../src/pages/rss.xml.ts) | 静态 endpoint（`GET`） | `@astrojs/rss` + `getSortedPosts()` |
| `/sitemap.xml` | [`pages/sitemap.xml.ts`](../../src/pages/sitemap.xml.ts) | 静态 endpoint（`GET`） | 手写 XML（含首页/分页/分类/标签/文章/静态页） |
| `/robots.txt` | [`pages/robots.txt.ts`](../../src/pages/robots.txt.ts) | 静态 endpoint（`GET`） | 固定文案，`Sitemap:` 指向 `import.meta.env.SITE` |

### 2.1 首页分页（`[...page].astro`）

```astro
const sortedPosts = await getSortedPosts()
const { perPage } = appConfig.posts            // 默认 5
const totalPage = Math.ceil(sortedPosts.length / perPage)
// i === 0 → params.page = undefined（即 /），否则 params.page = `page/${i+1}`
```

- 传 props：`currentPage` / `totalPage` / `data`（`CollectionEntry<'posts'>[]`）；
- 第 1 页：`Hero` + `PostList` + 右侧栏（`ProfileCard` / `YiyanCard` / `GreetingClock` / `BgImageCard` / `SiteInfoCard`），且 `PageLayout transparentBg={true}`（走首页专用背景）；
- 其余页：仅 `PostList` + `PostPagination`，`max-w-[780px]` 单列；
- `totalPage > 1` 时才渲染分页器。

### 2.2 `[spec]` 静态页

`[spec].astro` 用一个文件承载三种形态：`isPageLayout = ['projects','tools'].includes(md.slug)`。

- `projects` / `tools`：用 `PageLayout` + 对应列表组件（`ProjectList` / `ToolList`），Markdown 正文为空时不渲染 `MarkdownWrapper`；
- 其他 spec（本意是给"长文型静态页"用）：用 `MarkdownLayout` + `PostToc` + `ReadingProgress`；
- 两种情况都在 `md.data.comments` 为真时渲染 `Comments`。

### 2.3 文章详情页（`[year]/[month]/[day]/[slug].astro`）

页面结构（自上而下）：

1. `MarkdownLayout`（`mdTitle` / `mdDescription` = 分类 + 标签拼接 / `mdSlug` 给分享用）；
2. `h1` 标题 → `PostMetaInfo`（日期 + 字数 + 阅读时长 + 阅读量）→ `PostArchiveInfo`（分类 / 标签链接）→ `Outdate`（`lastMod` 超 30 天提示）→ `AiSummaryCard slug={slug}`；
3. `MarkdownWrapper`（`id="markdown-wrapper"`）内渲染 `<Content />`，外层容器带 `data-pagefind-body`；
4. 右侧栏 `data-pagefind-ignore`：`SectionBlock("目录")` + `PostToc headings` + `ReadingProgress` + `ActionAside`；
5. 底部：`PostCopyright`（版权 + 签名 + 复制链接）、`PostNav`（上/下篇）、`Comments`（`post.data.comments` 为真）。

上/下篇由"按 `getSortedPosts()` 找当前 slug 的 index"决定（`prev = index-1`，`next = index+1`）。

---

## 3. `src/utils/` 工具函数

### 3.1 [`utils/content.ts`](../../src/utils/content.ts) — 内容查询

| 导出 | 签名 | 用途 / 消费方 |
| :--- | :--- | :--- |
| `getSortedPosts` | `(): Promise<CollectionEntry<'posts'>[]>` | **最常用**：先按 `sticky` 降序，再按 `date` 降序。首页 / 文章页 / RSS / sitemap / 上下篇 |
| `getOldestPosts` | 同上 | 按 `date` 降序（`sort` 语义上时间新的在前）。归档页 / 标签页 / 分类页 |
| `getAllPostsWordCount` | `(): Promise<number>` | `post.render()` 取 `remarkPluginFrontmatter.words` 求和。页脚"总字数" |
| `getAllCategories` | `(): Promise<{slug,name,count}[]>` | 从 `getNewestPosts()` 聚合 `category`。分类总览页 / `[category].astro` / sitemap |
| `getAllTags` | 同上 | 聚合 `tags` 数组。标签页 / sitemap |
| `getHotTags` | `(len = 5)` | 标签按 `count` 降序取前 N。**当前无消费方（死代码）** |
| `slugify` | `(text: string): string` | 去点、空格转 `-`、转小写；分类/标签 slug 生成 |
| `getPostUrl` | `(post): string` | 生成 `/${y}/${m}/${d}/${slug}`（月/日补零）；用于 RSS 与 sitemap |

内部私有辅助：`getAllPosts()`（生产环境过滤 `draft`）、`getNewestPosts()`（升序）。

> 注意 `getAllPostsWordCount` 会为**每篇文章**调用 `post.render()`，这是构建期开销较大的一处（页脚需要总字数）。

### 3.2 [`utils/date.ts`](../../src/utils/date.ts) — 日期与时间

| 导出 | 用途 / 消费方 |
| :--- | :--- |
| `getRelativeTime(startDate, endDate?)` | 10 分钟内"刚刚"、<60 分"X 分钟前"、<24h"X 小时前"、<10 天"X 天前"，否则 `null`。`RelativeDate.tsx` |
| `getFormattedDate(date)` | `24 年 1 月 1 日 星期一`（两位年份 + 星期） |
| `getFormattedDateTime(date)` | `2024 年 01 月 01 日 12:00`（补零） |
| `hasTimeFilled(date)` | 哨兵判断：UTC 是否恰为 `12:00:00` → 判定"未填时间"。见 [§1.2](#12-noondefaultdate日期归一化的关键约定) |
| `getFormattedDateWithOptionalTime` | `getFormattedDate` + 填了时间才追加 `HH:MM`。`RelativeDate` / `Outdate` |
| `getFormattedDateTimeWithOptionalTime` | 同上但 4 位年份、无星期。`PostCopyright` 的"最后修改时间" |
| `getDiffInDays(start, end?)` | 相差天数。`RunningDays`（运行天数）、`Outdate`（过期判断）、`TimelineProgress` |
| `getShortDate(date)` | `MM-DD`。`Timeline.astro` |
| `getDaysInYear(date)` / `getStartOfYear(date)` / `getStartOfDay(date)` | 年度进度计算。`TimelineProgress` |

### 3.3 [`utils/theme.ts`](../../src/utils/theme.ts) — 主题读写

| 导出 | 说明 |
| :--- | :--- |
| `changePageTheme(theme)` | 写 `document.documentElement` 的 `data-theme` |
| `getSystemTheme()` | `matchMedia('(prefers-color-scheme: dark)')` → `'dark' \| 'light'` |
| `getLocalTheme()` | 读 `localStorage['gyoza-theme']`；非法值回退 `system` 并写回 |
| `setLocalTheme(theme)` | 写 `localStorage['gyoza-theme']` |

> localStorage key 为 **`gyoza-theme`**（沿用上游主题命名，未改）。三态：`light` / `dark` / `system`。
> 消费方：`ThemeLoader.astro`（首屏内联）、`ThemeProvider.tsx`（运行时同步）、`ThemeSwitch.tsx`（切换器）。

---

## 4. 站点配置消费关系

[`src/config.json`](../../src/config.json) 各键的实际消费方（详细键说明见 [12 配置参考](12-config-reference.md)）：

| 键 | 消费方 |
| :--- | :--- |
| `site` | `Layout.astro`（`lang`）、`CommonHead.astro`（title/description/keywords/favicon）、`rss.xml.ts`、`sitemap.xml.ts` |
| `author` / `hero` | `ProfileCard.astro`、`Hero.astro`、`about.astro`、`SocialList.tsx` |
| `color` | `AccentColorInjector.astro`（10 组强调色 + bg/text/border 双模式） |
| `menus` | **无消费方**（导航菜单在 `Navbar.astro` 内硬编码） |
| `posts.perPage` | `[...page].astro`、`sitemap.xml.ts` |
| `footer.startTime` | `RunningDays.tsx`（运行天数）、页脚版权年份 |
| `twikoo.envId` | `Layout.astro` 的评论驱动脚本（另有同名常量硬编码，见 [10 §6.3](10-data-and-external-services.md#63-twikoo-的两个坑及其解法含金量最高的一段)） |
| `analytics` | `WebAnalytics.tsx`（Umami / Google / Clarity 开关）、`Layout.astro` 中两段 Umami `<script>` 硬编码 |
| `sponsor.wechat` | `ActionAside.tsx`（赞赏二维码） |
