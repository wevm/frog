import { githubIcon, readerIcon, warpIcon } from './icons.js'

type QuickLinksProps = {
  url: string
}

export function QuickLinks(props: QuickLinksProps) {
  const { url } = props
  return (
    <div
      class="border bg-background-100  rounded-md divide-y font-medium text-gray-700 overflow-hidden"
      style={{ fontSize: '0.8125rem' }}
    >
      <a
        href="https://frog.fm"
        target="_blank"
        rel="noreferrer"
        class="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
      >
        <span
          class="text-gray-600"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: readerIcon.toString() }}
        />
        Frog Documentation
      </a>

      <a
        class="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
        rel="noreferrer"
        target="_blank"
        href={`https://warpcast.com/~/developers/frames?url=${url}`}
      >
        <span
          class="text-gray-600"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: warpIcon.toString() }}
        />
        Warpcast Frame Validator
      </a>

      <a
        href="https://github.com/wevm/frog"
        target="_blank"
        rel="noreferrer"
        class="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
      >
        <span
          class="text-gray-600"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: githubIcon.toString() }}
        />
        GitHub Repo
      </a>
    </div>
  )
}
