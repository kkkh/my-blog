---
title: 'Astro Gyoza 内容标签使用指南'
date: 2026-07-16
summary: 'Gyoza 主题排版功能完整文档 — 文字特效、彩色字体、键盘键、黑幕、标签块、KaTeX 公式、代码块高亮、表格增强、脚注、MDX 组件'
cover: 'https://mingcy.cn/image/mcy.png'
category: '网站建站'
tags: ['Astro', 'Gyoza', 'MDX', 'KaTeX', 'Markdown']
draft: false
comments: true
sticky: 1
---

Gyoza 主题内置了丰富的排版增强功能，远超标准 Markdown。本文档完整介绍所有功能，涵盖内联标签、数学公式、代码块、表格、MDX 组件等，适配亮色/暗黑模式。

## 文字特效

### 下划线

使用 `++文字++` 包裹即可生成红色下划线：

这是一段 ++含有下划线的文字++，效果明显。

### 波浪下划线

在 `<ins>` 标签上加 `class="wavy"` 实现波浪线：

这是一段 <ins class="wavy">含有波浪下划线的文字</ins>，像涟漪一样。

### 虚点下划线

在 `<ins>` 标签上加 `class="dot"` 实现虚点线：

这是一段 <ins class="dot">含有虚点下划线的文字</ins>，精致细腻。

### 彩色下划线

`<ins>` 支持多种颜色变体，通过 class 控制：

<ins class="primary">主要色下划线</ins>　
<ins class="success">成功绿下划线</ins>　
<ins class="warning">警告黄下划线</ins>　
<ins class="danger">危险红下划线</ins>　
<ins class="info">信息蓝下划线</ins>

## 荧光高亮

使用 `==高亮文字==` 包裹产生荧光笔效果：

这是一段 ==荧光高亮== 的文字，在亮色模式下为黄色，暗黑模式下为深琥珀色，护眼醒目。

## 上标与下标

使用 `^上标^` 和 `~下标~` 语法：

水的化学式是 H~~2~~O，地球表面积约为 510^百万平方公里^。

## 键盘键

使用 `<kbd>` 标签模拟键盘按键的 3D 视觉效果：

使用快捷键 <kbd>Ctrl</kbd> + <kbd>C</kbd> 复制，<kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴。

## 黑幕（Spoiler）

使用 `<span class="spoiler">` 隐藏敏感内容，鼠标悬停才显示：

下面这句话包含 <span class="spoiler">这是隐藏的黑幕内容，鼠标滑过即可查看</span> 黑幕效果。

### 模糊黑幕

加 `blur` 类实现模糊效果，鼠标悬停变清晰：

<span class="spoiler blur">这段文字默认模糊处理，悬停后变清晰可见</span>

## 彩色文字

使用 `<span class="c-颜色名">` 快速变换字体颜色：

| 类名       | 效果                                   |
| ---------- | -------------------------------------- |
| `c-red`    | <span class="c-red">红色文字</span>    |
| `c-pink`   | <span class="c-pink">粉色文字</span>   |
| `c-orange` | <span class="c-orange">橙色文字</span> |
| `c-yellow` | <span class="c-yellow">黄色文字</span> |
| `c-green`  | <span class="c-green">绿色文字</span>  |
| `c-aqua`   | <span class="c-aqua">青色文字</span>   |
| `c-blue`   | <span class="c-blue">蓝色文字</span>   |
| `c-purple` | <span class="c-purple">紫色文字</span> |
| `c-grey`   | <span class="c-grey">灰色文字</span>   |

组合使用示例：

<span class="c-red">红色</span>、<span class="c-blue">蓝色</span> 与 <span class="c-purple">紫色</span> 搭配使用，突出重点信息。

## 七彩渐变文字

使用 `<span class="rainbow">` 让文字流动变色：

<span class="rainbow">这是一段七彩渐变的动态文字，流光溢彩。</span>

## 内联标签块

使用 `<span class="label">` 配合颜色变体生成内联标签：

<span class="label default">default</span>　
<span class="label primary">primary</span>　
<span class="label success">success</span>　
<span class="label info">info</span>　
<span class="label warning">warning</span>　
<span class="label danger">danger</span>

也可以与彩色文字组合：

<span class="label primary"><span class="c-blue">主要</span>操作</span>　
<span class="label success">✓ 已完成</span>　
<span class="label danger">✗ 已失败</span>

## KaTeX 数学公式

主题通过 `remark-math` + `rehype-katex` 支持 LaTeX 数学公式渲染。

### 行内公式

用单个 `$` 包裹：质能方程 $E = mc^2$ 是物理学中最著名的公式。

### 块级公式

用双 `$$` 包裹：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

多行对齐公式：

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

### 矩阵公式

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

> KaTeX 支持大部分 LaTeX 数学环境，包括 `\begin{aligned}`、`\begin{pmatrix}`、`\sum`、`\int` 等。如果公式不渲染，请检查 LaTeX 语法是否正确。

## 代码块进阶

