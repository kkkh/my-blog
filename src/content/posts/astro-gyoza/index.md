---
title: 'Astro Gyoza 内容标签与排版特效全指南'
date: 2022-02-25T17:37:24.618+08:00
lastMod: 2022-02-25T17:43:52.907+08:00
cover: 'https://blog.43322.cn/image/qin.png'
category: '网站建站'
tags: ['Astro', 'Gyoza', 'MDX', 'KaTeX', 'Markdown']
draft: false
comments: true
sticky: 1
---

## 前言

Gyoza 主题内置了极为丰富的排版增强功能，远超标准的 Markdown 语法。本文档将作为一份完整的参考手册，系统性地介绍所有内联标签、数学公式、代码块、表格、MDX 组件以及主题集成的深层功能，适配亮色与暗黑模式。

> [!NOTE]
> 本文档中的所有语法均基于 Gyoza 主题的底层实现。部分语法（如 `++` 下划线、`==` 高亮）依赖 `remark` 系列插件，若迁移到其他主题请注意兼容性。

## 一、 基础文字特效

### 1.1 下划线变体

Gyoza 提供了多种下划线效果，分别使用标准语法或 HTML 标签实现：

- **标准下划线**：使用 `++文字++` 包裹即可生成红色下划线。
  > 效果：这是一段 ++含有下划线的文字++，效果明显。
- **波浪下划线**：在 `<ins>` 标签上加 `class="wavy"`。
  > 效果：这是一段 <ins class="wavy">含有波浪下划线的文字</ins>，像涟漪一样。
- **虚点下划线**：在 `<ins>` 标签上加 `class="dot"`。
  > 效果：这是一段 <ins class="dot">含有虚点下划线的文字</ins>，精致细腻。

### 1.2 彩色下划线

`<ins>` 支持通过 class 控制多种颜色变体：

<ins class="primary">主要色下划线</ins>　
<ins class="success">成功绿下划线</ins>　
<ins class="warning">警告黄下划线</ins>　
<ins class="danger">危险红下划线</ins>　
<ins class="info">信息蓝下划线</ins>

### 1.3 荧光高亮与上下标

- **荧光高亮**：使用 `==高亮文字==` 包裹。效果：这是一段 ==荧光高亮== 的文字，在亮色模式下为黄色，暗黑模式下为深琥珀色，护眼醒目。
- **上标**：使用 `^上标^` 语法。效果：地球表面积约为 510^百万平方公里^。
- **下标**：使用 `~下标~` 语法。效果：水的化学式是 H~~2~~O。

### 1.4 键盘按键

使用 `<kbd>` 标签模拟键盘按键的 3D 视觉效果。

> 效果：使用快捷键 <kbd>Ctrl</kbd> + <kbd>C</kbd> 复制，<kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴。

## 二、 黑幕与彩色文字

### 2.1 黑幕（Spoiler）

使用 `<span class="spoiler">` 隐藏敏感内容，鼠标悬停才显示。

> 效果：下面这句话包含 <span class="spoiler">这是隐藏的黑幕内容，鼠标滑过即可查看</span> 黑幕效果。

同时支持模糊黑幕，加 `blur` 类实现，鼠标悬停变清晰：

> 效果：<span class="spoiler blur">这段文字默认模糊处理，悬停后变清晰可见</span>

### 2.2 彩色文字

使用 `<span class="c-颜色名">` 快速变换字体颜色：

| 类名       | 效果                                   | 类名       | 效果                                   |
| :--------- | :------------------------------------- | :--------- | :------------------------------------- |
| `c-red`    | <span class="c-red">红色文字</span>    | `c-pink`   | <span class="c-pink">粉色文字</span>   |
| `c-orange` | <span class="c-orange">橙色文字</span> | `c-yellow` | <span class="c-yellow">黄色文字</span> |
| `c-green`  | <span class="c-green">绿色文字</span>  | `c-aqua`   | <span class="c-aqua">青色文字</span>   |
| `c-blue`   | <span class="c-blue">蓝色文字</span>   | `c-purple` | <span class="c-purple">紫色文字</span> |
| `c-grey`   | <span class="c-grey">灰色文字</span>   |            |                                        |

- **组合使用**：<span class="c-red">红色</span>、<span class="c-blue">蓝色</span> 与 <span class="c-purple">紫色</span> 搭配使用，突出重点信息。
- **七彩渐变文字**：使用 `<span class="rainbow">` 让文字流动变色。<span class="rainbow">这是一段七彩渐变的动态文字，流光溢彩。</span>

## 三、 内联标签块与科技感特效

### 3.1 内联标签

使用 `<span class="label">` 配合颜色变体生成内联标签。

<span class="label default">default</span>　
<span class="label primary">primary</span>　
<span class="label success">success</span>　
<span class="label info">info</span>　
<span class="label warning">warning</span>　
<span class="label danger">danger</span>

可以与彩色文字组合使用：<span class="label primary"><span class="c-blue">主要</span>操作</span>　<span class="label success">✓ 已完成</span>　<span class="label danger">✗ 已失败</span>

### 3.2 科技感文字特效

主题内置一批科技感排版特效，营造赛博朋克氛围。

