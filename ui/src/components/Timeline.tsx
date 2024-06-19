import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleBackslashIcon,
  IdCardIcon,
  Pencil2Icon,
  ResetIcon,
} from '@radix-ui/react-icons'
import clsx from 'clsx'
import { FormEventHandler, useCallback, useRef, useState } from 'react'

import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useStore } from '../hooks/useStore.js'
import { store } from '../lib/store.js'
import { Data } from '../types/frog.js'
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
    <div className="flex flex-col justify-between h-timeline">
      <div className="flex overflow-hidden flex-col h-full rounded-t-md border">
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

      <div className="flex justify-between py-2 px-2 rounded-b-md border border-t-0 bg-background-100">
        <div className="flex gap-1.5">
          <div className="flex text-gray-700 rounded border divide-x bg-background-200">
            <button
              aria-label="previous log"
              className="p-1.5 bg-transparent rounded-l-sm hover:bg-gray-100"
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
              className="p-1.5 bg-transparent rounded-r-sm hover:bg-gray-100"
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
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex gap-1.5 items-center font-mono text-xs text-gray-700">
          <div className="flex items-center py-0.5 px-1 leading-4 text-gray-900 uppercase rounded border">
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

        <div className="font-mono text-xs text-gray-700">
          {formatTime(log.timestamp)}
        </div>
      </div>

      <div
        className="w-full font-mono text-xs text-left text-gray-900 whitespace-nowrap"
        title={url.toString()}
      >
        <div
          className="text-ellipsis inline-block md:max-w-[57%]"
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
  const editFid = !overrideUserFid && user?.userFid === parseInt(userFid, 10)

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
        userFid: parseInt(userFid, 10),
        castFid: parseInt(castFid, 10),
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
      if (!json) return

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
      className="flex overflow-hidden absolute flex-col gap-3 px-4 pt-3 pb-4 w-full rounded-lg border bg-background-100"
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
          className="text-xs font-medium text-gray-700"
          style={{ paddingLeft: '0.25rem' }}
        >
          User
        </div>

        <div className="flex relative items-center">
          <input
            aria-label="User FID"
            autoComplete="off"
            className="py-2 px-3 w-full text-xs text-sm leading-snug rounded-md border bg-background-200"
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
                  className="absolute p-1 text-xs font-medium text-gray-700 bg-transparent rounded hover:bg-gray-100"
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
                  className="absolute p-1 text-xs font-medium text-gray-700 bg-transparent rounded hover:bg-gray-100"
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
          className="text-xs font-medium text-gray-700"
          style={{ paddingLeft: '0.25rem' }}
        >
          Cast
        </div>

        <div className="rounded-md border divide-y bg-background-200">
          <input
            aria-label="Cast FID"
            autoComplete="off"
            className="py-2 px-3 w-full text-xs text-sm leading-snug bg-transparent rounded-t-md"
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
            className="py-2 px-3 w-full text-xs text-sm leading-snug bg-transparent rounded-b-md"
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

      <div className="flex gap-1.5 mt-1.5">
        <button
          className="py-1.5 w-full text-xs font-medium rounded-md border bg-background-100"
          type="button"
          onClick={close}
        >
          Cancel
        </button>

        <button
          className="py-1.5 w-full text-xs font-medium bg-gray-200 rounded-md hover:bg-gray-100 text-bg"
          type="submit"
        >
          Update
        </button>
      </div>
    </form>
  )
}
