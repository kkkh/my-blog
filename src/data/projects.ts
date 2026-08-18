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
    description: '茶香四溢，编程世界',
    image: 'image/blog.webp',
    tags: ['Hexo', 'JavaScript', 'CSS'],
    demoUrl: 'https://mingcy.cn',
    codeUrl: 'https://github.com/rumian0/astro',
  },
  {
    id: 2,
    title: '随机图',
    description: '随机图片API服务，提供多种类型的随机图片',
    image: 'image/sjt.webp',
    tags: ['API', 'PHP'],
    demoUrl: 'https://webp.mingcy.cn',
    codeUrl: '',
  },
  {
    id: 3,
    title: '笔记',
    description: '使用MD记录文本，分享知识',
    image: 'image/note.webp',
    tags: ['Markdown', 'JavaScript'],
    demoUrl: 'https://n.mingcy.cn',
    codeUrl: 'https://github.com/rumian0/liaotian',
  },
  {
    id: 4,
    title: 'Quonnki',
    description: '流媒体电影与电视剧播放平台',
    image: 'image/Quonnki.webp',
    tags: ['流媒体', '电影'],
    demoUrl: 'https://t.mingcy.cn',
    codeUrl: 'https://github.com/quonnki/QuonnkiTV',
  },
  {
    id: 5,
    title: '加密聊天',
    description: '端到端加密聊天',
    image: 'image/nodecrypt.webp',
    tags: ['加密', '聊天'],
    demoUrl: 'https://lt.mingcy.cn',
    codeUrl: 'https://github.com/shuaiplus/nodecrypt',
  },
  {
    id: 6,
    title: 'Github',
    description: '我的开源项目集合',
    image: 'image/github.webp',
    tags: ['开源', '代码'],
    demoUrl: 'https://github.com/rumian0',
    codeUrl: 'https://github.com/rumian0',
  },
]
