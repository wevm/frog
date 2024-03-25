import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PersonIcon,
  ReloadIcon,
} from '@radix-ui/react-icons'
import {
  FormEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useStore } from '../hooks/useStore.js'
import { client } from '../lib/api.js'
import { store } from '../lib/store.js'
import { User } from '../types/frog.js'
import {
  handleBack,
  handleForward,
  handleReload,
  handleSelectNewFrame,
} from '../utils/actions.js'
import { formatUrl } from '../utils/format.js'
import { AuthDialog } from './AuthDialog.js'
import { FarcasterIcon } from './logos.js'

type NavigatorProps = { frameUrls: string[]; url: string }

export function Navigator(props: NavigatorProps) {
  const { frameUrls, url } = props

  const { stack, stackIndex, user } = useStore(
    ({ stack, stackIndex, user }) => ({
      stack,
      stackIndex,
      user,
    }),
  )

  return (
    <div className="items-center flex gap-2 w-full" style={{ height: '2rem' }}>
      <div className="flex border rounded-md h-full">
        <button
          aria-label="back"
          className="text-gray-700 bg-background-100 px-2 rounded-l-md"
          type="button"
          disabled={stackIndex === 0}
          onClick={handleBack}
        >
          <ChevronLeftIcon
            style={stackIndex === 0 ? { opacity: '0.35' } : undefined}
          />
        </button>

        <div className="bg-gray-alpha-300 h-full" style={{ width: '1px' }} />

        <button
          aria-label="forward"
          className="text-gray-700 bg-background-100 px-2 rounded-r-md"
          type="button"
          onClick={handleForward}
        >
          <ChevronRightIcon
            style={!stack[stackIndex + 1] ? { opacity: '0.35' } : undefined}
          />
        </button>
      </div>

      <button
        aria-label="refresh"
        className="bg-background-100 border rounded-md text-gray-700 px-2 h-full"
        type="button"
        onClick={handleReload}
      >
        <ReloadIcon />
      </button>

      <AddressBar frameUrls={frameUrls} url={url} />

      {user ? <UserButton user={user} /> : <AuthButton />}
    </div>
  )
}

