import { CheckIcon, CopyIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { clsx } from 'clsx'
import { useEffect, useMemo } from 'react'
import { type Hash, decodeFunctionData, formatEther } from 'viem'
import { useTransactionReceipt } from 'wagmi'

import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js'
import { useStore } from '../hooks/useStore.js'
import { store } from '../lib/store.js'
import { config } from '../lib/wagmi.js'
import { Data, Frame, TransactionResponse } from '../types/frog.js'
import { formatFileSize, formatSpeed } from '../utils/format.js'
import { parseChainId } from '../utils/parseChainId.js'
import { CodeToHtml } from './CodeToHtml.js'
import { FormattedAbiItem } from './FormattedAbiItem.js'
import { LoadingDots } from './LoadingDots.js'

type TabsProps = {
  data: Data
  frame: Frame
}

const indicatorStyle = {
  display: 'none',
  height: '2px',
  bottom: '0',
  left: '0.75rem',
  right: '0.75rem',
}

function setTab(tab: ReturnType<(typeof store)['getState']>['tab']) {
  store.setState((state) => ({ ...state, tab }))
}

function unwrapState(state: string): object | string | undefined {
  try {
    const parsed = JSON.parse(decodeURIComponent(state))
    if (parsed.previousState) return parsed.previousState
    if (parsed.initialPath) return undefined // if it doesn't have `previousState`, but has `initialPath`, it's a frog frame without state
    return parsed
  } catch {
    return state
  }
}

function bigIntReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return Number(value)
  return value
}

