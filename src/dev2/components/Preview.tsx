import { type Frame } from '../types.js'
import { clsx } from '../lib/clsx.js'
import { externalLinkIcon, warpIcon } from './icons.js'
import { useState } from '../hooks/useState.js'
import { useDispatch } from '../hooks/useDispatch.js'

type PreviewProps = {
  frame: Frame
  url: string
}

export function Preview(props: PreviewProps) {
  const { frame, url } = props

  const buttonCount = frame.buttons?.length ?? 0
  const hasIntents = Boolean(frame.input || frame.buttons?.length)

  return (
    <div class="lg:w-frame lg:min-h-frame w-full h-full">
      <div class="relative rounded-md relative w-full">
        <Img
          aspectRatio={frame.imageAspectRatio}
          hasIntents={hasIntents}
          src={frame.imageUrl}
          title={frame.title}
        />

        {hasIntents && (
          <div class="bg-background-100 flex flex-col px-4 py-2 gap-2 rounded-bl-md rounded-br-md border-t-0 border">
            {frame.input && <Input placeholder={frame.input.text} />}

            {frame.buttons && (
              <div
                class={clsx(['grid', 'gap-2.5', `grid-cols-${buttonCount}`])}
              >
                {frame.buttons.map((button) => (
                  <Button
                    index={button.index}
                    target={button.target}
                    title={button.title}
                    type={button.type}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div class="text-xs mt-1 text-right">
        <a class="text-gray-700 font-medium" href={url}>
          {new URL(url).host}
        </a>
      </div>
    </div>
  )
}

type ImgProps = {
  aspectRatio: string
  hasIntents: boolean
  src: string
  title: string
}

function Img(props: ImgProps) {
  const { aspectRatio, hasIntents, src, title } = props

  return (
    <img
      class={clsx([
        'bg-background-200',
        'border',
        'border-gray-200',
        'min-h-img',
        'object-cover',
        'rounded-t-lg',
        'text-background-200',
        'w-full',
        !hasIntents && 'rounded-lg',
      ])}
      style={{
        aspectRatio: aspectRatio.replace(':', '/'),
        maxHeight: '532.5px',
      }}
      src={src}
      alt={title ?? 'Farcaster frame'}
    />
  )
}

type InputProps = {
  placeholder: string
}

function Input(props: InputProps) {
  const { placeholder } = props

  const { inputText } = useState()
  const { setState } = useDispatch()

  return (
    <input
      aria-label={placeholder}
      autocomplete="off"
      class="bg-background-200 rounded-md border px-3 py-2.5 text-sm leading-snug w-full"
      name="inputText"
      placeholder={placeholder}
      type="text"
      value={inputText}
      onChange={(e) =>
        setState((x) => ({
          ...x,
          inputText: (e.target as HTMLInputElement).value,
        }))
      }
    />
  )
}

type ButtonProps = {
  index: number
  target?: string | undefined
  title: string
  type: NonNullable<Frame['buttons']>[number]['type']
}

function Button(props: ButtonProps) {
  const { index, target, title, type } = props
  const { frame, inputText, overrides, user } = useState()
  const { postFrameAction, setState } = useDispatch()

  const buttonClass =
    'bg-gray-alpha-100 border-gray-200 flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4 w-full'
  const innerHtml = (
    <span class="whitespace-nowrap overflow-hidden text-ellipsis text-gray-1000 font-medium">
      {title}
    </span>
  )

  const leavingAppPrompt = (
    <div
      x-show="open"
      class="flex flex-col gap-1.5 border bg-background-100 p-4 rounded-lg text-center absolute"
      style={{
        marginTop: '4px',
        width: '20rem',
        zIndex: '10',
      }}
      {...{
        '@click.outside': 'open = false',
        '@keyup.escape': 'open = false',
        'x-trap': 'open',
      }}
    >
      <h1 class="font-semibold text-base text-gray-1000">Leaving Warpcast</h1>
      <div class="line-clamp-2 text-gray-700 text-sm font-mono" x-text="url" />
      <p class="text-sm leading-snug text-gray-900">
        If you connect your wallet and the site is malicious, you may lose
        funds.
      </p>
      <div class="flex gap-1.5 mt-1.5">
        <button
          class="bg-background-100 border rounded-md w-full text-sm font-medium py-2"
          type="button"
          x-on:click="open = false"
        >
          Cancel
        </button>
        <button
          class="bg-red-400 hover:bg-red-300 rounded-md w-full text-sm text-bg font-medium py-2"
          type="button"
          x-on:click={`open = false; window.open(url, '_blank');`}
        >
          Continue
        </button>
      </div>
    </div>
  )

  if (type === 'link')
    return (
      <div>
        <button
          class={buttonClass}
          type="button"
          x-on:click="
              url = button.target
              open = true
            "
        >
          {innerHtml}
          <div class="text-gray-900" style={{ marginTop: '2px' }}>
            {externalLinkIcon}
          </div>
        </button>

        {leavingAppPrompt}
      </div>
    )

  if (type === 'mint')
    return (
      <div style={{ display: 'contents' }} x-data="{ open: false }">
        <button class={buttonClass} type="button" x-on:click="open = true">
          <div>{warpIcon}</div>
          {innerHtml}
        </button>
        {/* <MintDialog /> */}
      </div>
    )

  if (type === 'post_redirect')
    return (
      <div>
        <button
          class={buttonClass}
          type="button"
          x-on:click={`
              if (open) return
              const body = {
                buttonIndex: index,
                castId: {
                  fid: overrides.castFid,
                  hash: overrides.castHash,
                },
                fid: overrides.userFid !== user?.userFid ? overrides.userFid : user.userFid,
                inputText,
                state: frame.state,
                url: target ?? frame.postUrl,
              }
              postFrameRedirect(body)
                .then((json) => {
                  const id = json.id
                  dataKey = id

                  const nextStackIndex = stackIndex + 1
                  if (nextStackIndex < stack.length) stack = [...stack.slice(0, nextStackIndex), id]
                  else stack = [...stack, id]
                  stackIndex = nextStackIndex

                  if (json.response.status === 302) {
                    url = json.response.location
                    open = true
                    inputText = ''
                  }
                })
                .catch(console.error)
          `}
        >
          {innerHtml}
          <div class="text-gray-900" style={{ marginTop: '2px' }}>
            {externalLinkIcon}
          </div>
        </button>

        {leavingAppPrompt}
      </div>
    )

  return (
    <button
      class={buttonClass}
      type="button"
      onClick={async () => {
        const body = {
          buttonIndex: index,
          castId: {
            fid: overrides.castFid,
            hash: overrides.castHash,
          },
          fid:
            overrides.userFid !== user?.userFid
              ? overrides.userFid
              : user.userFid,
          inputText,
          state: frame.state,
          url: target ?? frame.postUrl,
        }
        const json = await postFrameAction(body)
        const id = json.id

        setState((x) => {
          const nextStackIndex = x.stackIndex + 1
          return {
            ...x,
            dataKey: id,
            inputText: '',
            stack:
              nextStackIndex < x.stack.length
                ? [...x.stack.slice(0, nextStackIndex), id]
                : [...x.stack, id],
            stackIndex: nextStackIndex,
          }
        })
      }}
    >
      {innerHtml}
    </button>
  )
}