function AuthButton() {
  const [open, setOpen] = useState(false)

  const [timedOut, setTimedOut] = useState(false)
  const [data, setData] = useState<{ token: string; url: string } | undefined>(
    undefined,
  )

  useEffect(() => {
    if (!open) return
    client.auth.code
      .$get()
      .then((response) => response.json())
      .then(setData)
  }, [open])

  useEffect(() => {
    // poll for status change
    let intervalId: Timer | null = null

    if (!data) return
    if (!open) return

    const timeout = 300_000
    const interval = 1_500
    const deadline = Date.now() + timeout

    const status = async () => {
      if (Date.now() < deadline) {
        const json = await client.auth.status[':token']
          .$get({
            param: { token: data.token },
          })
          .then((response) => response.json())
        if (json.state !== 'completed') return

        store.setState((state) => ({ ...state, user: json }))
        if (intervalId) clearInterval(intervalId)
        setOpen(false)
      } else {
        if (intervalId) clearInterval(intervalId)
        setTimedOut(true)
      }
    }
    ;(() => {
      intervalId = setInterval(status, interval)
    })()

    // clean up when unmounted or dialog closed
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [data, open])

  return (
    <>
      <button
        type="button"
        className="bg-background-100 rounded-md border overflow-hidden text-gray-700"
        onClick={() => setOpen(true)}
      >
        <div style={{ height: '30px', width: '30px' }}>
          <FarcasterIcon />
        </div>
      </button>

      <AuthDialog
        close={() => setOpen(false)}
        data={data}
        open={open}
        reset={() => {}}
        timedOut={timedOut}
      />
    </>
  )
}

type UserButtonProps = {
  user: User
}

function UserButton(props: UserButtonProps) {
  const { user } = props

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate() {
      setOpen(false)
    },
    ref,
  })

  return (
    <div className="relative grid h-full">
      <button
        aria-label="open user menu"
        type="button"
        className="bg-background-100 rounded-md border overflow-hidden text-gray-700"
        onClick={() => setOpen(true)}
      >
        {user.pfp ? (
          <img style={{ height: '32px', width: '32px' }} src={user.pfp} />
        ) : (
          <div className="px-2">
            <PersonIcon />
          </div>
        )}
      </button>

      {open && (
        <div
          ref={ref}
          className="border bg-background-100 rounded-xl w-full overflow-hidden absolute"
          style={{
            marginTop: '4px',
            top: '100%',
            right: '0',
            width: '225px',
            zIndex: '10',
          }}
        >
          <div className="text-sm p-4">
            {user.username && <div>{user.displayName ?? user.username}</div>}
            <div className="text-gray-700">{`FID #${user.userFid}`}</div>
          </div>

          <div className="px-4">
            <div className="border-t w-full" />
          </div>

          <div className="py-2">
            {user.username && (
              <a
                type="button"
                className="bg-transparent flex items-center justify-between font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
                style={{ textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
                href={`https://warpcast.com/${user.username}`}
              >
                <span>Warpcast Profile</span>
                <ExternalLinkIcon style={{ marginTop: '1px' }} />
              </a>
            )}

            <button
              type="button"
              className="bg-transparent display-block font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
              onClick={() =>
                client.auth.logout
                  .$post()
                  .then((response) => response.json())
                  .finally(() =>
                    store.setState((state) => ({ ...state, user: null })),
                  )
              }
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type AddressBarProps = { frameUrls: readonly string[]; url: string }

function AddressBar(props: AddressBarProps) {
  const { frameUrls, url } = props

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate() {
      setOpen(false)
    },
    ref: containerRef,
  })

  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const nextUrl = data.get('url') as string
      try {
        if (nextUrl !== url) await handleSelectNewFrame(nextUrl)
        setOpen(false)
      } catch (error) {
        // TODO: Handle error
      }
    },
    [url],
  )

  return (
    <div
      className="relative grid h-full"
      style={{ flex: '1' }}
      ref={containerRef}
    >
      {open ? (
        <form
          className="bg-background-100 border flex rounded-md w-full h-full overflow-hidden"
          onSubmit={handleSubmit}
          style={{ paddingLeft: '0.5rem' }}
        >
          <GlobeIcon
            className="flex items-center h-full text-gray-700"
            style={{ minWidth: '15px' }}
          />

          <input
            defaultValue={url}
            name="url"
            ref={inputRef}
            className="bg-transparent font-sans text-gray-1000 px-2 w-full"
            data-1p-ignore
            placeholder="Enter address"
            required
            style={{
              boxShadow: 'none',
              lineHeight: '1.9rem',
              fontSize: '13px',
            }}
            type="url"
          />
          <button
            type="submit"
            className="bg-background-100 flex items-center justify-center text-gray-700 px-2 hover:bg-gray-100"
          >
            <span className="sr-only">Go</span>
            <ArrowRightIcon />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="bg-background-100 border rounded-md w-full h-full relative overflow-hidden"
          style={{
            paddingLeft: '1.75rem',
            paddingRight: '1.75rem',
          }}
          onClick={() => setOpen(true)}
        >
          <GlobeIcon
            className="flex items-center h-full text-gray-700 absolute"
            style={{ left: '0.5rem' }}
          />

          <div className="overflow-hidden whitespace-nowrap text-ellipsis h-full">
            <span
              className="font-sans text-gray-1000"
              style={{ lineHeight: '1.9rem', fontSize: '13px' }}
            >
              {formatUrl(url)}
            </span>
          </div>
        </button>
      )}

      {open && Boolean(frameUrls.length) && (
        <div
          className="border bg-background-100 rounded-lg w-full overflow-hidden py-1 absolute"
          style={{
            marginTop: '4px',
            top: '100%',
            zIndex: '10',
          }}
        >
          {frameUrls.map((frameUrl) => (
            <button
              type="button"
              className="bg-transparent display-block font-sans text-sm whitespace-nowrap px-3 py-2 rounded-lg overflow-hidden text-ellipsis text-gray-900 w-full text-left hover:bg-gray-100"
              onClick={() =>
                handleSelectNewFrame(frameUrl).finally(() => setOpen(false))
              }
            >
              {frameUrl}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
