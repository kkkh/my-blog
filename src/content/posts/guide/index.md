---
title: Gyoza 使用指南
date: 2024-04-01
lastMod: 2024-08-10T03:58:16.758Z
summary: 欢迎使用 Gyoza，Gyoza 是一款 Astro 博客主题，它保持简洁和可爱的风格。本篇文章将会介绍如何使用并部署 Gyoza。
category: 网站建站
tags: [Astro, Gyoza]
---

## 前置条件

- node 版本 >= 18.18.0
- pnpm 版本 > 8.1.0

## 安装

### 克隆仓库

登录 Github 账号，打开 [lxchapu/astro-gyoza](https://github.com/lxchapu/astro-gyoza)，点击右上角的 Fork 按钮，将仓库克隆到你自己的账号下。

复制这个仓库的地址，打开终端，使用 `git clone` 命令将仓库克隆到本地。

> 本项目推荐使用 pnpm 作为你的包管理器，如果你还没有安装 pnpm，请先安装 pnpm。

### 安装依赖

```sh
cd astro-gyoza
pnpm install
```

### 命令介绍

本地运行

```sh
pnpm dev
```

打包静态文件

```sh
pnpm build
```

本地预览

```sh
pnpm preview
```

### 配置项

本项目中的绝大部分配置都定义在 `src/config.json` 文件中。

你应该首先将 `site.url` 修改成自己的域名，避免导航错误。

以下是配置项的说明：

```json
{
  "site": {
    "url": "", // 网站地址
    "title": "", // 网站标题
    "description": "", // 通用的网站描述 SEO
    "keywords": "", // 通用的网站关键词 SEO
    "lang": "zh-CN", // 网站的语言
    "favicon": "", // 浏览器图标，存放在 public 目录下
    "appleTouchIcon": "" // 苹果设备图标，存放在 public 目录下
  },
  "author": {
    "name": "", // 作者名称
    "twitterId": "", // 推特账号 ID，以 @ 开头，用于 Open Graph
    "avatar": "" // 作者头像地址
  },
  // 首页 Hero 组件
  "hero": {
    "name": "", // 显示的名称
    "bio": "", // 一句话介绍
    "description": "", // 补充描述
    // 社交账号
    "socials": [
      {
        "name": "", // 社交平台类型
        "icon": "", // 社交平台图标
        "url": "", // 链接
        "color": "" // 图标颜色
      }
    ],
    "yiyan": "" // 显示一言
  },
  "color": {
    // 强调色，请填写 16 进制颜色值。每次会从中随机取出一组
    "accent": [{ "light": "", "dark": "" }],
    // 背景色
    "bg": {
      "primary": { "light": "", "dark": "" },
      "secondary": { "light": "", "dark": "" }
    },
    // 文字颜色
    "text": {
      "primary": { "light": "", "dark": "" },
      "secondary": { "light": "", "dark": "" }
    },
    // 边框颜色
    "border": {
      "primary": { "light": "", "dark": "" }
    }
  },
  // 顶部导航栏
  "menus": [
    {
      "name": "首页",
      "link": "/",
      "icon": "icon-pantone"
    }
  ],
  "posts": {
    "perPage": 10 // 每一页显示的文章数量
  },
  "footer": {
    "startTime": "" // 博客网站开始时间 请使用 ISO 格式
  },
  // Waline 评论系统，前往 https://waline.js.org/ 查看
  "waline": {
    "serverURL": ""
  },
  // 赞助
  "sponsor": {
    "wechat": "" // 微信赞赏码图片地址
  },
  // 如果需要使用网站数据统计，将 enable 修改为 true，并填写对应的配置
  "analytics": {
    "enable": false,
    // https://analytics.google.com
    "google": {
      "measurementId": ""
    },
    // https://umami.is/docs
    "umami": {
      "serverUrl": "",
      "websiteId": ""
    },
    // https://clarity.microsoft.com/
    "microsoftClarity": {
      "projectId": ""
    }
  }
}
```

## 部署

> 这里只介绍了 Vercel，你当然可以选择其他平台例如：Cloudflare Pages 或你自己的服务器。  
> 部署之前，确保你已经修改 `site.url`。

### 部署到 Vercel

登录 Vercel 账号，点击右上角的 Add new... 选择 Project。然后在 Import Git Repository 中选择刚刚 Fork 的仓库，点击 Import 按钮。

进入项目配置页面，直接点击 Deploy 按钮，静静等待部署完成就 👌 了。

Vercel 会为你分配一个域名，你可以在项目设置中设置自定义域名，更多操作请参考 Vercel 文档。

Gyoza 选择 font-class 的方式引用图标。这些图标大部分来源于 [Remix Icons](https://remixicon.com/)，并且在 [iconfont](https://www.iconfont.cn/) 上进行管理和导出。

下图展示了项目中的所有图标：

![所有图标](https://s2.loli.net/2024/05/08/mbdT5HqYMEajyRG.webp)

当你在添加首页显示的社交账号时，你可能会想要使用这些图标。在对应的配置项中填写图标下面有 `icon-` 前缀的名称即可。

如果是在组件中使用图标，可以按照如下方式：

```jsx
<i className="iconfont icon-xxx"></i>
```

## 为什么不是 SVG 图标？

你可能看到很多的项目在使用 [iconify](https://iconify.design/)。iconify 是一个开源图标集，包含超过 20 万个图标，提供了多种框架的引入方式。Astro 中也有对应的插件 astro-icon 可以使用（如果对此感兴趣，可以查看他们的[文档](https://github.com/natemoo-re/astro-icon)）。

我在项目中也尝试使用过 iconify，但是出于以下几个原因，我最终还是转向了 font-class 的方式：

- 由于项目中同时使用了 Astro 和 React，而在 Astro 组件和 React 组件中使用 iconify 图标的方式是不同的，这会导致代码中不得不存在两种使用方式。
- iconify 在加载时需要请求它的服务器，~~我会担心请求失败~~，虽然这种担心是多余的。
- 有一个功能是我会在渲染文章时往 markdown 中注入一些图标，例如外部链接尾部的图标，iconify 想要做到这一点并不方便。
- 在 HTML 中直接嵌入 SVG icon 的方式并不优雅，使用 font-class 只需要对应的类名，感觉相较而言最终的 HTML 体积小一点，页面加载会快点。我还没有做过具体的测试，但是至少我会尽量避免页面中出现大量的 SVG 仅仅只是作为图标使用。
- 该项目中用到的图标并不多，主要是一些常用的社交账号的图标，供自定义联系方式时使用。我希望所有图标集中在一起管理，这样更方便一点。

我必须要承认，目前的图标方案并不优雅，每当图标集合发生修改时我都需要更新对应的字体文件和 CSS 文件。而且其他人想要管理图标集合也变得困难。

也许我会在未来尝试其他方式，例如 [@iconify/tailwind](https://github.com/iconify/iconify/tree/main/plugins/tailwind)，如果你有更好的方案，也欢迎给我留言。

## 自定义图标

如果你想要替换 iconfont 的图标，请修改以下文件：

```text
public/fonts/iconfont.ttf
public/fonts/iconfont.woff
public/fonts/iconfont.woff2
src/styles/iconfont.css
```

注意，这将会替换掉项目中使用的所有图标，所以请确保你知道自己在做什么。
