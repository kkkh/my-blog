# 10 · 数据层与外部服务

> 本文说明：**静态数据放在哪、外部服务各是谁、每个服务怎么接入、有哪些缓存/降级策略**。
> 相关文件：`src/data/*`、[sw.js](file:///Users/qinchao/Music/my-blog/public/sw.js)、[Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro)、[ReadCount.astro](file:///Users/qinchao/Music/my-blog/src/components/post/ReadCount.astro)、[SiteVisitors.astro](file:///Users/qinchao/Music/my-blog/src/components/footer/SiteVisitors.astro)、[SearchModal.astro](file:///Users/qinchao/Music/my-blog/src/components/header/SearchModal.astro)、[WebAnalytics.tsx](file:///Users/qinchao/Music/my-blog/src/components/head/WebAnalytics.tsx)

---

## 1. 内容层 vs 数据层：两套完全不同的数据来源

理解本项目的数据流，第一步是分清两类数据：

| | **内容集合（Content Collections）** | **静态数据模块（`src/data/*`）** |
|---|---|---|
| 位置 | `src/content/posts` / `spec` / `galleries` | [src/data/](file:///Users/qinchao/Music/my-blog/src/data) |
| 形态 | Markdown 文件 + frontmatter | TypeScript 常量数组 / JSON |
| 校验 | `zod` schema（[config.ts](file:///Users/qinchao/Music/my-blog/src/content/config.ts)） | TypeScript 接口（编译期检查） |
| 消费方式 | `getCollection()` + `entry.render()` | `import` 后直接用 |
| 典型用途 | 文章、单页、相册元信息 | 友链、项目、工具、相册清单 |
| 变更成本 | 新建 md 文件（有 CLI 脚本） | 手改 ts/json 文件 |

**为什么友链/工具不放进 Content Collection？** 它们是**结构化列表数据**（需要按分类分组、遍历渲染），而不是"有正文的文档"。用 TS 常量数组可以享受类型提示与编译期校验，比 md 更合适。

---

## 2. `src/data/*` 逐个说明

### 2.1 [links.ts](file:///Users/qinchao/Music/my-blog/src/data/links.ts)（154 行）

```ts
export interface LinkItem  { name, url, avatar?, desc? }
export interface LinkCategory { title, links: LinkItem[] }
export const friendLinks: LinkCategory[]
```

- 结构：`分类 → 链接数组`，共 5 个分类（来看看大佬们 / 朋友们 / Link3 / 软件阁 / 大家庭）。
- 消费方：友链页 `/links`（按分类渲染卡片）。
- ⚠️ **数据质量问题**：「开发阿雷」同时出现在「来看看大佬们」与「朋友们」两个分类中（重复项）；且`avatar` 多为远端 URL，页面渲染时直接外链，**依赖对方站点可用性**。
- 「秦超」与「园枢」共用同一头像 URL（`https://www.43322.cn/image/qin.png`）。

### 2.2 [projects.ts](file:///Users/qinchao/Music/my-blog/src/data/projects.ts)（102 行）

项目列表。消费方：`/projects` 页面。

### 2.3 [tools.ts](file:///Users/qinchao/Music/my-blog/src/data/tools.ts)（300 行）

```ts
export interface Tool { id: number; title; description; url; tags?: string[] }
export const tools: Tool[]
```

- 按 `tags` 分组（如「图片」分组下的去背景、放大、压缩类工具），**用注释分隔线 `// ── 图片 ──` 组织版本文件**，与代码中的注释风格一致。
- 消费方：`/tools` 页面。
- ⚠️ `id` 为**手写序号**，新增条目必须自己保证不重复 —— 没有 `id` 唯一性校验。

### 2.4 `gallery-manifests/*.json`

| 文件 | 内容 |
|---|---|
| `flash-photo.json` | 相册「拾光碎片」：12 张实况照片，`cover` / `video` / `width` / `height` |
| `xiaoxiaoshi-photo.json` | 相册「小小诗」清单（清单内 `title` 为「且笑且行，万物随缘」） |
| （`src/content/galleries/` 另有 md 条目） | `flash-photo` / `qinchao` / `xiaoxiaoshi-photo` |

`flash-photo.json` 结构示例：
```json
{ "title": "拾光碎片", "subtitle": "十二张实况照片，拆开封面与视频",
  "images": [ { "alt": "照片 1", "width": 1488, "height": 1976,
                "cover": "https://cdn.43322.cn/gallery/person-life/01.jpg",
                "video": "" } ] }
```

- 注意 `video: ""` 为空串 —— **清单里给的是封面直链，实况视频另走 `.pvt` / Motion Photo 解包**（见 §6）。
- `width` / `height` 是**必填**，用于计算宽高比占位、防止图片加载时的布局跳动（CLS）。
- ⚠️ **manifest 与 content collection 是两份分离的相册定义**：`galleries` collection 的 md 负责标题/描述/日期，manifest 负责图片列表，两者需人工保持一致。

### 2.5 `ai-summaries.json`

**自动生成产物**（由 `scripts/gen-ai-summaries.mjs` 写入），缓存 AI 摘要。见 [11-scripts-and-tooling.md](./11-scripts-and-tooling.md)。

---

## 3. 外部服务总清单

| 服务 | 域名 | 用途 | 接入位置 | 加载时机 |
|---|---|---|---|---|
| **webp 随机壁纸** | `webp.43322.cn` | 每次整页加载换一张背景图 | Layout body 内联脚本 + [sw.js](file:///Users/qinchao/Music/my-blog/public/sw.js) | 首帧后异步 |
| **image CDN** | `image.43322.cn` | 头像、微信赞赏码、实况原图 | `config.json` / 组件内直链 | 按需 |
| **cdn** | `cdn.43322.cn` | 相册图片（`/gallery/person-life/*`） | gallery-manifests | 按需 + 懒加载 |
| **Umami 统计** | `um.43322.cn` | 访问统计 + 浏览量/曝光数读取 | Layout head + [ReadCount](file:///Users/qinchao/Music/my-blog/src/components/post/ReadCount.astro) + [SiteVisitors](file:///Users/qinchao/Music/my-blog/src/components/footer/SiteVisitors.astro) | head `async defer` |
| **Umami Cloud**（备用） | `cloud.umami.is` | 第二个 Umami 站点 ID | Layout head | head `async defer` |
| **Twikoo 评论** | `twikoo.43322.cn` | 评论引擎 A（Vue 2）+ 云函数 | Layout body 评论驱动 | 用户切到 Twikoo 才加载 |
| **Waline 评论** | `waline.43322.cn` | 评论引擎 B | Layout body 评论驱动（本地 js/css） | 用户切到 Waline 才加载 |
| **fclite / 友圈** | `fc.43322.cn` | 友圈动态流 + 友链可达性 | Layout body 友圈脚本 | 进入友圈/友链页 |
| **Google Analytics** | `googletagmanager.com` | GA4 | [WebAnalytics.tsx](file:///Users/qinchao/Music/my-blog/src/components/head/WebAnalytics.tsx) | `analytics.enable` 且非 DEV |
| **Microsoft Clarity** | `clarity.ms` | 会话录制/热图 | 同上 | 同上 |
| **AI 摘要服务** | `ai.43322.cn/chat` | 构建期生成文章摘要 | `scripts/gen-ai-summaries.mjs` | **构建期**（非运行时） |

> ⚠️ **`cloud.umami.is` 与 `um.43322.cn` 是两套不同的 websiteId**（Layout.astro L40-47 同时加载两个 umami script）：前者 `45b3d783-…`、后者 `0a0731a2-…`（后者同时是 [WebAnalytics.tsx](file:///Users/qinchao/Music/my-blog/src/components/head/WebAnalytics.tsx#L18) 注入的那个）。**同一页面会加载两次 Umami 采集脚本** —— 这属于历史叠加，会造成重复上报（见 §9）。

---

## 4. 随机壁纸：Service Worker + 固定 KEY 缓存

这是本项目最有技术含量的一处外部服务对接。

### 4.1 遇到的核心难题

`webp.43322.cn` 是"随机图接口"（每次请求返回不同图片），并且**不返回 CORS 头**。带来两个问题：

1. **无法用 IndexedDB 缓存**：`fetch()` / canvas 拿不到跨域图片字节（同源策略硬限制）。
2. **Cache API 默认按 URL 精确匹配**，而 Layout 脚本用 `?v=timestamp` 破缓存 → **每次 URL 都不同，跨刷新永不命中缓存**。

### 4.2 解法（[sw.js](file:///Users/qinchao/Music/my-blog/public/sw.js)）

| 问题 | 方案 |
|---|---|
| 拿不到字节 | `fetch(req, { mode:'no-cors' })` 得到 **opaque response** —— JS 读不到内容，但 `cache.put` 能存、`new Image` / CSS `url()` 能渲染，**无需服务端配合** |
| URL 每次都变 | 用一个**固定 KEY** 作缓存槽位：`BG_KEY = 'https://webp.43322.cn/__bg_cache__'`（一个不存在的"伪 URL"，纯作标识） |
| 刷新要快 + 图要新 | **Stale-While-Revalidate**：命中缓存立即返回（秒开），同时 `e.waitUntil(networkPromise)` 后台拉新图覆盖同一槽位 |

时序（注释中写得很清楚）：
```
首次访问：无缓存 → 放行网络（慢，必然）→ 下载后存入固定 KEY
第 1 次刷新：命中缓存秒开 + 后台 fetch 新图覆盖 KEY
第 2 次刷新：返回"上次后台更新的那张" + 再后台更新
```

其它细节：
- **Scope 极窄**：`fetch` 监听器里 `if (url.hostname !== BG_HOST) return` —— 只拦壁纸域，其余请求一律放行（避免 SW 变成全站代理，也避免缓存污染）。
- `install` 里 `skipWaiting()`、`activate` 里清掉非当前版本缓存 + `clients.claim()`。
- 网络彻底失败时 **返回 `504`** —— 让 `img.onerror` 触发，Layout 脚本静默保持纯色占位（不塞兜底图）。
- **注册条件**（[Layout.astro](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L67-L74)）：`'serviceWorker' in navigator` 且协议为 https / localhost / 127.0.0.1 —— **http 的预览环境不注册**。
- 脚本标 `data-swup-ignore-script`：Swup 不重建 body，注册只跑一次。

### 4.3 Layout 侧脚本（[L76-122](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L76-L122)）

```
url = 'https://webp.43322.cn?v=' + Date.now()
img.onload → img.decode()（保证帧已解码，写入变量不闪）→ apply(url)
            decode 不可用/失败 → 直接 apply(url)
img.onerror → 静默（保持纯色）
apply(url) → docEl.style.setProperty('--random-bg-url', `url('${url}')`)
           → docEl.classList.add('bg-ready')
```

- `settled` 标志保证 **apply 只执行一次**。
- **一次请求、多处复用**：全局背景层（`.site-wallpaper::before`）与侧边栏卡片（`.bg-shared-media::after`）共用 `--random-bg-url`。注释记录了重构动因：以前两处各自直连，**同一张随机图被下载两次且两次返回结果不同 → 画面割裂**。
- SPA 导航期间壁纸**保持稳定不闪变**（脚本只跑一次，body 不重建）。

---

## 5. 统计服务：Umami 分享 API（只读）

### 5.1 为什么从 Twikoo 迁到 Umami

[ReadCount.astro](file:///Users/qinchao/Music/my-blog/src/components/post/ReadCount.astro#L1-L9) 顶部注释明确对比：

| | 旧方案 Twikoo `COUNTER_GET` | 现方案 Umami share API |
|---|---|---|
| 副作用 | **读取即自增**，污染真实数据 | **纯读取**，零写入 |
| 计数粒度 | 多篇文章共享同一计数 doc | **按 `path` 精确匹配** |
| 请求数 | 逐篇请求 | **全站一次 pull**（800+ 页面路径） |

### 5.2 接口调用链（两个组件共用同一令牌）

```
GET https://um.43322.cn/api/share/3dqElmkT2YAbsEKk
      → { websiteId, token }                      ← 公开分享令牌
GET /api/websites/{websiteId}/metrics?type=path&startAt=0&endAt=…&limit=2000
      headers: x-umami-share-token: <token>
               x-umami-share-context: 1
      → [ { x: '/2026/08/16/slug', y: 123 }, … ]  ← 全站路径浏览量
```

- `shareType=1` 基础分享令牌**限制 `type=path` 可用**（Umami v3 把 `url` 改名 `path`），且 **`url` 过滤参数被忽略** → 因此必须**全量拉取后本地匹配**。
- `startAt=0` = 全时段累计（不是"最近 N 天"）。
- 全站接口 CORS 已全开放（`ACAO:*` + `ACAH:*`），**浏览器可直接跨域请求，无需服务端代理**。

### 5.3 两个消费组件

| 组件 | 展示 | 数据 | 缓存 key |
|---|---|---|---|
| [ReadCount.astro](file:///Users/qinchao/Music/my-blog/src/components/post/ReadCount.astro) | 文章页「阅读量 N」 | `metrics?type=path` 建 `{path:N}` map | `mcy:umami-pageviews`（sessionStorage，按天） |
| [SiteVisitors.astro](file:///Users/qinchao/Music/my-blog/src/components/footer/SiteVisitors.astro) | 页脚「本站已被曝光 N 次」 | `/daterange` 拿首日 → `/stats` 取 `pageviews` | `mcy:total-visitors`（同上） |

**共同设计模式**（值得复用的模板）：

1. **幂等守卫**：`window.__umamiReadCountInit` / `window.__siteVisitorsInit` —— 组件在 Swup 换页后会重新出现，重复注册会导致多次请求。
2. **按天缓存**：`sessionStorage` 存 `{ day, map }`；`todayStr()` 判同天则直接用缓存，**当天切页/刷新零网络开销**。跨天自动失效。
3. **优雅降级**：请求失败**不缓存**、显示 `--`，不报错、不弹 toast。SiteVisitors 更细：失败先回退**历史缓存值**，再失败才 `--`。
4. **延迟到首帧后**：`requestAnimationFrame(callLoad)` 或 `DOMContentLoaded`，**避免抢占 LCP**。
5. **切页重跑**：监听 `swup:content:replaced`（注意：此处用的是 `replaced`，与评论驱动用的 `content:replace` 不是同一事件）/ `astro:page-load` / `popstate`。
6. **只处理未完成的节点**：`[data-state!=='done']` 过滤，避免重复渲染、避免覆盖已显示的值。
7. **path 归一化重中之重**：`normalizePath()` 去掉尾部斜杠 —— 同一篇文章可能同时存在 `/2026/08/08/new-work` 与旧记录 `/2024/09/07/ode/` 两条 path 记录，归一化后**同名 key 的浏览量按 key 累加合并**（`map[key] = (Number(map[key])||0) + (Number(row.y)||0)`）。**若不做加法而是后写覆盖，浏览量会偏少** —— 注释里特别强调了这一点。
8. 数字格式化：`format(n)` 用正则千分位逗号。

> ⚠️ **两组件硬编码了同一个 `SHARE_ID = '3dqElmkT2YAbsEKk'`**（未放进 `config.json`）。换站点/换令牌时必须同时改两处。

---

## 6. 评论系统：双引擎驱动（Twikoo / Waline）

### 6.1 为什么"驱动控制器"放在 Layout 而不是评论组件里

[Layout.astro L326-L333](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L326-L333) 的注释给出了根因：

> Swup 切页只替换 `<main>`、不重建 body，本脚本常驻单例；main 内的 inline 脚本由 **SwupScriptsPlugin 每次重跑**，若在组件内初始化，**每切一篇文章就新建一个评论实例且旧的永不销毁**。

这正是 [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md) 里"body 级常驻单例"规则的最典型案例。

### 6.2 两台引擎的加载策略

| | Twikoo | Waline |
|---|---|---|
| 版本 | **钉死 1.7.19**（与云函数 `twikoo-vercel` 对齐） | 本地 `public/waline/` |
| 来源 | **双 CDN 自动切换**：jsDelivr 主源 → unpkg 备源 | `/waline/waline.js`（本地，无 CDN 依赖） |
| 体积 | **772 KB**（官方 all.min.js） | **262 KB** |
| 触发 | 用户切到 Twikoo | 用户切到 Waline |
| 失败提示 | 两源都失败 → `Twikoo 加载失败，请刷新重试` | 本地加载失败 |

- **按需懒加载**：`只有用户真的切到对应系统才下载` —— **首页与无评论页零成本**。
- `localStorage['mcy-comment-driver']` 记忆用户上次选择（`writeDriver`），非法值回落 `twikoo`。
- 「懒加载指示器」`setLoader(driver, on, error)` 用 `if (driver !== shownDriver) return` —— **只跟随当前展示的系统**，避免用户已切走后误关另一个引擎的加载态。

### 6.3 Twikoo 的两个"坑"及其解法（含金量最高的一段）

**坑 1：Vue 2 `$mount` 会替换掉 `#twikoo` 节点**

```js
// 幂等标记必须打在永不被替换的外层壳上
function twikooSlot() {
  return document.querySelector('#comment-block .comment-driver[data-engine="twikoo"]')
}
```
- 用 `data-engine` 属性而非 `#twikoo` 作为稳定锚点 —— 因为 Twikoo 的 Vue 2 `$mount('#twikoo')` 会把 `#twikoo` 元素**整个替换掉**，替换后 id 就没了，而外层壳始终存在。`syncUI` 的高亮判定同样基于 `data-engine`。

**坑 2：运行时注入的 16 个 `<style>` 被 Swup 的 head-plugin 清掉，导致第二篇文章起样式永久丢失**

这是全仓库最隐蔽的 bug，注释（[L435-L454](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L435-L454)）完整记录了推理链：

1. Twikoo 的 CSS **不是文件** —— `twikoo.all.min.js` 内是 **webpack vue-style-loader 内联样式**，脚本首次加载时一次性往 `document.head` 注入 **16 个 `<style>`（v1.7.19 实测 37KB）**。
2. 之后无论调用多少次 `twikoo.init()` 都**不会重新注入**（webpack 模块已缓存）。
3. 而 `@swup/astro` 默认开启 `updateHead`（`@swup/head-plugin`），它挂在 `before("content:replace")`：**每次切页会把 `<head>` 里"下一页静态 HTML 的 head 中不存在"的元素全部 `removeChild`**。
4. → Twikoo 的 16 个 `<style>` 正是运行时注入、静态 HTML 里不存在 → **切页一次就被删掉且永不补回** → 第二篇文章起评论样式全部丢失（首篇正常，之后永久失效）。
5. **识别只能靠内容**：`vue-style-loader` 注入的 `<style>` **连 `data-vue-ssr-id` 属性都没有**（bundle 内 ssrId 为假值）。且 16 个片段**并不都属于 twikoo 命名空间**，实测分布：
   - `.tk-*` twikoo 本体（评论列表/提交/分页/管理面板）
   - `.el-*` **Element UI**（按钮/文本域/标签，**约占 49% 体积**）
   - `OwO` 表情面板
   > 「只匹配 `tk-comment` 只能覆盖 15% 的样式，**三个特征必须都认**。」
6. **解法**：`adoptTwikooStyles()` 遍历 `document.head` 的 `<style>`，凡内容含 `tk-` / `el-` / `OwO` 任一特征就 `document.body.appendChild(st)` —— **挪到 body 后依然全文档生效，且不属 head 清理范围**。
7. **时序关键**：必须在 `script.onload` 里**马上**调用（`adoptTwikooStyles()` 紧接 `mountTwikoo()`），因为 CSS 就是脚本加载这一刻注入 head 的 —— **一旦等到 Swup 切页之后才挪，head-plugin 已经删掉了**。
8. 安全性论证：本站 head 内的内联样式只有"随机强调色变量"（不含 `tk-/el-/OwO`），**不会误伤**。函数幂等，重复调用只是空转。

**另外：Twikoo 无 SRI 校验** —— CDN 脚本加载，存在第三方脚本被篡改的供应链风险（自建博客可接受，但值得记录）。

### 6.4 Waline 的 `<link>` 为什么挂 body

[Layout.astro L520-528](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L520-L528)：

```js
link.rel = 'stylesheet'; link.href = WALINE_CSS
link.setAttribute('data-waline-css', '1')
// 挂到 <body> 而非 <head>：<link> 放 body 是合法 HTML5，
// 而 @swup/head-plugin 只清理 <head> 子节点 —— 放 head 里每个 Swup 切页都会被删
```

**与 Twikoo 是同一个根因（head-plugin 清 head），两个不同的解法**（Twikoo 是事后搬移，Waline 是压根不放 head）。这两个解法并列放在一起，是理解本项目"Swup 生态下 CSS 生命周期"的最好教材。

Waline 配置要点（[L590-599](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L590-L599)）：
- `dark: '[data-theme="dark"]'` —— 原生支持选择器形式，**自动跟随本站主题**。
- `requiredMeta: ['nick','mail']` —— 注释强调：**只认 `nick`/`mail`/`link`，写 `'email'` 会被静默丢弃**。
- `pageSize: 20`、`commentSorting: 'latest'`。

---

## 7. 友圈（fclite）与友链状态

由 [Layout.astro L185-323](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L185-L323) 的 body 级常驻脚本统一处理：

**动因**：Swup 切页后 main 容器内的 inline 脚本不会重新执行 → 插件区空白、友链状态卡"加载中"。

| 环节 | 做法 |
|---|---|
| 插件配置 | `window.UserConfig = { private_api_url:'https://fc.43322.cn/', page_turning_number:24, error_img:'/fclite/avatar-fallback.svg' }` —— 因为 Swup 切页后 main 内的 `UserConfig` 不会重跑 |
| JS 懒加载 | `ensureFclite()` 动态插 `<script data-fclite>`；**失败时清除标记 + `setTimeout(boot,1000)` 重试** |
| CSS 保障 | `ensureFcliteCss()` 遍历 `document.styleSheets` 检查是否已存在，未加载才补 `<link data-fclite-css>` |
| 防重复渲染 | `if (root.children.length === 0) initialize_fc_lite()` |
| 友链状态防重复拉取 | `summary.dataset.state !== 'done'` 守卫 |
| 数据源 | `fetch('https://fc.43322.cn/link.json')` → `link_data[]`，含 `reachable` 布尔 |
| 渲染 | 统计「N 正常 · M 异常」+ 网格卡片（`status-card ok/fail`） |
| XSS 防护 | `esc(t)` 用 `div.textContent → innerHTML` 做转义（友链名称来自远端 JSON，**必须转义**） |
| 触发时机 | 首屏 DOMContentLoaded / `setTimeout 200 + 800`；切页监听 `swup:page:view` 与 `astro:page-load`，各 `150ms` 与 `700ms` 双延迟 |

**双延迟（150/700ms）是刻意的**：150ms 赶在插件已渲染时尽早初始化，700ms 兜底处理慢渲染/竞态。首屏则用 200/800 组合。

CSS 放 head 全局（[Layout.astro L48-49](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L48-L49)）的理由：*"Swup 切页不替换 head，避免 main 内 link 在切页后未加载导致卡片样式丢失"* —— **与 Waline 相反的选择**，因为 fclite.css 是**静态 HTML 里就存在的** `<link>`（不属 head-plugin 清理范围），所以放 head 是安全的。

---

## 8. 图片灯箱与实况照片（Fancybox + 三种素材形态）

### 8.1 Fancybox 6.0.29 本地化

| 项 | 位置 | 原因 |
|---|---|---|
| CSS | `<head>` `/fancybox/fancybox.min.css`（[L50-51](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L50-L51)） | **本地化，避免 CDN 被跟踪防护拦截** |
| UMD JS | `<body>` `/fancybox/fancybox.umd.min.js` + **`data-swup-ignore-script`** | 见下 |
| 初始化 | `<script is:inline data-swup-ignore-script>`（[L700](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L700)） | 同上 |

**`data-swup-ignore-script` 的两个理由**（注释 [L691-699](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L691-L699)）：

1. **UMD 脚本**：`@swup/scripts-plugin` 在 `content:replace` 时 `querySelectorAll` 扫**整个 document** 的 `script:not([data-swup-ignore-script])`，把每个 `<script>` **克隆重建并重新执行**。不加标记 → **每次切页 Fancybox 都被重定义成全新实例**（openers 清空、点击监听器丢失），而 `initFancybox` 的 `+200ms` 重绑可能先于 UMD 重加载完成 → **灯箱彻底失效，点击变成直跳图片直链**。
2. **初始化脚本**：它的监听器都挂在 `document` 上（Swup 永不替换），首帧就已生效；不加标记会被每切一页克隆重跑，**`astro:page-load` 监听器无限累加**（`initFancybox` 虽幂等，但调用次数随切页数增长）。

### 8.2 实况照片的三种素材形态

| 形态 | 数据源 | 解包方式 |
|---|---|---|
| **静态图** | `data-cover` | 无 `data-html` → **走默认 image 灯箱，零影响** |
| **`.pvt` 包** | `data-pvt`（本地 `.pvt` 文件） | `unpackPvt()`：**零依赖 ZIP 解析** |
| **Motion Photo** | `data-motion`（远端 CDN 直链） | `unpackMotion()`：读 EXIF `GCamera:MicroVideoOffset` |

**`.pvt` 解包器（[L708-773](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L708-L773)）** —— 纯手写 ZIP 解析，无任何库：
- 从尾部往回扫最多 65558 字节找 **EOCD 签名 `0x06054b50`**；
- 读 central directory 条目数、起点，逐条解析出 `method`（压缩方式）/ `csize` / `nameLen` / `localHead`；
- 按扩展名分类：图片（`jpe?g|webp|png`）作 cover，视频（`mp4|mov`）作 video，**两者都找到即 `break`**；
- 定位真实数据起点：`localHead + 30 + nameLen + extraLen`；
- `method === 0` 直接取；`method === 8` 用 **`DecompressionStream('deflate-raw')`** 解压（原生 API，无需 zlib）；
- 结果 `URL.createObjectURL` 出两个 blob URL；
- **缓存** `pvtCache[url]`（Promise 缓存，失败时 `delete` 以便重试）。

**Motion Photo 解包器（[L782+](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L782)）**：
- 文件结构：**JPEG 封面 + 文件尾部内嵌 MP4**；
- EXIF `GCamera:MicroVideoOffset` = **"从文件末尾往回数多少字节到视频开头"（即视频体积）**；
- 只解码前 200000 字节找 `MicroVideoOffset="(\d+)"`（避免全文件 decode）；
- `videoStart = bytes.length - offset`，再在 `±4` 字节范围微调定位 **`ftyp`** 魔数（`bytes[p+4..p+6] === 0x66,0x74,0x79`）；
- 注释强调：**灯箱不复用缩略图的 blob，保持 DOM 解耦**，这里自己解一遍。

### 8.3 灯箱播放器状态机

| 函数 | 职责 |
|---|---|
| `getAssets(slide)` | 从 `slide.triggerEl.dataset` 读素材 —— **DOM 解耦：绝不读缩略图 DOM** |
| `resolveAssets(assets)` | 按 `video` / `pvt` / `motion` 优先级解析成 `{cover, video}` |
| `mountLivePlayer(player, slide)` | **先 `pauseThumb(slide)`** 暂停缩略图上的播放（避免在遮罩底下继续跑）；已有 `.lp-video` 则 `resume` 而非重建 |
| `setCover` / `attachVideo` | 封面与 `<video muted autoplay loop playsinline>`（**`playsinline` 对 iOS 必需**） |
| `isCurrentSlide(player)` | 用 `player.closest('.is-selected')` 判定当前页是否可见 |
| `prunePlayers()` | 只保留 `isConnected && (currentPlayer || isCurrentSlide)` 的播放器，其余 `stopPlayer` |
| `stopAll()` | 关闭灯箱时全部停止 |

- **触发入口**：*"本地化 Fancybox 6.0.29 没有 `done` 事件，用 `Carousel.contentReady`（slide 内容就绪钩子，**仅当 slide 有 `html` 选项时触发**）注入实况播放器"*（[L703-704](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L703-L704)）。
- `.pvt` 解包失败时**回退 `data-cover`（原图 jpg）** + `hideSpin` + `console.warn`。
- **有 `data-pvt` / `data-motion` 时不预铺 cover**：*"解包器自己出封面（同一份字节已缓存），避免先下原图再加下解包件"*。

### 8.4 HeoLivePhoto 缩略图懒加载池（[L1168-1266](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L1168-L1266)）

相册页有 12 张实况照片，`.pvt` 共 **~16.7 MB**，一次性下载会同时打满带宽与 CPU。

| 机制 | 作用 |
|---|---|
| `IntersectionObserver`（`rootMargin: 0`） | **滚进视口才 `scan(item)`，不预取** —— 真·懒加载 |
| `MAX_CONCURRENT = 2` | 同时最多 2 个 `.pvt` 在下载/解压，其余排队（`flush()` 出队） |
| `generation` 递增 token | **切页后旧队列立即作废**，不再追加新下载，防止切走后还在后台拉 16MB |
| `data-swup-ignore-script` | 监听器挂 document，不重跑 |

---

## 9. 站内搜索：Pagefind

| 环节 | 做法 |
|---|---|
| 索引生成 | **构建期**：`pagefind --site dist`（见 [03-run-and-deploy.md](./03-run-and-deploy.md)） |
| CSS | `<head>` `/pagefind/pagefind-ui.css`（[L52-53](file:///Users/qinchao/Music/my-blog/src/layouts/Layout.astro#L52-L53)）—— *"保证首次打开搜索模态框样式已就绪"* |
| UI JS | **首次打开才动态注入** `pagefind-ui.js` → **未点搜索零开销** |
| 挂载位置 | [SearchModal.astro](file:///Users/qinchao/Music/my-blog/src/components/header/SearchModal.astro) 挂 Layout **body 末尾**（Swup 只替换 main，body 级常驻 → **单例**） |
| 触发 | 导航栏 `#search-btn` 打开；**Esc / 点遮罩关闭** |
| 主题适配 | 覆盖官方 `--pagefind-ui-*` 变量，**跟随本站明暗 + 每页随机 accent**（读 `--color-accent` 等） |
| 构建注意 | `vite.build.rollupOptions.external: ['/pagefind/pagefind.js']` —— Pagefind 产物是构建后才生成的绝对路径模块，必须 external 否则 Rollup 报找不到文件（[astro.config.js](file:///Users/qinchao/Music/my-blog/astro.config.js#L89-L95)） |

---

## 10. 已知问题与维护要点

| # | 现象 | 影响 | 建议 |
|---|---|---|---|
| 1 | **Layout 与 WebAnalytics 双重加载 Umami**（`cloud.umami.is` + `um.43322.cn`，两个不同 websiteId） | 重复上报；统计口径需自行区分 | 二选一，或明确注释两者的用途差异 |
| 2 | **`WebAnalytics.tsx` 用 `import.meta.env.DEV` 判断但设置 `analytics.enable: true`**，而 Layout 中的 Umami 是**硬编码**、不看 `analytics.enable` | 想通过配置关掉统计时，Layout 那两个 script 仍会加载 | 把 Layout 内联的两个 Umami script 也纳入 `analytics.enable` 控制 |
| 3 | **`SHARE_ID` 硬编码在两处**（ReadCount / SiteVisitors），且不在 `config.json` | 换令牌要改两处，易漏 | 提到 config.json |
| 4 | **`cloud.umami.is` 与 `um.43322.cn` 未被 config 管理** | 与 `analytics.umami.serverUrl` 配置割裂 | 同上 |
| 5 | **Twikoo CDN 脚本无 SRI** | 供应链风险（CDN 被篡改则执行任意脚本） | 若要加固，可保留本地副本 + 哈希校验 |
| 6 | **友链数据重复项**（「开发阿雷」出现在两个分类） | 页面重复展示 | 去重 |
| 7 | **相册 manifest 与 galleries collection 双份定义** | 易不同步 | 统一为单一数据源（manifest 生成 md，或 md 引用 manifest） |
| 8 | **`tools.ts` 的 `id` 无唯一性校验** | 新增条目可能撞号 | 加构建期断言或改用自动 id |
| 9 | **`fclite.js` 失败重试只有 1s 一次、无上限** | 持续失败会不断重试（`setTimeout(boot,1000)`） | 加最大重试次数 |
| 10 | **友圈状态渲染用 `innerHTML` 拼接**（已转义 name，但 `item.link` **未转义**直接进 `href`） | 若远端 JSON 的 link 含 `"` 可闭合属性 | 对 `link` 也做一次属性转义或 URL 校验 |

---

## 11. 相关文档

- Service Worker / 脚本注册所在的 body 级常驻脚本全清单 → [05-layouts-and-global-runtime.md](./05-layouts-and-global-runtime.md)
- 随机壁纸对应的 CSS 层与主题变量 → [09-styles-and-theme.md](./09-styles-and-theme.md)
- `serverUrl` / `enable` 等配置键全表 → [12-config-reference.md](./12-config-reference.md)
- 构建管线中的 Pagefind 与 AI 摘要生成 → [03-run-and-deploy.md](./03-run-and-deploy.md)、[11-scripts-and-tooling.md](./11-scripts-and-tooling.md)
- 相册路由与 gallery 集合 → [04-content-and-routing.md](./04-content-and-routing.md)
