import { GitHubLogoIcon, ReaderIcon } from '@radix-ui/react-icons'

import { WarpIcon } from './icons.js'

type QuickLinksProps = {
  url: string
}

export function QuickLinks(props: QuickLinksProps) {
  const { url } = props
  return (
    <div
      className="border bg-background-100  rounded-md divide-y font-medium text-gray-700 overflow-hidden"
      style={{ fontSize: '0.8125rem' }}
    >
      <a
        href="https://frog.fm"
        target="_blank"
        rel="noreferrer"
        className="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
      >
        <ReaderIcon className="text-gray-600" />
        Frog Documentation
      </a>

      <a
        className="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
        rel="noreferrer"
        target="_blank"
        href={`https://warpcast.com/~/developers/frames?url=${url}`}
      >
        <WarpIcon className="text-gray-600" />
        Warpcast Frame Validator
      </a>

      <a
        href="https://github.com/wevm/frog"
        target="_blank"
        rel="noreferrer"
        className="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
      >
        <GitHubLogoIcon className="text-gray-600" />
        GitHub Repo
      </a>
    </div>
  )
}