### 代码语言

在代码块开头指定语言即可激活语法高亮：

```typescript
const greeting: string = 'Hello, Gyoza!'
console.log(greeting)
```

### 行高亮

使用花括号标记需要高亮的行：

````md
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
````

### 文件标题

使用 `title` 参数添加文件标签：

````md
```typescript title="src/utils/math.ts"
export const add = (a: number, b: number): number => a + b
```
````

### 行号

代码块默认显示行号，方便引用：

```typescript
// 第 1 行
const a = 1
// 第 2 行
const b = 2
// 第 3 行
console.log(a + b)
```

## 表格增强

主题通过 `rehypeTableBlock` 插件对表格进行美化：

| 功能   | 语法          | 说明     |
| :----- | :------------ | :------- |
| 加粗   | `**文字**`    | 强调文本 |
| 斜体   | `*文字*`      | 次要强调 |
| 代码   | `` `code` ``  | 行内代码 |
| 删除线 | `~~文字~~`    | 标记删除 |
| 链接   | `[文本](url)` | 超链接   |
| 图片   | `![alt](src)` | 插入图片 |

表格支持左右对齐：

| 左对齐         | 居中对齐 | 右对齐 |
| :------------- | :------: | -----: |
| 内容           |   内容   |   内容 |
| 很长很长的内容 |   居中   |   靠右 |

## 脚注

用于添加注释或参考资料：

这是一个带脚注的句子。[^1] 这是另一个脚注引用。[^2]

[^1]: 这是脚注的内容，会显示在页面底部。

[^2]: 多个脚注会自动编号，底部按顺序排列。

## 图片画廊

Gyoza 主题内置了相册系统。在 `src/content/galleries/` 下创建目录并放置图片即可。

在文章中引用图片：

```md
![图片描述](image-name.webp)
```

图片会自动包裹在 `<figure>` 标签中，支持懒加载和点击放大预览（lightbox）。

## MDX 组件

使用 `.mdx` 扩展名即可在文章中直接导入 Astro 或 React 组件。

### LinkCard

在 `.mdx` 文件顶部导入 `LinkCard` 生成友链风格的链接卡片：

```mdx
import LinkCard from '@/components/LinkCard.astro'

<LinkCard
  title="GitHub"
  url="https://github.com"
  desc="全球最大的代码托管平台"
  image="https://github.githubassets.com/favicons/favicon.svg"
/>

<LinkCard title="Astro" url="https://astro.build" desc="现代化的 Web 框架" />
```

### Highlight

用于强调关键文字的 Astro 组件：

```astro
<Highlight>这段文字会被高亮标记</Highlight>
```

### AnimatedSignature

在文章末尾添加个性签名动画：

```mdx
import { AnimatedSignature } from '@/components/AnimatedSignature.tsx'

<AnimatedSignature />
```

## 科技感文字特效

主题内置一批科技感排版特效，配合既有特效使用：

### 霓虹辉光文字

使用 `<span class="neon">` 生成霓虹灯管效果，支持 4 种颜色变体：

<span class="neon">CYAN 青色霓虹</span>　
<span class="neon pink">PINK 粉色霓虹</span>　
<span class="neon blue">BLUE 蓝色霓虹</span>　
<span class="neon green">GREEN 绿色霓虹</span>

### 故障抖动文字

使用 `<span class="glitch" data-text="原文">` 生成赛博故障效果（`data-text` 必须与内容一致）：

<span class="glitch" data-text="SYSTEM BREACH">SYSTEM BREACH</span>

### 打字机光标

在文本后追加闪烁光标：

<span class="typewriter">正在初始化系统…</span>

### 扫描线

CRT 扫描高亮，适合强调关键词：

<span class="scanline">扫描中…</span>

### 科技渐变文字

流动渐变 + 辉光，随主题强调色变化：

<span class="gradient-text">TECH GRADIENT 科技渐变</span>

### 既有特效增强

- 彩色文字（`c-red` 等）增加霓虹辉光
- 彩虹文字（`rainbow`）增加彩色光晕
- 标签块（`label`）悬停时霓虹发光 + 上浮
- 键盘键（`kbd`）增加辉光，悬停变强调色
- 引用块（`blockquote`）左侧发光呼吸动画
- 行内代码改为**编程玫粉色**（亮色深玫粉 / 暗色浅玫粉）
- 代码块新增**复制按钮**（复制 / 已复制 ✓），Shiki 亮暗主题背景 + 圆角边框

## 总结

所有功能一览：

