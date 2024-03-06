import { useRef, useState as useLocalState, useEffect } from 'hono/jsx/dom'

import { useDispatch } from '../hooks/useDispatch.js'
import { useState } from '../hooks/useState.js'
import { type Data, type User } from '../types.js'
import { formatUrl } from '../utils/format.js'
import {
  chevronLeftIcon,
  chevronRightIcon,
  externalLinkIcon,
  farcasterIcon,
  globeIcon,
  personIcon,
  refreshIcon,
} from './icons.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { AuthDialog } from './AuthDialog.js'

type NavigatorProps = { url: string; routes: readonly string[] }

export function Navigator(props: NavigatorProps) {
  const { routes, url } = props

  const { dataKey, dataMap, stackIndex, stack, user } = useState()
  const { getFrame, postFrameAction, postFrameRedirect, setState, setMounted } =
    useDispatch()

  return (
    <div class="items-center flex gap-2 w-full" style={{ height: '2rem' }}>
      <div class="flex border rounded-md h-full">
        <button
          aria-label="back"
          class="text-gray-700 bg-background-100 px-2 rounded-l-md"
          type="button"
          onClick={async () => {
            const previousStackIndex = stackIndex - 1
            const previousStackId = stack[previousStackIndex]
            const previousData = dataMap[previousStackId]
            if (!previousData) return

            let json: Data
            switch (previousData.type) {
              case 'initial': {
                json = await getFrame(previousData.url)
                break
              }
              case 'action': {
                json = await postFrameAction(previousData.body)
                break
              }
              case 'redirect': {
                json = await postFrameRedirect(previousData.body)
                break
              }
            }

            setState((x) => ({
              ...x,
              dataKey: json.id,
              stackIndex: previousStackIndex,
              inputText: '',
            }))
          }}
          disabled={stackIndex === 0}
        >
          <span
            style={stackIndex === 0 && { opacity: '0.35' }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{ __html: chevronLeftIcon.toString() }}
          />
        </button>

        <div class="bg-gray-alpha-300 h-full" style={{ width: '1px' }} />

        <button
          aria-label="forward"
          class="text-gray-700 bg-background-100 px-2 rounded-r-md"
          type="button"
          onClick={async () => {
            const nextStackIndex = stackIndex + 1
            const nextStackId = stack[nextStackIndex]
            const nextData = dataMap[nextStackId]
            if (!nextData) return

            let json: Data
            switch (nextData.type) {
              case 'initial': {
                json = await getFrame(nextData.url)
                break
              }
              case 'action': {
                json = await postFrameAction(nextData.body)
                break
              }
              case 'redirect': {
                json = await postFrameRedirect(nextData.body)
                break
              }
            }

            setState((x) => ({
              ...x,
              dataKey: json.id,
              stackIndex: nextStackIndex,
              inputText: '',
            }))
          }}
        >
          <span
            style={!stack[stackIndex + 1] && { opacity: '0.35' }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{ __html: chevronRightIcon.toString() }}
          />
        </button>
      </div>

      <button
        aria-label="refresh"
        class="bg-background-100 border rounded-md text-gray-700 px-2 h-full"
        type="button"
        onClick={async (event) => {
          // Reset on shift + click
          if (event.shiftKey) {
            const route = window.location.pathname
            history.replaceState({}, '', route)
            setMounted(false)

            const nextFrame = window.location.toString().replace('/dev2', '')
            const json = await getFrame(nextFrame, { replaceLogs: true })
            const id = json.id

            setState((x) => ({
              ...x,
              dataKey: id,
              stack: [id],
              stackIndex: 0,
              inputText: '',
              tab: 'request',
            }))

            setTimeout(() => {
              setMounted(true)
            }, 100)

            return
          }

          const nextData = dataMap[dataKey]
          if (!nextData) return

          let json: Data
          switch (nextData.type) {
            case 'initial': {
              json = await getFrame(nextData.url)
              break
            }
            case 'action': {
              json = await postFrameAction(nextData.body)
              break
            }
            case 'redirect': {
              json = await postFrameRedirect(nextData.body)
              break
            }
          }

          setState((x) => ({ ...x, dataKey: json.id, inputText: '' }))
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
        dangerouslySetInnerHTML={{ __html: refreshIcon.toString() }}
      />

      <AddressBar routes={routes} url={url} />

      {user ? <UserButton user={user} /> : <AuthButton />}
    </div>
  )
}

function AuthButton() {
  const [open, setOpen] = useLocalState(false)

  const [timedOut, setTimedOut] = useLocalState(false)
  const [data, setData] = useLocalState<
    { token: string; url: string } | undefined
  >(undefined)
  const { fetchAuthCode, fetchAuthStatus, setState } = useDispatch()

  useEffect(() => {
    if (!open) return
    fetchAuthCode().then(setData)
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
        const json = await fetchAuthStatus(data.token)
        if (json.state !== 'completed') return

        setState((x) => ({ ...x, user: json }))
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
        class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
        onClick={() => setOpen(true)}
      >
        <div
          style={{ height: '30px', width: '30px' }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: farcasterIcon.toString() }}
        />
      </button>

      <AuthDialog
        close={() => setOpen(false)}
        data={data}
        open={open}
        reset={() => {
          fetchAuthCode()
            .then(setData)
            .then(() => setTimedOut(false))
        }}
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

  const { logout } = useDispatch()

  const [open, setOpen] = useLocalState(false)
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
    <div class="relative grid h-full">
      <button
        aria-label="open user menu"
        type="button"
        class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
        onClick={() => setOpen(true)}
      >
        {user.pfp ? (
          <img style={{ height: '32px', width: '32px' }} src={user.pfp} />
        ) : (
          <div class="px-2">{personIcon}</div>
        )}
      </button>

      {open && (
        <div
          ref={ref}
          class="border bg-background-100 rounded-xl w-full overflow-hidden absolute"
          style={{
            marginTop: '4px',
            top: '100%',
            right: '0',
            width: '225px',
            zIndex: '10',
          }}
        >
          <div class="text-sm p-4">
            {user.username && <div>{user.displayName ?? user.username}</div>}
            <div class="text-gray-700">{`FID #${user.userFid}`}</div>
          </div>

          <div class="px-4">
            <div class="border-t w-full" />
          </div>

          <div class="py-2">
            {user.username && (
              <a
                type="button"
                class="bg-transparent flex items-center justify-between font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
                style={{ textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
                href={`https://warpcast.com/${user.username}`}
              >
                <span>Warpcast Profile</span>
                <div
                  style={{ marginTop: '1px' }}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                  dangerouslySetInnerHTML={{
                    __html: externalLinkIcon.toString(),
                  }}
                />
              </a>
            )}

            <button
              type="button"
              class="bg-transparent display-block font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
              onClick={logout}
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type AddressBarProps = { routes: readonly string[]; url: string }

function AddressBar(props: AddressBarProps) {
  const { routes, url } = props

  const { getFrame, setState, setMounted } = useDispatch()

  const [open, setOpen] = useLocalState(false)
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate() {
      setOpen(false)
    },
    ref,
  })

  const urlObject = new URL(url)

  return (
    <div class="relative grid h-full" style={{ flex: '1' }}>
      <button
        type="button"
        class="bg-background-100 border rounded-md w-full h-full relative overflow-hidden"
        style={{
          paddingLeft: '1.75rem',
          paddingRight: '1.75rem',
        }}
        onClick={() => setOpen(true)}
      >
        <div
          class="flex items-center h-full text-gray-700 absolute"
          style={{ left: '0.5rem' }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{ __html: globeIcon.toString() }}
        />

        <div class="overflow-hidden whitespace-nowrap text-ellipsis h-full">
          <span
            class="font-sans text-gray-1000"
            style={{ lineHeight: '1.9rem', fontSize: '13px' }}
          >
            {formatUrl(url)}
          </span>
        </div>
      </button>

      {open && (
        <div
          ref={ref}
          class="border bg-background-100 rounded-lg w-full overflow-hidden py-1 absolute"
          style={{
            marginTop: '4px',
            top: '100%',
            zIndex: '10',
          }}
        >
          {routes.map((route) => (
            <button
              type="button"
              class="bg-transparent display-block font-sans text-sm whitespace-nowrap px-3 py-2 rounded-lg overflow-hidden text-ellipsis text-gray-900 w-full text-left hover:bg-gray-100"
              onClick={async () => {
                const nextRoute = route === '/' ? '/dev2' : `${route}/dev2`
                history.replaceState({}, '', nextRoute)

                setMounted(false)

                const nextFrame = window.location
                  .toString()
                  .replace('/dev2', '')
                const json = await getFrame(nextFrame, { replaceLogs: true })
                const id = json.id

                setState((x) => ({
                  ...x,
                  dataKey: id,
                  stack: [id],
                  stackIndex: 0,
                  inputText: '',
                  tab: 'request',
                }))
                setOpen(false)

                setTimeout(() => setMounted(true), 100)
              }}
            >
              {`${urlObject.protocol}//${urlObject.host}${
                route === '/' ? '' : route
              }`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