- **霓虹辉光**：使用 `<span class="neon">`，支持 4 种颜色变体（pink、blue、green）。
  > 效果：<span class="neon">CYAN 青色霓虹</span>　<span class="neon pink">PINK 粉色霓虹</span>　<span class="neon blue">BLUE 蓝色霓虹</span>　<span class="neon green">GREEN 绿色霓虹</span>
- **故障抖动**：使用 `<span class="glitch" data-text="原文">`，注意 `data-text` 必须与内容一致。
  > 效果：<span class="glitch" data-text="SYSTEM BREACH">SYSTEM BREACH</span>
- **打字机光标**：在文本后追加闪烁光标。
  > 效果：<span class="typewriter">正在初始化系统…</span>
- **扫描线**：CRT 扫描高亮，适合强调关键词。
  > 效果：<span class="scanline">扫描中…</span>
- **科技渐变**：流动渐变 + 辉光，随主题强调色变化。
  > 效果：<span class="gradient-text">TECH GRADIENT 科技渐变</span>

## 四、 数学公式 (KaTeX)

主题通过 `remark-math` + `rehype-katex` 支持 LaTeX 数学公式渲染。

### 4.1 行内公式

用单个 `$` 包裹：质能方程 $E = mc^2$ 是物理学中最著名的公式。

### 4.2 块级与多行公式

用双 `$$` 包裹。多行对齐公式示例：

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

### 4.3 矩阵公式

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
e \\
f
\end{pmatrix}
$$

> [!TIP]
> KaTeX 支持大部分 LaTeX 数学环境，包括 `\begin{aligned}`、`\begin{pmatrix}`、`\sum`、`\int` 等。如果公式不渲染，请检查 LaTeX 语法是否正确。

## 五、 代码块与表格

### 5.1 代码块进阶

- **指定语言**：在代码块开头指定语言即可激活语法高亮。
  ```typescript
  const greeting: string = 'Hello, Gyoza!'
  console.log(greeting)
  ```
- **行高亮**：使用花括号标记需要高亮的行。
  ```typescript {2,4-5}
  function fibonacci(n: number): number {
    if (n <= 1) return n // 高亮行
    let a = 0,
      b = 1
    for (let i = 2; i <= n; i++) {
      // 高亮区域
      const c = a + b
      a = b
      b = c
    }
    return b
  }
  ```
- **文件标题**：使用 `title` 参数添加文件标签。
  ```typescript title="src/utils/math.ts"
  export const add = (a: number, b: number): number => a + b
  ```
- **行号**：代码块默认显示行号，方便引用。

### 5.2 表格增强

主题通过 `rehypeTableBlock` 插件对表格进行美化，并支持对齐。

| 功能   | 语法          | 说明     |
| :----- | :------------ | :------- |
| 加粗   | `**文字**`    | 强调文本 |
| 斜体   | `*文字*`      | 次要强调 |
| 代码   | `` `code` ``  | 行内代码 |
| 删除线 | `~~文字~~`    | 标记删除 |
| 链接   | `[文本](url)` | 超链接   |

**表格左右对齐**：

| 左对齐         | 居中对齐 | 右对齐 |
| :------------- | :------: | -----: |
| 内容           |   内容   |   内容 |
| 很长很长的内容 |   居中   |   靠右 |

### 5.3 脚注

用于添加注释或参考资料：这是一个带脚注的句子。[^1] 这是另一个脚注引用。[^2]

[^1]: 这是脚注的内容，会显示在页面底部。

[^2]: 多个脚注会自动编号，底部按顺序排列。

## 六、 媒体与组件 (MDX)

### 6.1 图片画廊与灯箱

Gyoza 集成了 **Fancybox** 作为全站唯一图片预览组件。所有文章图片 **自动启用** 灯箱功能，无需额外配置。

- **图片分组**：文章页内所有图片归为一组（`data-fancybox="article"`），相册页归为 `gallery` 组，支持左右箭头/键盘方向键切换。
- **图片描述**：使用 Markdown 图片语法 `![描述](图片.webp)`，描述文字会显示在图片下方居中。

### 6.2 LivePhoto 实况照片

主题集成了 [HeoLivePhoto](https://livephoto.zhheo.com/)，支持在文章中嵌入实况照片。推荐将 `.pvt` 文件放在 `public/` 目录下，使用普通 `img` 标签：`![实况照片](/photo.pvt)`。

- **交互逻辑**：桌面端鼠标悬浮左上角「实况」徽标播放，移开停止；移动端长按播放，松手停止。
- **分离写法**：`<img src="cover.jpg" data-live-video="motion.mp4" alt="实况照片" />`

### 6.3 MDX 组件（LinkCard 等）

使用 `.mdx` 扩展名即可在文章中直接导入 Astro 或 React 组件。以 `LinkCard` 为例，在 `.mdx` 文件顶部导入后即可使用：

```mdx
import LinkCard from '@/components/LinkCard.astro'

<LinkCard
  title="GitHub"
  url="https://github.com"
  desc="全球最大的代码托管平台"
  image="https://github.githubassets.com/favicons/favicon.svg"
/>
```
