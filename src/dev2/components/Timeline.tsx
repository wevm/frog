import { useDispatch } from '../hooks/useDispatch.js'
import { clsx } from '../lib/clsx.js'
import { type Data } from '../types.js'
import { formatSpeed, formatTime } from '../utils/format.js'
import {
  chevronDownIcon,
  chevronUpIcon,
  circleBackslashIcon,
  idCardIcon,
} from './icons.js'

type TimelineProps = {
  dataMap: Record<string, Data>
  logs: string[]
  logIndex: number
}

export function Timeline(props: TimelineProps) {
  const { dataMap, logs, logIndex } = props
  const { setState } = useDispatch()
  const logsCount = logs.length

  const buttonClass =
    'border rounded-sm bg-background-200 p-1.5 text-gray-700 hover:bg-gray-100'

  return (
    <div class="h-timeline flex flex-col justify-between">
      <div class="border rounded-t-md overflow-hidden flex flex-col h-full">
        <div class="scrollbars">
          <div
            class="bg-background-100 w-full flex"
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

      <div class="bg-background-100 px-2 py-2 flex justify-between border rounded-b-md border-t-0">
        <div class="flex gap-1.5">
          <div class="flex border rounded-sm bg-background-200 text-gray-700 divide-x">
            <button
              aria-label="previous log"
              class="bg-transparent p-1.5 hover:bg-gray-100 rounded-l-sm"
              type="button"
              onClick={() => {
                const nextLogIndex =
                  logIndex + 1 > logs.length - 1 ? 0 : logIndex + 1
                const key = logs[nextLogIndex]

                setState((x) => ({
                  ...x,
                  dataKey: key,
                  logIndex: nextLogIndex,
                }))

                const element = document.querySelector(`#log-${nextLogIndex}`)
                element?.scrollIntoView({ block: 'nearest' })
              }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html: chevronUpIcon.toString() }}
            />

            <button
              aria-label="next log"
              class="bg-transparent p-1.5 hover:bg-gray-100 rounded-r-sm"
              type="button"
              onClick={() => {
                let nextLogIndex =
                  logIndex - 1 >= 0 ? logIndex - 1 : logs.length - 1
                if (logIndex === -1 && logs.length > 1)
                  nextLogIndex = logs.length - 2

                const key = logs[nextLogIndex]
                setState((x) => ({
                  ...x,
                  dataKey: key,
                  logIndex: nextLogIndex,
                }))

                const element = document.querySelector(`#log-${nextLogIndex}`)
                element?.scrollIntoView({ block: 'nearest' })
              }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html: chevronDownIcon.toString() }}
            />
          </div>

          <button
            aria-label="clear logs"
            class={buttonClass}
            type="button"
            onClick={() => {
              const log = logs.at(-1)
              if (!log) return
              setState((x) => ({
                ...x,
                dataKey: log,
                logs: [log],
                logIndex: -1,
              }))
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{ __html: circleBackslashIcon.toString() }}
          />
        </div>

        <div class="relative">
          <button
            aria-label="change settings"
            class={buttonClass}
            type="button"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{ __html: idCardIcon.toString() }}
          />
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
  const { setState } = useDispatch()

  const url = new URL('body' in log ? log.body.url : log.url)
  const hostname = `${url.protocol}//${url.hostname}${
    url.port ? `:${url.port}` : ''
  }`

  return (
    <button
      type="button"
      class={clsx([
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
        setState((x) => ({ ...x, dataKey, logIndex: index }))
      }}
    >
      <div class="flex flex-row items-center justify-between w-full">
        <div class="flex gap-1.5 font-mono text-gray-700 text-xs items-center">
          <div class="flex items-center border px-1 py-0.5 leading-4 rounded-sm text-gray-900 uppercase">
            {log.method}
          </div>

          <div
            class={clsx([
              'flex',
              'items-center',
              'border',
              'px-1',
              'py-0.5',
              'leading-4',
              'rounded-sm',
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

        <div class="font-mono text-gray-700 text-xs">
          {formatTime(log.timestamp)}
        </div>
      </div>

      <div
        class="font-mono text-gray-900 text-xs text-left whitespace-nowrap"
        title={url.toString()}
      >
        <div
          class="text-ellipsis inline-block md:max-w-[57%]"
          style={{ overflow: 'clip' }}
        >
          {hostname}
        </div>
        <div class="inline-block">{url.pathname}</div>
      </div>
    </button>
  )
}

// ;<form
//   x-cloak
//   x-show="open"
//   class="border bg-background-100 rounded-lg w-full overflow-hidden px-4 pb-4 pt-3 flex flex-col gap-3 absolute"
//   style={{
//     marginBottom: '4px',
//     bottom: '100%',
//     right: '0',
//     width: '230px',
//     zIndex: '10',
//   }}
// >
//   <div class="flex flex-col gap-0.5">
//     <div
//       class="text-xs text-gray-700 font-medium"
//       style={{ paddingLeft: '0.25rem' }}
//     >
//       User
//     </div>
//
//     <div class="relative flex items-center">
//       <input
//         aria-label="User FID"
//         autocomplete="off"
//         class="bg-background-200 rounded-md border px-3 py-2 text-sm leading-snug w-full text-xs"
//         name="userFid"
//         type="text"
//         required
//         pattern="^[0-9]*$"
//         placeholder="FID"
//         x-model="userFid"
//         x-ref="userFid"
//         data-1p-ignore
//         {...{
//           ':disabled': 'Boolean(user) && overrideUserFid === false',
//         }}
//       />
//
//       <button
//         aria-label="Edit User FID"
//         x-show="!overrideUserFid && user?.userFid === parseInt(userFid, 10)"
//         class="absolute text-xs bg-transparent text-gray-700 font-medium hover:bg-gray-100 p-1 rounded-sm"
//         type="button"
//         style={{ right: '0.25rem' }}
//         x-on:click="
//                     overrideUserFid = true
//                     $nextTick(() => $refs.userFid.focus())
//                   "
//       >
//         {pencil2Icon}
//       </button>
//
//       <button
//         aria-label="Restore User FID"
//         x-show="user && overrideUserFid"
//         class="absolute text-xs bg-transparent text-gray-700 font-medium hover:bg-gray-100 p-1 rounded-sm"
//         type="button"
//         style={{ right: '0.25rem' }}
//         x-on:click="
//                     userFid = user.userFid
//                     overrideUserFid = false
//                   "
//       >
//         {resetIcon}
//       </button>
//     </div>
//   </div>
//
//   <div class="flex flex-col gap-0.5">
//     <div
//       class="text-xs text-gray-700 font-medium"
//       style={{ paddingLeft: '0.25rem' }}
//     >
//       Cast
//     </div>
//
//     <div class="bg-background-200 border rounded-md divide-y">
//       <input
//         aria-label="Cast FID"
//         autocomplete="off"
//         class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-t-md"
//         name="inputText"
//         type="text"
//         required
//         pattern="^[0-9]*$"
//         placeholder="FID"
//         x-model="castFid"
//       />
//
//       <input
//         aria-label="Cast Hash"
//         autocomplete="off"
//         class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-b-md"
//         name="inputText"
//         type="text"
//         required
//         pattern="^0x[a-fA-F0-9]{40}$"
//         placeholder="Hash"
//         x-model="castHash"
//       />
//     </div>
//   </div>
//
//   <div class="flex gap-1.5 mt-1.5">
//     <button
//       class="bg-background-100 border rounded-md w-full text-xs font-medium py-1.5"
//       type="button"
//       x-on:click="close"
//     >
//       Cancel
//     </button>
//     <button
//       class="bg-gray-200 hover:bg-gray-100 rounded-md w-full text-xs text-bg font-medium py-1.5"
//       type="submit"
//     >
//       Update
//     </button>
//   </div>
// </form>
