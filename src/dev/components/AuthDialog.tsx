import { useRef } from 'hono/jsx/dom'

import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { QRCode } from './QRCode.js'
import { cross1Icon } from './icons.js'

type AuthDialogProps = {
  close: () => void
  data:
    | {
        token: string
        url: string
      }
    | undefined
  open: boolean
  reset: () => void
  timedOut: boolean
}

export function AuthDialog(props: AuthDialogProps) {
  const { close, data, open, reset, timedOut } = props

  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate: close,
    ref,
  })
  const { copied, copy } = useCopyToClipboard({ value: data?.url })

  if (!open) return <></>

  return (
    <div
      class="flex items-center justify-center p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        inset: '0',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      <div
        class="bg-background-100 relative flex flex-col gap-4 scrollbars p-6 border-gray-alpha-100 border"
        style={{ borderRadius: '1.5rem' }}
        ref={ref}
      >
        <button
          type="button"
          class="bg-transparent text-gray-800 hover:bg-gray-100 rounded-full flex items-center justify-center absolute"
          style={{
            height: '2rem',
            width: '2rem',
            top: '1.25rem',
            right: '1rem',
          }}
          onClick={close}
        >
          <span class="sr-only">Close</span>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
          <div dangerouslySetInnerHTML={{ __html: cross1Icon.toString() }} />
        </button>

        <h1 class="text-base font-bold text-gray-1000 text-center">
          Scan with Phone
        </h1>

        <p
          class="text-sm text-gray-700 leading-snug text-center"
          style={{ maxWidth: '17rem' }}
        >
          Scan with your phone's camera to sign in with your Farcaster account.
        </p>

        <div class="relative">
          {data?.url ? (
            <div style={timedOut ? { opacity: '0.1' } : undefined}>
              <QRCode url={data.url} />
            </div>
          ) : (
            <div
              class="border border-gray-100"
              style={{
                borderRadius: '1.5rem',
                height: '276px',
                width: '276px',
              }}
            />
          )}

          {timedOut && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              class="flex items-center justify-center flex-col gap-4 absolute"
              style={{
                inset: '0',
              }}
            >
              <div class="font-medium text-gray-1000">Code timed out</div>

              <button
                class="bg-gray-1000 border border-gray-200 py-2 px-4 text-gray-100 font-medium text-sm rounded-md"
                type="button"
                onClick={reset}
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          class="bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1"
          onClick={copy}
          disabled={timedOut}
          style={timedOut ? { opacity: '0.4' } : undefined}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  )
}
