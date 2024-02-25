import { githubIcon, readerIcon, warpIcon } from './icons.js'

export function QuickLinks() {
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
        <span class="text-gray-600">{readerIcon}</span>
        Frog Documentation
      </a>

      <a
        class="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
        rel="noreferrer"
        target="_blank"
        {...{
          ':href':
            '`https://warpcast.com/~/developers/frames?url=${data.body ? data.body.url : data.url}`',
        }}
      >
        <span class="text-gray-600">{warpIcon}</span>
        Warpcast Frame Validator
      </a>

      <a
        href="https://github.com/wevm/frog"
        target="_blank"
        rel="noreferrer"
        class="p-3 flex items-center gap-2.5 hover:bg-gray-100"
        style={{ textDecoration: 'none' }}
      >
        <span class="text-gray-600">{githubIcon}</span>
        GitHub Repo
      </a>
    </div>
  )
}
