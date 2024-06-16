import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleBackslashIcon,
  IdCardIcon,
  Pencil2Icon,
  ResetIcon,
} from '@radix-ui/react-icons'
import clsx from 'clsx'
import { type FormEventHandler, useCallback, useRef, useState } from 'react'

import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useStore } from '../hooks/useStore.js'
import { store } from '../lib/store.js'
import type { Data } from '../types/frog.js'
import { performAction } from '../utils/actions.js'
import { formatSpeed, formatTime } from '../utils/format.js'

const buttonClass =
  'border rounded bg-background-200 p-1.5 text-gray-700 hover:bg-gray-100'

export function Timeline() {
  const { dataMap, logs, logsCount, logIndex } = useStore(
    ({ dataMap, logs, logIndex }) => ({
      dataMap,
      logs,
      logsCount: logs.length,
      logIndex,
    }),
  )

  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-timeline flex-col justify-between">
      <div className="flex h-full flex-col overflow-hidden rounded-t-md border">
        <div className="scrollbars">
          <div
            className="flex w-full bg-background-100"
            style={{
              flexDirection: 'column-reverse',
              justifyContent: 'flex-end',
            }}
          >
            {logs.map((dataKey, index) => (
              <Row
                current={index === logIndex}
                index={index}
                dataKey={dataKey}
                log={dataMap[dataKey]}
                logsCount={logsCount}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between rounded-b-md border border-t-0 bg-background-100 px-2 py-2">
        <div className="flex gap-1.5">
          <div className="flex divide-x rounded border bg-background-200 text-gray-700">
            <button
              aria-label="previous log"
              className="rounded-l-sm bg-transparent p-1.5 hover:bg-gray-100"
              type="button"
              onClick={() => {
                const nextLogIndex =
                  logIndex + 1 > logs.length - 1 ? 0 : logIndex + 1
                const key = logs[nextLogIndex]

                store.setState((state) => ({
                  ...state,
                  dataKey: key,
                  logIndex: nextLogIndex,
                }))

                const element = document.querySelector(`#log-${nextLogIndex}`)
                element?.scrollIntoView({ block: 'nearest' })
              }}
            >
              <ChevronUpIcon />
            </button>

            <button
              aria-label="next log"
              className="rounded-r-sm bg-transparent p-1.5 hover:bg-gray-100"
              type="button"
              onClick={() => {
                let nextLogIndex =
                  logIndex - 1 >= 0 ? logIndex - 1 : logs.length - 1
                if (logIndex === -1 && logs.length > 1)
                  nextLogIndex = logs.length - 2

                const key = logs[nextLogIndex]
                store.setState((state) => ({
                  ...state,
                  dataKey: key,
                  logIndex: nextLogIndex,
                }))

                const element = document.querySelector(`#log-${nextLogIndex}`)
                element?.scrollIntoView({ block: 'nearest' })
              }}
            >
              <ChevronDownIcon />
            </button>
          </div>

          <button
            aria-label="clear logs"
            className={buttonClass}
            type="button"
            onClick={() => {
              const log = logs.at(-1)
              if (!log) return
              store.setState((state) => ({
                ...state,
                dataKey: log,
                logs: [log],
                logIndex: -1,
              }))
            }}
          >
            <CircleBackslashIcon />
          </button>
        </div>

        <div className="relative">
          <button
            aria-label="change settings"
            className={buttonClass}
            type="button"
            onClick={() => setOpen(true)}
          >
            <IdCardIcon />
          </button>

          {open && <UserForm close={() => setOpen(false)} open={open} />}
        </div>
      </div>
    </div>
  )
}

type RowProps = {
  current: boolean
  dataKey: string
  index: number
  log: Data
  logsCount: number
}

function Row(props: RowProps) {
  const { current, dataKey, index, log, logsCount } = props

  const url = new URL(log.url)
  const hostname = `${url.protocol}//${url.hostname}${
    url.port ? `:${url.port}` : ''
  }`

  return (
    <button
      type="button"
      className={clsx([
        'flex',
        'flex-col',
        'gap-2',
        'p-4',
        'w-full',
        'border-gray-200',
        'hover:bg-gray-100',
        current ? 'bg-gray-100' : 'bg-transparent',
      ])}
      id={`log-${index}`}
      tabIndex={logsCount - index}
      style={index !== 0 || logsCount < 6 ? { borderBottomWidth: '1px' } : {}}
      onClick={() => {
        store.setState((state) => ({ ...state, dataKey, logIndex: index }))
      }}
    >
      <div className="flex w-full flex-row items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-gray-700 text-xs">
          <div className="flex items-center rounded border px-1 py-0.5 text-gray-900 uppercase leading-4">
            {log.method}
          </div>

          <div
            className={clsx([
              'flex',
              'items-center',
              'border',
              'px-1',
              'py-0.5',
              'leading-4',
              'rounded',
              'uppercase',
              ...(log.response.success
                ? ['border-green-100', 'text-green-900']
                : ['border-red-100', 'text-red-900']),
            ])}
          >
            {log.response.status}
          </div>

          <span>{formatSpeed(log.metrics.speed)}</span>
        </div>

        <div className="font-mono text-gray-700 text-xs">
          {formatTime(log.timestamp)}
        </div>
      </div>

      <div
        className="w-full whitespace-nowrap text-left font-mono text-gray-900 text-xs"
        title={url.toString()}
      >
        <div
          className="inline-block text-ellipsis md:max-w-[57%]"
          style={{ overflow: 'clip' }}
        >
          {hostname}
        </div>
        <div className="inline-block">{url.pathname}</div>
      </div>
    </button>
  )
}

type UserFormProps = {
  close: () => void
  open: boolean
}

function UserForm(props: UserFormProps) {
  const { close, open } = props
  const { overrides, user } = useStore(({ overrides, user }) => ({
    overrides,
    user,
  }))

  const userFidRef = useRef<HTMLInputElement>(null)
  const [userFid, setUserFid] = useState(overrides.userFid.toString())
  const [castFid, setCastFid] = useState(overrides.castFid.toString())
  const [castHash, setCastHash] = useState(overrides.castHash)
  const [overrideUserFid, setOverrideUserFid] = useState(
    user && overrides.userFid !== user.userFid,
  )
  const editFid =
    !overrideUserFid && user?.userFid === Number.parseInt(userFid, 10)

  const ref = useRef<HTMLFormElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate() {
      close()
    },
    ref,
  })

  const onSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault()

      const nextOverrides = {
        userFid: Number.parseInt(userFid, 10),
        castFid: Number.parseInt(castFid, 10),
        castHash,
      }
      store.setState((x) => ({ ...x, overrides: nextOverrides }))

      const { dataKey, dataMap, logs, user } = store.getState()
      const data = dataMap[dataKey]
      if (!data || data?.type === 'initial') {
        close()
        return
      }

      const fid =
        nextOverrides.userFid !== user?.userFid
          ? nextOverrides.userFid
          : user.userFid
      const body = {
        ...data.body,
        castId: {
          fid: nextOverrides.castFid,
          hash: nextOverrides.castHash,
        },
        fid,
      }

      const json = await performAction(
        {
          ...data,
          body,
        },
        dataMap[logs.at(-1) ?? dataKey],
      )
      const id = json.id
      store.setState((state) => ({
        ...state,
        dataKey: id,
        dataMap: { ...state.dataMap, [id]: json },
        inputText: '',
        logs: [...state.logs, id],
        logIndex: -1,
      }))

      close()
    },
    [userFid, castFid, castHash, close],
  )

  // TODO: Switch to uncontrolled form
  return (
    <form
      ref={ref}
      className="absolute flex w-full flex-col gap-3 overflow-hidden rounded-lg border bg-background-100 px-4 pt-3 pb-4"
      style={{
        marginBottom: '4px',
        bottom: '100%',
        right: '0',
        width: '230px',
        zIndex: '10',
      }}
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-0.5">
        <div
          className="font-medium text-gray-700 text-xs"
          style={{ paddingLeft: '0.25rem' }}
        >
          User
        </div>

        <div className="relative flex items-center">
          <input
            aria-label="User FID"
            autoComplete="off"
            className="w-full rounded-md border bg-background-200 px-3 py-2 text-sm text-xs leading-snug"
            data-1p-ignore
            disabled={Boolean(user) && overrideUserFid === false}
            name="userFid"
            pattern="^[0-9]*$"
            placeholder="FID"
            ref={userFidRef}
            required
            type="text"
            value={userFid}
            onChange={(e) => setUserFid((e.target as HTMLInputElement).value)}
          />

          {user && (
            <>
              {editFid ? (
                <button
                  aria-label="Edit User FID"
                  className="absolute rounded bg-transparent p-1 font-medium text-gray-700 text-xs hover:bg-gray-100"
                  type="button"
                  style={{ right: '0.25rem' }}
                  onClick={() => {
                    setOverrideUserFid(true)
                    setTimeout(() => userFidRef.current?.focus())
                  }}
                >
                  <Pencil2Icon />
                </button>
              ) : (
                <button
                  aria-label="Restore User FID"
                  className="absolute rounded bg-transparent p-1 font-medium text-gray-700 text-xs hover:bg-gray-100"
                  type="button"
                  style={{ right: '0.25rem' }}
                  onClick={() => {
                    if (user) setUserFid(user.userFid.toString())
                    setOverrideUserFid(false)
                  }}
                >
                  <ResetIcon />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <div
          className="font-medium text-gray-700 text-xs"
          style={{ paddingLeft: '0.25rem' }}
        >
          Cast
        </div>

        <div className="divide-y rounded-md border bg-background-200">
          <input
            aria-label="Cast FID"
            autoComplete="off"
            className="w-full rounded-t-md bg-transparent px-3 py-2 text-sm text-xs leading-snug"
            name="inputText"
            type="text"
            required
            pattern="^[0-9]*$"
            placeholder="FID"
            value={castFid}
            onChange={(e) => setCastFid((e.target as HTMLInputElement).value)}
          />

          <input
            aria-label="Cast Hash"
            autoComplete="off"
            className="w-full rounded-b-md bg-transparent px-3 py-2 text-sm text-xs leading-snug"
            name="inputText"
            type="text"
            required
            pattern="^0x[a-fA-F0-9]{40}$"
            placeholder="Hash"
            value={castHash}
            onChange={(e) => setCastHash((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      <div className="mt-1.5 flex gap-1.5">
        <button
          className="w-full rounded-md border bg-background-100 py-1.5 font-medium text-xs"
          type="button"
          onClick={close}
        >
          Cancel
        </button>

        <button
          className="w-full rounded-md bg-gray-200 py-1.5 font-medium text-bg text-xs hover:bg-gray-100"
          type="submit"
        >
          Update
        </button>
      </div>
    </form>
  )
}