| 功能         | 语法                                      | 说明               |
| ------------ | ----------------------------------------- | ------------------ |
| 下划线       | `++文字++`                                | 红色下划线         |
| 波浪线       | `<ins class="wavy">文字</ins>`            | 波浪装饰下划线     |
| 虚点线       | `<ins class="dot">文字</ins>`             | 虚点装饰下划线     |
| 彩色下划线   | `<ins class="primary">文字</ins>`         | 5 种颜色           |
| 荧光高亮     | `==文字==`                                | 荧光笔效果         |
| 上标         | `^文字^`                                  | 上角标             |
| 下标         | `~文字~`                                  | 下角标             |
| 彩色文字     | `<span class="c-red">文字</span>`         | 9 种颜色可选       |
| 七彩文字     | `<span class="rainbow">文字</span>`       | 动态渐变色         |
| 键盘键       | `<kbd>Ctrl</kbd>`                         | 3D 按键效果        |
| 黑幕         | `<span class="spoiler">文字</span>`       | 悬停显示           |
| 模糊黑幕     | `<span class="spoiler blur">文字</span>`  | 悬停变清晰         |
| 内联标签     | `<span class="label primary">文字</span>` | 6 种颜色变体       |
| KaTeX 公式   | `$公式$` / `$$公式$$`                     | LaTeX 数学公式     |
| 代码行高亮   | ` ```ts {1,3-5} `                         | 标记指定行         |
| 代码文件标题 | ` ```ts title="file.ts" `                 | 显示文件名         |
| 表格增强     | 标准 Markdown 表格                        | 自动美化样式       |
| 脚注         | `[^1]` / `[^1]: 内容`                     | 页面底部注释       |
| 链接卡片     | `<LinkCard>`                              | 仅 `.mdx` 文章可用 |

## Fancybox 图片灯箱

主题集成了 [Fancybox](https://fancyapps.com/fancybox/) 作为**全站唯一图片预览组件**，文章图片和相册图片统一使用 Fancybox 灯箱。

### 自动生效

所有文章中的图片 **自动启用** 灯箱功能，无需额外配置。点击图片会弹出全屏预览，支持：

- 左右箭头/键盘方向键切换图片
- 手势缩放（移动端）
- Escape 关闭
- 灰色遮罩背景
- 显示图片描述文字（Markdown `![描述](图片)` 中的描述）

### 图片分组逻辑

- **文章页**（`/posts/**`）：单篇文章内所有图片归为一组（`data-fancybox="article"`），可在弹窗内左右滑动浏览
- **相册页**（`/galleries/**`）：同相册内所有图片归为一组（`data-fancybox="gallery"`），可在弹窗内左右滑动浏览

### 图片描述文字

使用 Markdown 图片语法时，`alt` 文字会显示在图片下方居中：

```md
![这是一张示例图片的描述文字](image.webp)
```

效果：图片下方会显示「这是一张示例图片的描述文字」作为图注。

### 相册页使用

相册页 `<a>` 标签会自动添加 `data-fancybox="gallery"` 属性，点击图片弹出灯箱而非跳转直链：

```html
<a href="原图.webp" data-fancybox="gallery" data-caption="图片描述">
  <img src="缩略图.webp" loading="lazy" alt="图片描述" />
</a>
```

## LivePhoto 实况照片

主题集成了 [HeoLivePhoto](https://livephoto.zhheo.com/)，支持在文章中嵌入实况照片（Live Photo）。

### 使用方式

#### 1. 单文件 `.pvt` 格式（推荐）

将 `.pvt` 文件放在 `public/` 目录下，然后在文章中使用普通 `img` 标签：

```md
![实况照片](/photo.pvt)
```

脚本会自动：

- 解析 `.pvt` 文件（ZIP 格式），提取封面 JPEG 和视频 MP4
- 桌面端：鼠标悬浮左上角「实况」徽标播放，移开停止
- 移动端：长按播放，松手停止

#### 2. 封面 + 视频分离

如果封面图和视频是分开的文件：

```html
<img src="cover.jpg" data-live-video="motion.mp4" alt="实况照片" />
```

#### 3. Apple 官方写法（LivePhotosKit 风格）

```html
<div
  data-live-photo
  data-photo-src="cover.jpg"
  data-video-src="motion.mp4"
  style="width: 320px; height: 320px"
></div>
```

### 参数说明

| 属性              | 说明                        | 默认值                            |
| ----------------- | --------------------------- | --------------------------------- |
| `src`             | `.pvt` 文件路径或封面图路径 | -                                 |
| `data-live-video` | 视频文件路径（MP4/MOV）     | -                                 |
| `data-live-loop`  | 是否循环播放                | `false`                           |
| `data-live-badge` | 左上徽标文字，`false` 隐藏  | 自动（中文「实况」/英文「LIVE」） |
| `data-live-pvt`   | `.pvt` 文件路径（替代 src） | -                                 |

### 生成 `.pvt` 文件

访问 [洪绘Live图](https://livephoto.zhheo.com/create.html) 在线合成：

- 上传 Apple 设备导出的 HEIC 封面 + MOV 视频
- 选择导出格式为 `.pvt`
- 下载后放到 `public/` 目录即可使用

### 注意事项

- `.pvt` 文件本质上是 ZIP 包，包含 JPEG 封面和 MP4/MOV 视频
- 跨域引用 `.pvt` 时，托管方需要允许 CORS
- 视频默认静音、不循环，适合社交媒体风格的实况照片展示
