export interface Project {
  id: number
  title: string
  description: string
  image: string
  tags: string[]
  demoUrl: string
  codeUrl: string
}

export const projects: Project[] = [
  {
    id: 1,
    title: '博客',
    description: '天地广阔，大有可为',
    image: 'image/blog.webp',
    tags: ['Hexo', 'JavaScript', 'CSS'],
    demoUrl: 'https://www.43322.cn',
    codeUrl: 'https://github.com/kkkh/my-blog',
  },
  {
    id: 2,
    title: '随机图',
    description: '随机图片 API 服务：多种类型，随机获取。',
    image: 'image/sjt.webp',
    tags: ['API', 'PHP', 'Vercel'],
    demoUrl: 'https://webp.43322.cn',
    codeUrl: '',
  },
  {
    id: 3,
    title: '笔记',
    description: '用 Markdown 记录文本，让知识因分享而流动。',
    image: 'image/note.webp',
    tags: ['Markdown', '记录'],
    demoUrl: 'https://n.43322.cn',
    codeUrl: 'https://github.com/kkkh/fastcloudnote',
  },
  {
    id: 4,
    title: 'Quonnki',
    description: '电影与电视剧流媒体播放平台',
    image: 'image/Quonnki.webp',
    tags: ['流媒体', '电影'],
    demoUrl: 'https://t.43322.cn',
    codeUrl: 'https://github.com/kkkh/tv',
  },
  {
    id: 5,
    title: '图床',
    description: '图片分享',
    image: 'image/tuchuang.webp',
    tags: ['图床', '图片'],
    demoUrl: 'https://img.43322.cn',
    codeUrl: 'https://github.com/kkkh/image',
  },
  {
    id: 6,
    title: 'Github',
    description: '我的项目主页',
    image: 'image/github.webp',
    tags: ['开源', '代码'],
    demoUrl: 'https://github.com/kkkh',
    codeUrl: 'https://github.com/kkkh',
  },
  {
    id: 7,
    title: '笔记',
    description: '开源 Markdown 编辑器 —— 你的笔记新家园。',
    image: 'image/notes.webp',
    tags: ['笔记', 'Markdown'],
    demoUrl: 'https://e.43322.cn',
    codeUrl: 'https://github.com/kkkh/haptic-web',
  },
  {
    id: 8,
    title: '集合',
    description: '现代化的内容导航管理平台',
    image: 'image/NavSphere.webp',
    tags: ['导航', 'NavSphere', '内容管理'],
    demoUrl: 'https://h.43322.cn',
    codeUrl: 'https://github.com/kkkh/NavSphere',
  },
  {
    id: 9,
    title: '加速',
    description: '让每个人都有自己的 Docker 私服，Make Docker Great Again。',
    image: 'image/Pocker.webp',
    tags: ['镜像', '网关', 'Docker'],
    demoUrl: 'https://d.43322.cn',
    codeUrl: 'https://github.com/kkkh/pocker',
  },
  {
    id: 10,
    title: '云文档 - Markdown',
    description: '一个简洁、高效、安全的在线笔记平台',
    image: 'image/notecloud.webp',
    tags: ['云文档', '记录', '构思', '存档', '云端'],
    demoUrl: 'https://note.43322.cn',
    codeUrl: 'https://github.com/kkkh/Ongwu-Note',
  },
]
