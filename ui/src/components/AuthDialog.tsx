import { Cross1Icon } from '@radix-ui/react-icons'
import { useRef } from 'react'

import { createPortal } from 'react-dom'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { QRCode } from './QRCode.js'
import { FarcasterIcon } from './logos.js'

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

  const { lock, unlock } = useScrollLock({ widthReflow: false })
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onActivate() {
      lock()
    },
    onDeactivate() {
      unlock()
      close()
    },
    ref,
  })
  const { copied, copy } = useCopyToClipboard({ value: data?.url })

  if (!open) return <></>

  return createPortal(
    <div
      className="flex items-center justify-center p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        inset: '0',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      <div
        className="scrollbars relative flex flex-col gap-4 border border-gray-alpha-100 bg-background-100 p-6"
        style={{ borderRadius: '1.5rem' }}
        ref={ref}
      >
        <button
          type="button"
          className="absolute flex size-8 items-center justify-center rounded-full bg-transparent text-gray-800 hover:bg-gray-100"
          style={{
            top: '1.25rem',
            right: '1rem',
          }}
          onClick={close}
        >
          <span className="sr-only">Close</span>
          <Cross1Icon />
        </button>

        <h1 className="text-center font-bold text-base text-gray-1000">
          Scan with Phone
        </h1>

        <p
          className="text-center text-gray-700 text-sm leading-snug"
          style={{ maxWidth: '17rem' }}
        >
          Scan with your phone's camera to sign in with your Farcaster account.
        </p>

        <div className="relative">
          {data?.url ? (
            <div style={timedOut ? { opacity: '0.1' } : undefined}>
              <QRCode
                icon={
                  <div style={{ backgroundColor: '#7866BB' }}>
                    <FarcasterIcon />
                  </div>
                }
                url={data.url}
              />
            </div>
          ) : (
            <div
              className="border border-gray-100"
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
              className="absolute flex flex-col items-center justify-center gap-4"
              style={{
                inset: '0',
              }}
            >
              <div className="font-medium text-gray-1000">Code timed out</div>

              <button
                className="rounded-md border border-gray-200 bg-gray-1000 px-4 py-2 font-medium text-gray-100 text-sm"
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
          className="mt-1 rounded-xl border border-gray-200 bg-gray-100 p-3 font-medium text-gray-1000 text-sm"
          onClick={copy}
          disabled={timedOut}
          style={timedOut ? { opacity: '0.4' } : undefined}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
