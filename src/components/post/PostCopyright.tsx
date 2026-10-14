import { author, site } from '@/config.json'
import { getFormattedDateTimeWithOptionalTime } from '@/utils/date'
import { AnimatedSignature } from '../AnimatedSignature'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

function getPostUrl(slug: string) {
  return new URL(slug, site.url).href
}

export function PostCopyright({
  title,
  slug,
  lastMod,
}: {
  title: string
  slug: string
  lastMod: Date
}) {
  const [lastModStr, setLastModStr] = useState('')
  const url = getPostUrl(slug)

  function handleCopyUrl() {
    navigator.clipboard.writeText(url)
    toast.success('已复制文章链接')
  }

  useEffect(() => {
    setLastModStr(getFormattedDateTimeWithOptionalTime(lastMod))
  }, [lastMod])

  return (
    <section className="text-xs leading-loose text-secondary">
      <p>文章标题：{title}</p>
      <p>文章作者：{author.name}</p>
      <p>
        <span>文章链接：{url}</span>
        <span role="button" className="cursor-pointer select-none" onClick={handleCopyUrl}>
          [复制]
        </span>
      </p>
      <p>最后修改时间：{lastModStr}</p>
      <hr className="my-3 border-primary" />
      <div>
        <div className="float-right ml-4 my-2">
          <AnimatedSignature />
        </div>
        <p>
          版权声明：商业性转载须事先联系站长并获得授权；在非商业用途下，您可在任何媒体以任何形式自由复制、分发、修改本作品或基于本作品进行再创作，但须完整注明原文出处及文章链接，且分发基于本作品产生的衍生作品时，必须采用与本作品相同的许可协议。
          <br />
          本文采用
          <a
            className="hover:underline hover:text-accent underline-offset-2"
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
          进行许可。
        </p>
      </div>
    </section>
  )
}
