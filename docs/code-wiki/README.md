# Code Wiki · astro-qinchao

> 本站是基于 [astro-gyoza](https://github.com/lxchapu/astro-gyoza) 深度定制的 **Astro 4 + React 18 静态博客**，
> 聚焦三件事：**SPA 级导航体验**、**长文阅读质感**、**构建体积与运行时开销控制**。
> 线上站点：<https://www.43322.cn>

本 Wiki 面向"接手这个仓库的人"编写：读完可以独立完成内容更新、样式调整、组件扩展、构建排障与部署。
所有事实均来自仓库当前源码（版本 `3.0.0`）。

---

## 1. 快速事实

| 项目 | 值 |
| :--- | :--- |
| 站点根目录 | `/Users/qinchao/Music/my-blog` |
| 框架 | Astro `^4.6` + React `^18.2` + TypeScript `^5.4` |
| 样式 | Tailwind CSS `^3.4` + CSS 变量主题体系 |
| 状态 / 动画 | Jotai `^2.20` / Framer Motion `^11.1` |
| 包管理器 | pnpm（`pnpm-lock.yaml`、`pnpm-workspace.yaml`） |
| Node 要求 | 18+（构建脚本依赖内置 `fetch`） |
| 输出模式 | 全静态（无 SSR adapter），产物落 `dist/` |
| 部署 | Vercel（`vercel.json` 配置边缘缓存头） |
| 站点配置 | [`src/config.json`](../../src/config.json) |
| 内容源 | `src/content/posts/`、`src/content/spec/`、`src/content/galleries/` |
| 结构化数据 | `src/data/*.ts`、`src/data/*.json` |

---

## 2. 文档地图

| 文档 | 内容 | 适合谁 |
| :--- | :--- | :--- |
| [01 架构总览](01-architecture-overview.md) | 分层架构、构建管线、运行时三层模型、关键机制与数据流 | 所有人 / 首次接手 |
| [02 目录结构](02-directory-structure.md) | 目录树、每个目录与文件职责、文件规模热点、路径别名 | 所有人 |
| [03 运行与部署](03-run-and-deploy.md) | 环境要求、命令表、`pnpm build` 四段管线、环境变量、Vercel 与 CI | 开发 / 运维 |
| [04 内容与路由](04-content-and-routing.md) | content collections 与 frontmatter schema、路由总表、`utils` 工具函数 | 写作者 / 改路由 |
| [05 布局与全局运行时](05-layouts-and-global-runtime.md) | 三个布局的职责、`Layout.astro` 中所有 body 级常驻脚本、Swup 集成 | 改交互 / 排障 |
| [06 组件体系](06-components.md) | 全部组件清单、关键组件实现细节、依赖拓扑、副作用清单、孤儿文件 | 改 UI |
| [07 React 岛与状态管理](07-react-islands-state.md) | `client:*` 指令约定、Provider 组合、Jotai atoms、Hooks、Modal 栈 | 改前端逻辑 |
| [08 Markdown 渲染管线](08-markdown-pipeline.md) | 10 个 remark/rehype 插件逐条说明、语法能力矩阵、样式挂钩 | 写内容 / 扩展语法 |
| [09 样式与主题系统](09-styles-and-theme.md) | CSS 变量令牌、双色板随机强调色、Tailwind 映射、动效体系 | 改视觉 |
| [10 数据层与外部服务](10-data-and-external-services.md) | `src/data/*`、评论系统、统计、友圈、灯箱与实况照片、搜索、AI 摘要 | 接外部服务 / 排障 |
| [11 脚本与工程化](11-scripts-and-tooling.md) | `scripts/*` 逐个说明、git hooks、Prettier/commitlint、CI | 维护构建 |
| [12 配置参考与依赖清单](12-config-reference.md) | `config.json` 全键说明、`astro.config.js`、依赖用途与未使用项 | 配置变更 |

---

## 3. 推荐阅读路径

- **新人第一天**：01 架构总览 → 02 目录结构 → 03 运行与部署 → 04 内容与路由
- **只想发文章**：04 内容与路由（frontmatter 表 + `pnpm new-post`）
- **只想改样式/配色**：09 样式与主题系统 → 06 组件体系（找到目标组件）
- **改交互 / 排查"切页后失效"**：05 布局与全局运行时 → 07 React 岛与状态管理（`useCleanupOnPageLeave` 协议）
- **接外部服务 / 数据不显示**：10 数据层与外部服务 → 11 脚本与工程化（构建期数据生成）
- **构建失败**：03 运行与部署 → 11 脚本与工程化 → 12 配置参考与依赖清单

---

## 4. 三条最容易踩坑的"全局约定"

在改任何代码前请先记住这三条，它们解释了本仓库 80% 的特殊写法：

1. **Swup 只替换 `<main>`，不重建 `<body>`**
   因此：窗口级监听器、第三方 SDK 实例、Modal/Toast 容器必须放在 body 级并使用 `window.__xxxBound` 之类的幂等守卫；
   `main` 内的 React 岛不会自动 unmount，必须用 [`useCleanupOnPageLeave`](../../src/hooks/useCleanupOnPageLeave.ts) 主动释放资源。
2. **主题与强调色走 CSS 变量 + `is:inline` 构建期/首屏脚本**
   不打包进 JS 模块（`ThemeLoader`、`AccentColorInjector` 都是内联脚本），目的是避免首屏闪烁，并规避共享模块被打包后"连坐"失效。
3. **自动生成产物不进 Git / 不进交付**
   `src/data/ai-summaries.json` 由构建脚本生成，`public/pagefind/` 由 Pagefind 生成且已被 `.gitignore` 忽略。

细节见 [05 布局与全局运行时](05-layouts-and-global-runtime.md) 与 [07 React 岛与状态管理](07-react-islands-state.md)。

---

## 5. 已知不一致（本 Wiki 记录，未修改源码）

以下问题在调研中被确认存在，属于"代码与文档/脚本不同步"，改动前需留意（详见 [11 脚本与工程化](11-scripts-and-tooling.md#5-已知不一致汇总)）：

- `package.json` 的 `mcy` / `d` 命令指向 `scripts/deploy.mjs`、`scripts/sync.mjs`，**这两个文件不存在**。
- `pnpm new-project` 写入 `src/content/projects/<name>.yaml`，但项目数据实际在 [`src/data/projects.ts`](../../src/data/projects.ts)，该目录不存在。
- [`src/pages/sitemap.xml.ts`](../../src/pages/sitemap.xml.ts) 中硬编码了 `cloud-photography` / `scenery-cartoon` / `tree-photo` 三个相册路径，而实际相册是 `qinchao` / `xiaoxiaoshi-photo` / `flash-photo`。
- [`src/config.json`](../../src/config.json) 的 `menus` 字段**没有任何组件消费**（导航菜单在 `Navbar.astro` 内硬编码），属死配置。
