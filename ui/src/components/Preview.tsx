import { ExternalLinkIcon, LightningBoltIcon } from '@radix-ui/react-icons'
import clsx from 'clsx'
import { useRef, useState } from 'react'

import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useStore } from '../hooks/useStore.js'
import { store } from '../lib/store.js'
import { Frame } from '../types/frog.js'
import { handlePost, handlePostRedirect } from '../utils/actions.js'
import { WarpIcon } from './Icons.js'

type PreviewProps = {
  frame: Frame
  url: string
}

export function Preview(props: PreviewProps) {
  const { frame, url } = props

  const buttonCount = frame.buttons?.length ?? 0
  const hasIntents = Boolean(frame.input || frame.buttons?.length)

  return (
    <div className="lg:w-frame lg:min-h-frame w-full h-full">
      <div className="relative rounded-md relative w-full">
        <Img
          aspectRatio={frame.imageAspectRatio}
          hasIntents={hasIntents}
          src={frame.imageUrl}
          title={frame.title}
        />

        {hasIntents && (
          <div className="bg-background-100 flex flex-col px-4 py-2 gap-2 rounded-bl-md rounded-br-md border-t-0 border">
            {frame.input && <Input placeholder={frame.input.text} />}

            {frame.buttons && (
              <div
                className={clsx([
                  'grid',
                  'gap-2.5',
                  `grid-cols-${buttonCount}`,
                ])}
              >
                {frame.buttons.map((button) => {
                  switch (button.type) {
                    case 'link':
                      return <ButtonLink {...button} target={button.target} />
                    case 'mint':
                      return <ButtonMint {...button} target={button.target} />
                    case 'post':
                      return <ButtonPost {...button} />
                    case 'post_redirect':
                      return <ButtonPostRedirect {...button} />
                    case 'tx':
                      return <ButtonTransaction {...button} />
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-xs mt-1 text-right">
        <a className="text-gray-700 font-medium" href={url}>
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
      className={clsx([
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
  const value = useStore((state) => state.inputText)
  return (
    <input
      aria-label={placeholder}
      autoComplete="off"
      className="bg-background-200 rounded-md border px-3 py-2.5 text-sm leading-snug w-full"
      name="inputText"
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(e) =>
        store.setState((state) => ({ ...state, inputText: e.target.value }))
      }
    />
  )
}

const buttonClass =
  'bg-gray-alpha-100 border-gray-200 flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4 w-full'
const innerButtonClass =
  'whitespace-nowrap overflow-hidden text-ellipsis text-gray-1000 font-medium'

function ButtonLink(props: {
  target: string
  title: string
}) {
  const { target, title } = props

  const [open, setOpen] = useState(false)
  const [url, _setUrl] = useState(target)

  return (
    <div>
      <button
        className={buttonClass}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className={innerButtonClass}>{title}</span>
        <ExternalLinkIcon
          className="text-gray-900"
          style={{ marginTop: '2px' }}
        />
      </button>

      <LeavingAppPrompt open={open} url={url} close={() => setOpen(false)} />
    </div>
  )
}

function ButtonMint(props: {
  target: string
  title: string
}) {
  const { title } = props
  return (
    <button className={buttonClass} type="button">
      <WarpIcon />
      <span className={innerButtonClass}>{title}</span>
    </button>
  )
}

function ButtonPost(props: {
  index: number
  target?: string | undefined
  title: string
}) {
  const { index, target, title } = props
  return (
    <button
      className={buttonClass}
      type="button"
      onClick={() => handlePost({ index, target })}
    >
      <span className={innerButtonClass}>{title}</span>
    </button>
  )
}

function ButtonPostRedirect(props: {
  index: number
  target?: string | undefined
  title: string
}) {
  const { index, target, title } = props

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | undefined>()

  return (
    <div>
      <button
        className={buttonClass}
        type="button"
        onClick={async () => {
          const location = await handlePostRedirect({ index, target })
          if (!location) return
          setUrl(location)
          setOpen(true)
        }}
      >
        <span className={innerButtonClass}>{title}</span>
        <ExternalLinkIcon
          className="text-gray-900"
          style={{ marginTop: '2px' }}
        />
      </button>

      <LeavingAppPrompt open={open} url={url} close={() => setOpen(false)} />
    </div>
  )
}

function ButtonTransaction(props: {
  title: string
}) {
  const { title } = props
  return (
    <button className={buttonClass} type="button">
      <span className={innerButtonClass}>{title}</span>
      <LightningBoltIcon />
    </button>
  )
}

type LeavingAppPromptProps = {
  open: boolean
  url: string | undefined
  close: () => void
}

function LeavingAppPrompt(props: LeavingAppPromptProps) {
  const { close, open, url } = props

  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate: close,
    ref,
  })

  if (!open || !url) return <></>

  return (
    <div
      className="flex flex-col gap-1.5 border bg-background-100 p-4 rounded-lg text-center absolute"
      style={{
        marginTop: '4px',
        width: '20rem',
        zIndex: '10',
      }}
      ref={ref}
    >
      <h1 className="font-semibold text-base text-gray-1000">
        Leaving Warpcast
      </h1>

      <div className="line-clamp-2 text-gray-700 text-sm font-mono">{url}</div>

      <p className="text-sm leading-snug text-gray-900">
        If you connect your wallet and the site is malicious, you may lose
        funds.
      </p>

      <div className="flex gap-1.5 mt-1.5">
        <button
          className="bg-background-100 border rounded-md w-full text-sm font-medium py-2"
          type="button"
          onClick={close}
        >
          Cancel
        </button>

        <button
          className="bg-red-400 hover:bg-red-300 rounded-md w-full text-sm text-bg font-medium py-2"
          type="button"
          onClick={() => {
            close()
            window.open(url, '_blank')
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