export function Tabs(props: TabsProps) {
  const { data, frame } = props

  const context = data.context
  let currentState: object | string | undefined
  if (context?.status === 'initial' && context?.previousState)
    currentState = context.previousState
  else if (frame.state) currentState = unwrapState(frame.state)

  const previousState = useStore((state) => {
    const previousKey =
      state.logIndex !== -1
        ? state.logs[state.logIndex - 1]
        : state.stack[state.stackIndex - 1]
    if (!previousKey) return

    const previousData = state.dataMap[previousKey]
    const previousContext = previousData.context
    if (previousContext?.status === 'initial' && previousContext.previousState)
      return previousContext.previousState

    return unwrapState(previousData.frame.state)
  })

  const transactionData = data.type === 'tx' ? data.response.data : undefined
  const transactionId = context?.frameData?.transactionId
  const hasTransaction = Boolean(transactionData || transactionId)

  const tab = useStore((state) => state.tab)

  useEffect(() => {
    if (tab === 'context' && !context) setTab('request')
    if (tab === 'state' && !currentState) setTab('request')
    if (tab === 'tx' && !hasTransaction) setTab('request')
  }, [context, currentState, tab, hasTransaction])

  return (
    <div className="border rounded-md bg-background-100">
      <ul
        role="tablist"
        className="bg-background-200 border rounded-t-md flex flex-row text-sm"
        style={{
          borderLeft: '0',
          borderRight: '0',
          borderTop: '0',
          gap: '2px',
          paddingTop: '1px',
          paddingLeft: '0.25rem',
          paddingRight: '0.25rem',
        }}
      >
        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="request"
            onClick={() => setTab('request')}
            aria-selected={tab === 'request'}
            className={clsx([
              'bg-transparent',
              'relative',
              'py-3',
              'border-gray-1000',
              'px-3',
              tab === 'request' ? 'text-gray-1000' : 'text-gray-700',
            ])}
          >
            Request
            <div
              aria-hidden="true"
              className="absolute bg-gray-1000"
              style={{
                ...indicatorStyle,
                ...(tab === 'request' ? { display: 'block' } : {}),
              }}
            />
          </button>
        </li>

        {context && (
          <li role="presentation">
            <button
              role="tab"
              type="button"
              id="context"
              onClick={() => setTab('context')}
              aria-selected={tab === 'context'}
              className={clsx([
                'bg-transparent',
                'relative',
                'py-3',
                'border-gray-1000',
                'px-3',
                tab === 'context' ? 'text-gray-1000' : 'text-gray-700',
              ])}
            >
              Context
              <div
                aria-hidden="true"
                className="absolute bg-gray-1000"
                style={{
                  ...indicatorStyle,
                  ...(tab === 'context' ? { display: 'block' } : {}),
                }}
              />
            </button>
          </li>
        )}

        {currentState && (
          <li role="presentation">
            <button
              role="tab"
              type="button"
              id="state"
              onClick={() => setTab('state')}
              aria-selected={tab === 'state'}
              className={clsx([
                'bg-transparent',
                'relative',
                'py-3',
                'border-gray-1000',
                'px-3',
                tab === 'state' ? 'text-gray-1000' : 'text-gray-700',
              ])}
            >
              State
              <div
                aria-hidden="true"
                className="absolute bg-gray-1000"
                style={{
                  ...indicatorStyle,
                  ...(tab === 'state' ? { display: 'block' } : {}),
                }}
              />
            </button>
          </li>
        )}

        {hasTransaction && (
          <li role="presentation">
            <button
              role="tab"
              type="button"
              id="request"
              onClick={() => setTab('tx')}
              aria-selected={tab === 'tx'}
              className={clsx([
                'bg-transparent',
                'relative',
                'py-3',
                'border-gray-1000',
                'px-3',
                tab === 'tx' ? 'text-gray-1000' : 'text-gray-700',
              ])}
            >
              {transactionData ? 'Transaction Request' : 'Transaction Receipt'}
              <div
                aria-hidden="true"
                className="absolute bg-gray-1000"
                style={{
                  ...indicatorStyle,
                  ...(tab === 'tx' ? { display: 'block' } : {}),
                }}
              />
            </button>
          </li>
        )}

        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="meta-tags"
            onClick={() => setTab('meta-tags')}
            aria-selected={tab === 'meta-tags'}
            className={clsx([
              'bg-transparent',
              'relative',
              'py-3',
              'border-gray-1000',
              'px-3',
              tab === 'meta-tags' ? 'text-gray-1000' : 'text-gray-700',
            ])}
          >
            Meta Tags
            <div
              aria-hidden="true"
              className="absolute bg-gray-1000"
              style={{
                ...indicatorStyle,
                ...(tab === 'meta-tags' ? { display: 'block' } : {}),
              }}
            />
          </button>
        </li>
      </ul>

      <section
        id="request-section"
        role="tabpanel"
        aria-labelledby="request"
        className="scrollbars flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0"
        style={{
          fontSize: '0.8125rem',
          display: tab === 'request' ? 'flex' : 'none',
        }}
      >
        <RequestContent data={data} />
      </section>

      {hasTransaction && (
        <section
          id="transaction-section"
          role="tabpanel"
          aria-labelledby="transaction"
          className="flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0"
          style={{
            fontSize: '0.8125rem',
            display: tab === 'tx' ? 'flex' : 'none',
          }}
        >
          {transactionId ? (
            <TransactionReceiptContent hash={transactionId} />
          ) : (
            <TransactionContent data={transactionData!} />
          )}
        </section>
      )}

      {context && (
        <section
          id="context-section"
          role="tabpanel"
          aria-labelledby="context"
          className="p-4 scrollbars"
          style={{
            fontSize: '0.8125rem',
            display: tab === 'context' ? 'flex' : 'none',
          }}
        >
          <CodeToHtml
            code={(() => {
              // sort context keys since they can be out of order
              const sortedKeys = Object.keys(context).sort()
              const result: Record<string, unknown> = {}
              for (const key of sortedKeys) {
                result[key] = context[key as keyof typeof context]
              }
              return JSON.stringify(result, null, 2)
            })()}
            lang="json"
          />
        </section>
      )}

      {currentState && (
        <section
          id="state-section"
          role="tabpanel"
          aria-labelledby="state"
          style={{
            fontSize: '0.8125rem',
            display: tab === 'state' ? 'block' : 'none',
          }}
        >
          <div className="scrollbars flex flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0">
            <div className="flex flex-col lg:w-1/2 p-4 gap-2 scrollbars">
              <div className="font-medium text-xs text-gray-700 uppercase">
                Current
              </div>
              {/* TODO: Handle non-JSON state from non-Frog frames */}
              <CodeToHtml
                code={
                  typeof currentState === 'object'
                    ? JSON.stringify(currentState, null, 2)
                    : currentState ?? ''
                }
                lang={typeof currentState === 'object' ? 'json' : 'txt'}
              />
            </div>

            <div className="flex flex-col lg:w-1/2 p-4 gap-2 scrollbars">
              <div className="font-medium text-xs text-gray-700 uppercase">
                Previous
              </div>
              <CodeToHtml
                code={
                  typeof previousState === 'object'
                    ? JSON.stringify(previousState, null, 2)
                    : previousState ?? '-'
                }
                lang={typeof previousState === 'object' ? 'json' : 'txt'}
              />
            </div>
          </div>
        </section>
      )}

      <section
        id="meta-tags-section"
        role="tabpanel"
        aria-labelledby="meta-tags"
        className="relative"
        style={{
          fontSize: '0.8125rem',
          display: tab === 'meta-tags' ? 'block' : 'none',
        }}
      >
        <MetaTagsContent
          htmlTags={frame.debug?.htmlTags}
          image={frame.image}
          imageUrl={frame.imageUrl}
          postUrl={frame.postUrl}
          state={frame.state}
        />
      </section>
    </div>
  )
}

