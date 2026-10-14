---
title: 'Hexo 进阶：优雅地为博客添加音乐与视频'
date: 2022-05-01T14:32:19.847Z
lastMod: 2022-05-01T14:45:03.291Z
cover: ''
category: '技术分享'
tags: ['hexo', '实用', '多媒体']
draft: false
comments: true
---

## 前言

Hexo 作为一个轻量级的静态博客框架，其原生的 Markdown 渲染器（如 `hexo-renderer-marked`）并不直接支持插入多媒体内容。为了在文章中优雅地添加背景音乐或嵌入视频，我们需要借助第三方插件或原生的 HTML5 标签。

本文将详细介绍如何通过 **APlayer**（音频）和 **DPlayer**（视频）插件实现多媒体嵌入，并提供原生 HTML 的备用方案。

## 一、 插入音频（音乐）

推荐使用 `hexo-tag-aplayer` 插件，它是 APlayer 在 Hexo 上的封装，能够完美解决自动播放、播放列表、歌词显示等需求。

### 1. 安装插件

在博客根目录打开终端，运行以下命令安装插件：

```bash
npm install hexo-tag-aplayer
```

### 2. 使用 aplayer 标签

在 Markdown 文章中插入以下代码：

```text
{% aplayer "她的睫毛" "周杰伦" "http://home.ustc.edu.cn/~mmmwhy/%d6%dc%bd%dc%c2%d7%20-%20%cb%fd%b5%c4%bd%de%c3%ab.mp3" "http://home.ustc.edu.cn/~mmmwhy/jay.jpg" "autoplay=false" %}
```

> [!NOTE]
> 参数依次为：歌曲名、歌手、音频文件链接、封面图链接、额外参数（如 `autoplay=true` 自动播放，`theme="#FADFA3"` 设置主题色）。外链最好使用 HTTPS，以避免混合内容警告。

### 3. 原生 HTML5 方案（备用）

如果插件安装失败，或者你只需要极简的音频播放器，可以使用原生的 `<audio>` 标签。

> [!WARNING]
> 原文章中使用了 `<video>` 标签来播放音频（`.mp3`），这是不规范的。应使用 `<audio>` 标签。

```html
<audio
  src="https://music.163.com/song/media/outer/url?id=1490104654.mp3"
  controls
  preload="none"
  style="width: 100%;"
>
  您的浏览器不支持音频播放。
</audio>
```

**演示效果：**
<audio src="https://music.163.com/song/media/outer/url?id=1490104654.mp3" controls preload="none" style="width: 100%;"></audio>

> [!CAUTION]
> 网易云音乐的外链直链（`music.163.com/song/media/outer/url`）经常失效或受到 Referer 防盗链限制。建议将音频文件下载后放入 Hexo 的 `source` 目录，或托管到自己的云存储（如七牛云、Vercel Blob）中。

## 二、 插入视频

视频嵌入推荐使用 `hexo-tag-dplayer` 插件，支持弹幕、画质切换、自定义封面等高级功能。

### 1. 安装插件

在终端中运行：

```bash
npm install hexo-tag-dplayer
```

### 2. 使用 dplayer 标签

在 Markdown 文章中插入以下代码：

```text
{% dplayer "url=http://home.ustc.edu.cn/~mmmwhy/GEM.mp4" "pic=http://home.ustc.edu.cn/~mmmwhy/GEM.jpg" "loop=yes" "theme=#FADFA3" "autoplay=false" "token=tokendemo" %}
```

### 3. 原生 HTML5 方案（备用）

对于普通的 `.mp4` 文件，使用 `<video>` 标签即可：

```html
<video
  src="https://your-domain.com/media/video.mp4"
  poster="https://your-domain.com/media/cover.jpg"
  controls
  preload="metadata"
  style="width: 100%; border-radius: 8px;"
>
  您的浏览器不支持视频播放。
</video>
```

### 4. 嵌入 Bilibili 视频

对于 B站视频，**绝对不能直接把解析 API（如 `bili.1s.fan`）填进 `<video>` 的 `src` 里**。因为解析 API 返回的通常是 JSON 格式的直链，而不是视频文件本身。正确的方法是使用 iframe 嵌入官方播放器：

```html
<iframe
  src="//player.bilibili.com/player.html?bvid=BV1GJ411x7h7&page=1"
  scrolling="no"
  border="0"
  frameborder="no"
  framespacing="0"
  allowfullscreen="true"
  style="width: 100%; height: 500px; border-radius: 8px;"
>
</iframe>
```

> [!IMPORTANT]
> 如果你执意使用第三方的解析直链（如 `bili.1s.fan` 等），请注意这些接口极其不稳定，随时可能失效或被反爬拦截，且解析出来的音视频流直接放入 `<video>` 标签可能会导致跨域（CORS）报错无法播放。

## 三、 常见问题排查（FAQ）

- **插件标签在页面上直接原样显示（没被渲染成播放器）？**
  通常是因为 Markdown 渲染引擎与 Nunjucks 标签产生了冲突。尝试将 Hexo 的渲染器更换为 `hexo-renderer-pandoc`，或在 Nunjucks 标签外部包裹 `{% raw %}` 和 `{% endraw %}`。
- **aplayer 自动播放无效？**
  现代浏览器（Chrome、Safari、Edge 等）为了用户体验，**默认禁止带有声音的自动播放**。必须搭配 `muted` 静音属性，或者需要用户手动点击一次页面后才会生效。
- **插入的媒体在手机端排版错乱？**
  建议为 `<video>`、`<audio>` 或 `<iframe>` 标签统一设置 `style="width: 100%; height: auto;"`，以确保在移动端能够自适应容器宽度。

## 结语

通过 `aplayer` 与 `dplayer` 插件，你可以极大地丰富 Hexo 博客的视听体验。而在插件不适用的场景下，原生 HTML5 标签则是最后的保障。切记，**稳定的外链是多媒体播放的基石**，建议将重要的音视频资源托管到自己的可控服务器上。
