import { Cross1Icon, InfoCircledIcon } from '@radix-ui/react-icons'
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
      className="flex justify-center items-center p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        inset: '0',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      <div
        className="flex relative flex-col gap-4 p-6 border bg-background-100 scrollbars border-gray-alpha-100"
        style={{ borderRadius: '1.5rem' }}
        ref={ref}
      >
        <button
          type="button"
          className="flex absolute justify-center items-center text-gray-800 bg-transparent rounded-full hover:bg-gray-100 size-8"
          style={{
            top: '1.25rem',
            right: '1rem',
          }}
          onClick={close}
        >
          <span className="sr-only">Close</span>
          <Cross1Icon />
        </button>

        <h1 className="text-base font-bold text-center text-gray-1000">
          Scan with Phone
        </h1>

        <p
          className="text-sm leading-snug text-center text-gray-700"
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
              className="flex absolute flex-col gap-4 justify-center items-center"
              style={{
                inset: '0',
              }}
            >
              <div className="font-medium text-gray-1000">Code timed out</div>

              <button
                className="py-2 px-4 text-sm font-medium text-gray-100 rounded-md border border-gray-200 bg-gray-1000"
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
          className="p-3 mt-1 text-sm font-medium bg-gray-100 rounded-xl border border-gray-200 text-gray-1000"
          onClick={copy}
          disabled={timedOut}
          style={timedOut ? { opacity: '0.4' } : undefined}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>

        <p
          className="p-2 text-xs leading-snug text-blue-900 bg-blue-300 rounded-md border border-blue-900"
          style={{ maxWidth: '17rem' }}
        >
          <InfoCircledIcon className="inline mr-1" />
          In order for devtools to hydrate your data you have to define `hub`
          property at `Frog` constructor.
        </p>
      </div>
    </div>,
    document.body,
  )
}