const rowClass = 'flex flex-row py-3 justify-between'
const labelClass = 'text-gray-700 font-medium min-w-36'
const valueClass =
  'text-gray-1000 font-mono text-right whitespace-nowrap overflow-hidden text-ellipsis'

function TransactionReceiptContent(props: {
  hash: Hash
}) {
  const { hash: transactionId } = props

  const { data: transactionReceipt } = useTransactionReceipt({
    hash: transactionId,
    query: {
      select(data) {
        return {
          ...data,
          stringified: JSON.stringify(data, bigIntReplacer, 2),
        }
      },
    },
  })

  const chainId = useStore(
    (state) => state.transactionMap[transactionId].chainId,
  )
  const chain = useMemo(() => {
    if (!chainId) return
    return config.chains.find((chain) => chain.id === chainId)
  }, [chainId])
  const blockExplorer = chain?.blockExplorers?.default

  return (
    <div className="p-4">
      {blockExplorer && (
        <a
          href={`${blockExplorer?.url}/tx/${transactionId}`}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-gray-700 items-center inline-block mb-2 w-fit"
        >
          <span>View on {blockExplorer.name}</span>
        </a>
      )}

      {transactionReceipt ? (
        <div className="scrollbars">
          <CodeToHtml code={transactionReceipt?.stringified} lang="json" />
        </div>
      ) : (
        <div>
          <LoadingDots />
        </div>
      )}
    </div>
  )
}

