# 07 · React 岛与状态管理

本仓库的 React 只承担"需要状态、需要动画、需要浏览器 API"的**小岛**，其余全部是 Astro 静态输出。
这一页说明：岛是怎么挂的、全局状态存在哪、跨切页如何不泄漏。

---

## 1. React 岛指令约定（全量）

| 指令 | 组件 | 为什么用这个指令 |
| :--- | :--- | :--- |
| `client:only="react"` | `Provider`（PageLayout / MarkdownLayout）、`BackToTopFAB`、`ToastContainer`、`ModalStack`、`ThemeSwitch`、`RunningDays`、`Flashlight`(404) | **不参与 SSR**，只在浏览器渲染。用途：完全依赖浏览器 API / 需要与 Swup 生命周期共存 / 避免服务端渲染出的 DOM 与客户端不一致 |
| `client:load` | `GreetingClock`、`TimelineProgress` | 需要尽快可交互（时钟、进度数字） |
| `client:idle` | `HeadGradient`、`PostToc`、`ReadingProgress`、`Outdate`、`ActionAside`、`PostCopyright`、`RelativeDate` | 不影响首屏关键路径，浏览器空闲时再 hydrate，降低首屏 JS 竞争 |
| `client:visible` | `ParticlesBg`、`PostCopyright` | 进入视口才 hydrate（粒子、版权块在首屏之外） |
| 无指令（纯 SSR） | `WebAnalytics`、`AnimatedSignature`（随 PostCopyright 渲染） | 只输出静态 HTML / `<script>`，不需要客户端 JS |

> 判断口诀：**需要读浏览器状态或注册监听 → React 岛 + `client:*`；只是输出标签 → Astro / 纯 SSR React**。

---

## 2. Provider 组合与生命周期

[`Provider.tsx`](../../src/components/provider/Provider.tsx) 是一个"只挂副作用、不渲染 UI"的组合器：

```tsx
export function Provider(props: { pathName: string; title?: string; description?: string; slug?: string }) {
  return (
    <>
      <HeaderMetaInfoProvider {...props} />
      <PageScrollInfoProvider />
      <ThemeProvider />
      <ViewportProvider />
    </>
  )
}
```

四个子 Provider **全部返回 `null`**，职责如下：

| Provider | 写入的 atom | 触发机制 |
| :--- | :--- | :--- |
| `HeaderMetaInfoProvider` | `pathNameAtom` / `metaTitleAtom` / `metaDescriptionAtom` / `metaSlugAtom` | `useEffect`，依赖 `[pathName, title, description, slug]`；路径会去掉结尾 `/`（`/` 本身保留） |
| `PageScrollInfoProvider` | `pageScrollLocationAtom` / `pageScrollDirectionAtom` | `lodash-es` 的 `throttle(…, 16, { leading: false })` 监听 `window.scroll`；**特殊处理**：当 `scrollTop === 0` 且 `body.style.position === 'fixed'`（抽屉/弹窗锁滚动场景）时，用 `body.style.top` 反推真实滚动位置 |
| `ThemeProvider` | 读 `themeAtom` | 写 `localStorage` + `html[data-theme]`；`system` 时跟随 `matchMedia('(prefers-color-scheme: dark)')` 变化 |
| `ViewportProvider` | `isMobileAtom` | `matchMedia('(min-width: 768px)')`，`isMobile = !matches` |

