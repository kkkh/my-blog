export interface LinkItem {
  name: string
  url: string
  avatar?: string
  desc?: string
}

export interface LinkCategory {
  title: string
  links: LinkItem[]
}

export const friendLinks: LinkCategory[] = [
  {
    title: '来看看大佬们',
    links: [
      {
        name: '秦超',
        url: 'https://www.43322.cn/',
        avatar: 'https://www.43322.cn/image/qin.png',
        desc: '秦超，海内存知己，天涯若比邻。',
      },
      {
        name: '园枢',
        url: 'https://jl.43322.cn',
        avatar: 'https://www.43322.cn/image/qin.png',
        desc: '天地广阔,大有可为',
      },
      {
        name: '开发阿雷',
        url: 'https://qqphp.com/',
        avatar: 'https://qqphp.com/favicon.ico',
        desc: '思考、制作，并留下值得回看的东西。',
      },
      {
        name: '清羽飞扬',
        url: 'https://blog.liushen.fun/',
        avatar: 'https://blog.liushen.fun/info/siteshot.jpg',
        desc: '柳影曳曳，清酒孤灯，扬笔撒墨，心境如霜',
      },
      {
        name: '张洪 Heo',
        url: 'https://blog.zhheo.com/',
        avatar: 'https://www.43322.cn/image/heo.webp',
        desc: '分享设计与科技生活',
      },
      {
        name: 'Mr. Nyampasu',
        url: 'https://blog.mpsxx.top/',
        avatar: 'https://blog.mpsxx.top/img/favicon.svg',
        desc: '分享、学习、生活',
      },
    ],
  },
  {
    title: '朋友们',
    links: [
      {
        name: '开发阿雷',
        url: 'https://qqphp.com/',
        avatar: 'https://qqphp.com/favicon.ico',
        desc: '思考、制作，并留下值得回看的东西。',
      },
    ],
  },
  {
    title: 'Link3',
    links: [
      {
        name: '烛·夜',
        url: 'https://link3.cc/ys520',
        avatar: 'http://img.magicalapp.cn/api/image/show/ec99ff165092639a33de1111970f2558',
        desc: '用心分享每一个资源',
      },
    ],
  },
  {
    title: '软件阁',
    links: [
      {
        name: '果核剥壳',
        url: 'https://www.ghxi.com',
        avatar:
          'https://www.ghxi.com/wp-content/uploads/member/avatars/d88a60f80f244ce5.1583550011.jpg',
        desc: '果核剥壳是一家综合科技站点，看新闻，分享精品、绿色软件，Windows 系统。守住互联网最后的一片净土。',
      },
      {
        name: '小众软件',
        url: 'https://www.appinn.com/',
        avatar: 'https://www.appinn.com/wp-content/uploads/apple-touch-icon-144x144.png',
        desc: '小众软件是一个分享、体验、评测电脑软件、手机应用、互联网产品的网站',
      },
      {
        name: '酷安',
        url: 'https://coolapk.com/',
        avatar: 'https://coolapk.com/favicon.ico',
        desc: '酷安是全球应用商店，提供各种应用、游戏、主题、漫画、音乐、视频、直播等。',
      },
    ],
  },
  {
    title: '大家庭',
    links: [
      {
        name: '十年之约',
        url: 'https://www.foreverblog.cn/blog/7586.html',
        avatar: 'https://www.foreverblog.cn/assets/images/site-v10/logo-dark.png',
        desc: '致敬还在写博客的我们！',
      },
      {
        name: '博友圈',
        url: 'https://www.boyouquan.com/blogs?keyword=www.43322.cn',
        avatar: 'https://www.boyouquan.com/assets/images/sites/logo/logo-small-dark.png',
        desc: '博客人的朋友圈，博客收录与文章 RSS 聚合网站。',
      },
      {
        name: '博客录（boke.lu）',
        url: 'https://boke.lu',
        avatar: 'https://boke.lu/logo.png',
        desc: 'boke.lu · 博客收录展示平台~',
      },
      {
        name: '好站网',
        url: 'https://haozhan.wang/',
        avatar: 'https://haozhan.wang/favicon.ico',
        desc: '发现好站、展示好站',
      },
      {
        name: '博客大联盟',
        url: 'https://bloginc.cn/20001.html',
        avatar: 'https://bloginc.cn/favicon.ico',
        desc: '优质中文博客图鉴',
      },
      {
        name: '博客大联盟',
        url: 'https://bo.ke/',
        avatar: 'https://bo.ke/favicon.ico',
        desc: '发现更多中文独立博客',
      },
      {
        name: 'BLogsClub',
        url: 'https://www.blogsclub.org/blog/951.html',
        avatar: 'https://www.blogsclub.org/usr/uploads/2025/01/805458213.jpg',
        desc: '个人博客俱乐部',
      },
      {
        name: '有个站',
        url: 'https://www.ygz.ink/detail.php?url=https%3A%2F%2F43322.cn',
        avatar: 'https://www.ygz.ink/favicon.svg',
        desc: '独立博客书架-博客聚合网站平台',
      },
      {
        name: '笔墨迹',
        url: 'https://blogscn.fun/blogs/01m4x1z9na1tkqd2qf3xx2087e',
        avatar: 'https://blogscn.fun/images/blogscn-logo.png',
        desc: '链接博客，也保留博客本来的样子。',
      },
    ],
  },
]