function TransactionContent(props: {
  data: TransactionResponse
}) {
  const { data } = props

  const abiFunction = useMemo(() => {
    const filtered = data.params.abi?.find((item) => item.type === 'function')
    if (filtered?.type === 'function') return filtered
  }, [data.params.abi])
  const functionData = useMemo(() => {
    const { abi } = data.params
    if (!abi) return
    if (!data.params.data) return
    try {
      return decodeFunctionData({ abi, data: data.params.data })
    } catch {
      return
    }
  }, [data.params])

  const chain = useMemo(() => {
    if (!data) return
    const { reference } = parseChainId(data.chainId)
    return config.chains.find((chain) => chain.id === reference)
  }, [data])
  const blockExplorer = chain?.blockExplorers?.default

  return (
    <>
      <div className="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
        <div className={rowClass}>
          <div className={labelClass}>Method</div>
          <div className={valueClass}>{data.method}</div>
        </div>

        <div className={rowClass}>
          <div className={labelClass}>Chain</div>
          <div className={valueClass}>
            {chain?.name ? chain?.name : data.chainId}
          </div>
        </div>

        <div className={rowClass}>
          <div className={labelClass}>Address (To)</div>
          <div
            className={clsx([valueClass, 'flex', 'gap-1', 'items-center'])}
            title={data.params.to}
          >
            <span>
              {data.params.to.slice(0, 4)}...{data.params.to.slice(-4)}
            </span>
            {blockExplorer && (
              <a
                href={`${blockExplorer?.url}/address/${data.params.to}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-gray-700"
              >
                <span className="sr-only">Open in block explorer</span>
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </div>

        {data.params.value && (
          <div className={rowClass}>
            <div className={labelClass}>Value</div>
            <div className={valueClass}>
              {data.method.includes('eth') && (
                <span className="text-gray-700 select-none mr-1">Ξ</span>
              )}
              {formatEther(BigInt(data.params.value))}
            </div>
          </div>
        )}

        {abiFunction && (
          <div className={rowClass}>
            <div className={labelClass}>Contract Function</div>
            <div className={valueClass}>{abiFunction.name}</div>
          </div>
        )}

        {abiFunction && (
          <div className="flex flex-col gap-2 py-3">
            <FormattedAbiItem
              abiItem={abiFunction}
              showType={false}
              showReturns={false}
            />

            {/* TODO: Switch to Rivet-style decoded data */}
            {functionData?.args && (
              <div className="scrollbars">
                <CodeToHtml
                  code={JSON.stringify(functionData.args, bigIntReplacer, 2)}
                  lang="json"
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col p-4 lg:w-1/2 scrollbars">
        <CodeToHtml code={JSON.stringify(data, null, 2)} lang="json" />
      </div>
    </>
  )
}

function RequestContent(props: {
  data: Data
}) {
  const { data } = props

  const body = 'body' in data ? data.body : null
  const url = new URL(data.url)

  const transactionData = data.type === 'tx' ? data.response.data : undefined

  return (
    <>
      <div className="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
        <div className={rowClass}>
          <div className={labelClass}>Method</div>
          <div className="flex items-center border px-1 py-0.5 leading-4 rounded text-gray-900 font-mono uppercase">
            {data.method}
          </div>
        </div>

        <div className={rowClass}>
          <div className={labelClass}>Time</div>
          <div className={valueClass}>
            {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>

        <div className={rowClass}>
          <div className={labelClass}>Host</div>
          <div className={valueClass} title={url.host}>
            {url.host}
          </div>
        </div>

        <div className={rowClass}>
          <div className={labelClass}>Request Path</div>
          <div className={valueClass}>{url.pathname}</div>
        </div>

        {body && (
          <>
            <div className={rowClass}>
              <div className={labelClass}>User FID</div>
              <div className={valueClass}>{body.fid}</div>
            </div>

            {body.inputText && (
              <div className={rowClass}>
                <div className={labelClass}>Input Text</div>
                <div className={valueClass}>{body.inputText}</div>
              </div>
            )}

            <div className={rowClass}>
              <div className={labelClass}>Button Index</div>
              <div className={valueClass}>{body.buttonIndex}</div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
        <div className={rowClass}>
          <div className={labelClass}>Status Code</div>
          <div
            className={clsx([
              'flex',
              'flex-row',
              'gap-2',
              'items-center',
              'font-mono',
              data.response.success ? 'text-green-900' : 'text-red-900',
            ])}
          >
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
                data.response.success ? 'border-green-100' : 'border-red-100',
              ])}
            >
              {data.response.status}
            </div>
            <div>{data.response.statusText}</div>
          </div>
        </div>

        {data.context?.verified !== undefined && (
          <div className={rowClass}>
            <div className={labelClass}>Verified</div>
            <div className={valueClass}>{`${data.context.verified}`}</div>
          </div>
        )}

        {data.metrics.speed && (
          <div className={rowClass}>
            <div className={labelClass}>Response Time</div>
            <div className={valueClass}>{formatSpeed(data.metrics.speed)}</div>
          </div>
        )}

        {'htmlSize' in data.metrics && (
          <div className={rowClass}>
            <div className={labelClass}>Frame Size</div>
            <div className={valueClass}>
              {formatFileSize(data.metrics.htmlSize)}
            </div>
          </div>
        )}

        {'imageSize' in data.metrics && (
          <div className={rowClass}>
            <div className={labelClass}>Image Size</div>
            <div className={valueClass}>
              {formatFileSize(data.metrics.imageSize)}
            </div>
          </div>
        )}

        {'location' in data.response && (
          <div className={rowClass}>
            <div className={labelClass}>Location</div>
            <div
              className={clsx([
                valueClass,
                'flex',
                'gap-0.5',
                'items-center',
                'justify-end',
              ])}
              title={data.response.location}
            >
              <div
                className="text-ellipsis inline-block md:max-w-[80%]"
                style={{ overflow: 'clip' }}
              >
                {data.response.location}
              </div>

              <a
                href={data.response.location}
                target="_blank"
                rel="noreferrer noopener"
                className="text-gray-700 inline-block"
              >
                <span className="sr-only">Open in link</span>
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        )}

        {transactionData && (
          <div className={rowClass}>
            <div className={labelClass}>Transaction Method</div>
            <div className={valueClass}>{transactionData.method}</div>
          </div>
        )}

        {data.response.error && (
          <div className={rowClass}>
            <div className={labelClass}>Error</div>
            <div className={valueClass}>{data.response.error}</div>
          </div>
        )}
      </div>
    </>
  )
}

type MetaTagsContentProps = {
  htmlTags: readonly string[] | undefined
  image: string
  imageUrl: string
  postUrl: string | undefined
  state: string | undefined
}

function MetaTagsContent(props: MetaTagsContentProps) {
  const { htmlTags = [], image, imageUrl, postUrl, state } = props

  const metaTags = (() => {
    let html = ''
    for (const tag of htmlTags) {
      let text = tag
      if (text.includes('_frog_fc:frame:image'))
        text = text.replace('_frog_fc:frame:image', imageUrl)
      else if (postUrl && text.includes('_frog_fc:frame:post_url'))
        text = text.replace('_frog_fc:frame:post_url', postUrl)
      else if (state && text.includes('_frog_fc:frame:state'))
        text = text.replace('_frog_fc:frame:state', state)
      else if (text.includes('_frog_og:image'))
        text = text.replace('_frog_og:image', image)
      html += `${text}\n`
    }
    return html
  })()

  const { copied, copy } = useCopyToClipboard({ value: metaTags })

  return (
    <>
      <div
        className="items-center absolute"
        style={{ right: '0.5rem', top: '0.5rem' }}
      >
        <button
          className="text-gray-600 bg-transparent p-1.5 rounded hover:bg-gray-100"
          aria-label={copied ? 'copied' : 'copy to clipboard'}
          type="button"
          onClick={copy}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      <div className="p-4 scrollbars">
        <CodeToHtml code={metaTags} lang="html" />
      </div>
    </>
  )
}
