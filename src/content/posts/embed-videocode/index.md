---
title: Markdown 进阶：在文章中优雅地嵌入多媒体内容
date: 2022-03-12T08:08:24.618Z
lastMod: 2022-03-12T08:08:52.437Z
tags: [Video, Markdown, 多媒体]
category: 网站建站
---

## 前言

在技术博客中，单纯的文字和静态代码块往往不足以表达清楚。Gyoza 主题基于 Astro 强大的 Markdown 拓展能力，内置了自定义的 **Markdown 指令（Directives）**，让你无需编写繁琐的 HTML 标签，即可优雅地在文章中嵌入代码演示与多媒体视频。

本文将分别介绍 CodePen、YouTube 和 Bilibili 的嵌入方法，并附上获取对应 ID 的详细指南。

> [!NOTE]
> 下方展示的 `::语法` 是 Gyoza 特有的 Markdown 扩展语法，部分自定义静态博客引擎需要安装对应插件，请确保你的主题支持该功能。

## 一、嵌入 CodePen 代码演示

CodePen 是前端开发者分享和调试代码的最佳平台。Gyoza 允许你通过简单的指令直接嵌入笔（Pen）。

### 语法格式

```md
::codepen{#Pen_ID author="作者名"}
```