**为什么 `Provider` 被 Swup morph？** [`astro.config.js`](../../astro.config.js#L61) 里的
`morph: ['[component-export="Provider"]']` 让 Swup 切页时对 Provider 对应的 DOM 做 morph 而不是整体替换，
从而保证 Jotai store 在 SPA 导航中连续（否则每次切页状态全丢、主题/滚动位置会跳）。

传入参数来自布局：`pathName={Astro.url.pathname}`，文章页额外传 `title` / `description` / `slug`。

---

## 3. Jotai Atoms（`src/store/`）

| 文件 | atom | 类型 / 初值 | 消费方 |
| :--- | :--- | :--- | :--- |
| [`metaInfo.ts`](../../src/store/metaInfo.ts) | `pathNameAtom` | `string`，`''` | 导航激活态（可选）、分享 |
| | `metaTitleAtom` | `string`，`''` | `ActionAside`（分享文案与标题） |
| | `metaDescriptionAtom` | `string`，`''` | — |
| | `metaSlugAtom` | `string`，`''` | `ActionAside`（拼分享 URL） |
| | `hasMetaInfoAtom` | **派生 atom**（`get`），三值都非空才为 `true` | 供需要"文章上下文是否齐备"的组件判断 |
| [`scrollInfo.ts`](../../src/store/scrollInfo.ts) | `pageScrollLocationAtom` | `number`，`0` | `ReadingProgress`、`BackToTopFAB` |
| | `pageScrollDirectionAtom` | `'up' \| 'down' \| null`，`null` | 滚动方向相关 UI |
| [`theme.ts`](../../src/store/theme.ts) | `themeAtom` | `getLocalTheme()` 的返回值（模块加载时读 localStorage） | `ThemeProvider`（读）、`ThemeSwitch`（读写） |
| [`viewport.ts`](../../src/store/viewport.ts) | `isMobileAtom` | `boolean`，`false` | 响应式分支逻辑 |
| [`modalStack.ts`](../../src/store/modalStack.ts) | `modalStackAtom` | `{ id: string; content: React.ReactNode }[]`，`[]` | `ModalStack`（读）、`useModal`（写） |

**唯一的读写联动**：`hasMetaInfoAtom` 依赖 `metaTitleAtom` / `metaDescriptionAtom` / `metaSlugAtom`（`metaInfo.ts` L8-L13）。
其余 atom 之间独立——**没有**"滚动驱动主题"之类的隐式联动。

> 设计取舍：状态刻意保持"少而扁"，因为跨页状态会随 `main` 替换而失效；能放 CSS 变量的（主题色、壁纸）都放 CSS 变量，避免经过 JS 状态。

---

## 4. Hooks（`src/hooks/`）

### 4.1 `useCleanupOnPageLeave` —— 本项目的核心清理协议

```ts
export const ISLAND_CLEANUP_EVENT = 'mcy:island-cleanup'

export function useCleanupOnPageLeave(cleanup: () => void) {
  useEffect(() => {
    const handler = () => {
      cleanup()
      document.removeEventListener(ISLAND_CLEANUP_EVENT, handler)   // 清理后自我解绑
    }
    document.addEventListener(ISLAND_CLEANUP_EVENT, handler)
    return () => document.removeEventListener(ISLAND_CLEANUP_EVENT, handler)   // 正常 unmount 兜底
  }, [])
}
```

**协议链路**：

```
Swup 派发 swup:content:replace
      → Layout 内联脚本 dispatch new CustomEvent('mcy:island-cleanup')
            → 各岛注册的 handler 调用 cleanup() 释放 setInterval / rAF / IntersectionObserver / 事件监听
```

**为什么必须这样**：Swup 替换 `main` 的 DOM 时，React **不会**收到 unmount，`useEffect` 的 cleanup 永不执行；
不主动清理会导致"每切一页泄漏一批定时器/rAF/观察器"，页面越来越卡。
**正常卸载路径**（非 Swup 场景）由 `useEffect` 的 cleanup 兜底，两条路径共用同一套清理函数。

推荐用法（来自该 hook 的注释）：

```tsx
const cleanupRef = useRef<() => void>(() => {})
useEffect(() => { /* 注册资源 */; cleanupRef.current = () => { /* 释放资源 */ } }, [])
useCleanupOnPageLeave(() => cleanupRef.current())
```

**使用者**：`ParticlesBg`、`PostToc`、`Flashlight`、`TimelineProgress`（以及任何新增的需要释放资源的岛）。

### 4.2 `useDebounceValue`

```ts
export function useDebounceValue<T>(value: T, delay: number): T
```

标准防抖（`setTimeout` + cleanup）。当前仓库内**暂无调用方**，属于预留工具。

---

## 5. Modal 栈

一套极简的多层弹窗基础设施，位于 [`src/components/ui/modal/`](../../src/components/ui/modal/)。

### 5.1 API

```ts
// hooks.ts
export function useModal(): {
  present(props: { id?: string; content: React.ReactNode }): () => void   // 返回"关闭该弹窗"的函数
}
export function useCurrentModal(): { dismiss: () => void } | null          // 在弹窗内容内部使用
```

真实用法（[`ActionAside.tsx`](../../src/components/post/ActionAside.tsx#L44-L56)）：

```tsx
const { present } = useModal()
present({ content: <ShareModal url={url} text={text} /> })
```

- `useId()` + `useRef` 计数器生成唯一 `id`（`id = props.id ?? `${useId()}-${n++}``），避免同页多次打开冲突；
- `present` 通过 `setModalStack((s) => [...s, props])` 入栈，返回的函数按 `id` 过滤出栈。

### 5.2 渲染与层级

```tsx
// ModalStack.tsx（挂载于 Layout，client:only）
<AnimatePresence>
  {modalStack.map((modal, index) => <Modal key={modal.id} index={index} id={modal.id}>{modal.content}</Modal>)}
</AnimatePresence>
```

- 基于 `@radix-ui/react-dialog` 的 `Root` / `Portal` / `Overlay` / `Content`（自带焦点陷阱与 `Esc` 关闭）；
- **z-index 随栈深度递增**：`overlayZIndex = 1000 + index`，`contentZIndex = 1000 + index + 1` —— 多层弹窗天然叠放正确；
- 遮罩层 `motion.div` 淡入淡出，`exit` 有 `0.1s` 延迟（等上层先退场）；
- 点遮罩关闭：`Dialog.Content` 的 `onClick` 判断 `e.target === e.currentTarget`；
- 弹窗内容通过 `CurrentModalContext` 拿到 `dismiss()`，可在内容内部主动关闭自己；
- `AnimatePresence` 负责退出动画（`exit` 生效的前提：`Dialog.Root open` 恒为 `true`，关闭靠从栈里移除）。

> 因为 `ModalStack` 挂在 `Layout` body 末尾且 `client:only`，它**跨 Swup 切页存活**，
> 所以任何页面上的 `useModal().present()` 都能弹到同一个全局容器里。

---

## 6. 写一个新 React 岛时的检查清单

1. 选对指令：需要浏览器 API / 跨页存活 → `client:only="react"`；在首屏关键路径 → `client:load`；否则 `client:idle`；懒 → `client:visible`。
2. 若注册了 `setInterval` / rAF / `IntersectionObserver` / 事件监听：
   - 清理函数同时挂到 `useEffect` cleanup **和** `useCleanupOnPageLeave`；
3. 若输出内容依赖"当前时间 / 视口 / localStorage"：首帧必须输出一个**服务端也能算出**的值或占位（否则 hydration mismatch，#418/#423/#425）。
4. 若组件需要在切页后继续工作：**不要**把监听器挂在 `main` 内部节点上，挂 `document` / `window`。
5. 若它画在 Canvas 或做高频重绘：用 rAF 限流 + `{ passive: true }`，并考虑 `prefers-reduced-motion` 与触屏降级。
6. 需要全局状态时：优先 CSS 变量；确需跨岛共享才新增 Jotai atom（`src/store/` 下一个文件一个领域）。
