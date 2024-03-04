import { useDispatch } from '../hooks/useDispatch.js'
import { useState } from '../hooks/useState.js'
import { clsx } from '../lib/clsx.js'
import { type Data, type Frame } from '../types.js'
import { formatFileSize, formatSpeed } from '../utils/format.js'
import { checkIcon, copyIcon } from './icons.js'

type TabsProps = {
  data: Data
  frame: Frame
  url: string
}

export function Tabs(props: TabsProps) {
  const { data, frame, url } = props
  const { tab } = useState()
  const { setState } = useDispatch()

  const body = 'body' in data ? data.body : null
  const state =
    data.context.status === 'initial' && data.context.previousState
      ? data.context.previousState
      : frame.debug?.state

  const indicatorStyle = {
    display: 'none',
    height: '2px',
    bottom: '0',
    left: '0.75rem',
    right: '0.75rem',
  }

  const rowClass = 'flex flex-row py-3 justify-between'
  const labelClass = 'text-gray-700 font-medium min-w-36'
  const valueClass =
    'text-gray-1000 font-mono text-right whitespace-nowrap overflow-hidden text-ellipsis'
  return (
    <div class="border rounded-md bg-background-100">
      <ul
        role="tablist"
        class="bg-background-200 border rounded-t-md flex flex-row text-sm"
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
            onClick={() => setState((x) => ({ ...x, tab: 'request' }))}
            aria-selected={tab === 'request'}
            class={clsx([
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
              class="absolute bg-gray-1000"
              style={{
                ...indicatorStyle,
                ...(tab === 'request' ? { display: 'block' } : {}),
              }}
            />
          </button>
        </li>

        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="context"
            onClick={() => setState((x) => ({ ...x, tab: 'context' }))}
            aria-selected={tab === 'context'}
            class={clsx([
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
              class="absolute bg-gray-1000"
              style={{
                ...indicatorStyle,
                ...(tab === 'context' ? { display: 'block' } : {}),
              }}
            />
          </button>
        </li>

        <li role="presentation" x-show="state">
          <button
            role="tab"
            type="button"
            id="state"
            onClick={() => setState((x) => ({ ...x, tab: 'state' }))}
            aria-selected={tab === 'state'}
            class={clsx([
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
              class="absolute bg-gray-1000"
              style={{
                ...indicatorStyle,
                ...(tab === 'state' ? { display: 'block' } : {}),
              }}
            />
          </button>
        </li>

        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="meta-tags"
            onClick={() => setState((x) => ({ ...x, tab: 'meta-tags' }))}
            aria-selected={tab === 'meta-tags'}
            class={clsx([
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
              class="absolute bg-gray-1000"
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
        class="scrollbars flex flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0"
        style={{
          fontSize: '0.8125rem',
          display: tab === 'request' ? 'flex' : 'none',
        }}
      >
        <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
          <div class={rowClass}>
            <div class={labelClass}>Method</div>
            <div class="flex items-center border px-1 py-0.5 leading-4 rounded-sm text-gray-900 font-mono uppercase">
              {data.method}
            </div>
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Time</div>
            <div class={valueClass} x-text="">
              {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Host</div>
            <div class={valueClass} title={new URL(url).host}>
              {new URL(url).host}
            </div>
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Request Path</div>
            <div class={valueClass}>{new URL(url).pathname}</div>
          </div>

          {body && (
            <>
              <div class={rowClass}>
                <div class={labelClass}>User FID</div>
                <div class={valueClass}>#{body.fid}</div>
              </div>

              {body.inputText && (
                <div class={rowClass}>
                  <div class={labelClass}>Input Text</div>
                  <div class={valueClass}>{body.inputText}</div>
                </div>
              )}

              <div class={rowClass}>
                <div class={labelClass}>Button Index</div>
                <div class={valueClass}>{body.buttonIndex}</div>
              </div>
            </>
          )}
        </div>

        <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
          <div class={rowClass}>
            <div class={labelClass}>Status Code</div>
            <div
              class={clsx([
                'flex',
                'flex-row',
                'gap-2',
                'items-center',
                'font-mono',
                data.response.success ? 'text-green-900' : 'text-red-900',
              ])}
            >
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
                  data.response.success ? 'border-green-100' : 'border-red-100',
                ])}
              >
                {data.response.status}
              </div>
              <div>{data.response.statusText}</div>
            </div>
          </div>

          {data.context.verified !== undefined && (
            <div class={rowClass}>
              <div class={labelClass}>Verified</div>
              <div class={valueClass}>{`${data.context.verified}`}</div>
            </div>
          )}

          {data.metrics.speed && (
            <div class={rowClass}>
              <div class={labelClass}>Response Time</div>
              <div class={valueClass}>{formatSpeed(data.metrics.speed)}</div>
            </div>
          )}

          {'htmlSize' in data.metrics && (
            <div class={rowClass}>
              <div class={labelClass}>Frame Size</div>
              <div class={valueClass}>
                {formatFileSize(data.metrics.htmlSize)}
              </div>
            </div>
          )}

          {'imageSize' in data.metrics && (
            <div class={rowClass}>
              <div class={labelClass}>Image Size</div>
              <div class={valueClass}>
                {formatFileSize(data.metrics.imageSize)}
              </div>
            </div>
          )}

          {'location' in data.response && (
            <div class={rowClass}>
              <div class={labelClass}>Location</div>
              <div
                class={valueClass}
                x-text="data.response.location"
                title={data.response.location}
              />
            </div>
          )}

          {data.response.error && (
            <div class={rowClass}>
              <div class={labelClass}>Error</div>
              <div class={valueClass}>{data.response.error}</div>
            </div>
          )}
        </div>
      </section>

      <section
        id="context-section"
        role="tabpanel"
        aria-labelledby="context"
        class="p-4 scrollbars"
        style={{
          fontSize: '0.8125rem',
          display: tab === 'context' ? 'flex' : 'none',
        }}
      >
        <div x-html="getCodeHtml(JSON.stringify(data.context ?? {}, null, 2), 'json')" />
      </section>

      <section
        id="state-section"
        role="tabpanel"
        x-cloak
        aria-labelledby="state"
        x-data="{
          async init() {
            const stringifiedState = JSON.stringify(this.state ?? {}, null, 2)
            const stringifiedPreviousState = JSON.stringify(this.previousState ?? {}, null, 2)
            const [stateHtml, previousStateHtml] = await Promise.all([
              getCodeHtml(stringifiedState, 'json'),
              getCodeHtml(stringifiedPreviousState, 'json')
            ])
            this.stateHtml = stateHtml
            this.previousStateHtml = previousStateHtml

            $watch('state', async (value) => {
              const stringified = JSON.stringify(value ?? {}, null, 2)
              const html = await getCodeHtml(stringified, 'json')
              this.stateHtml = html
            })
            $watch('previousState', async (value) => {
              const stringified = JSON.stringify(value ?? {}, null, 2)
              const html = await getCodeHtml(stringified, 'json')
              this.previousStateHtml = html
            })
          },
          get previousState() {
            const previousKey = stack[stackIndex - 1]
            if (!previousKey) return

            const previousData = dataMap[previousKey]
            const previousContext = previousData.context
            if (previousContext.status === 'initial' && previousContext.previousState)
              return previousContext.previousState

            return previousData.frame.debug.state
          },
          stateHtml: undefined,
          previousStateHtml: undefined,
        }"
        x-show="tab === 'state'"
      >
        <template x-if="state">
          <div
            class="scrollbars flex flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0"
            style={{ fontSize: '0.8125rem' }}
          >
            <div class="flex flex-col lg:w-1/2 p-4 gap-2 scrollbars">
              <div class="font-medium text-xs text-gray-700 uppercase">
                Current
              </div>
              <div x-html="stateHtml ?? `<pre class='text-gray-500'>${JSON.stringify(state ?? {}, null, 2)}</pre>`" />
            </div>

            <div class="flex flex-col lg:w-1/2 p-4 gap-2 scrollbars">
              <div class="font-medium text-xs text-gray-700 uppercase">
                Previous
              </div>
              <div x-html="previousStateHtml ?? `<pre class='text-gray-500'>${JSON.stringify(previousState ?? {}, null, 2)}</pre>`" />
            </div>
          </div>
        </template>
      </section>

      <section
        id="meta-tags-section"
        role="tabpanel"
        aria-labelledby="meta-tags"
        class="relative"
        style={{
          fontSize: '0.8125rem',
          display: tab === 'meta-tags' ? 'block' : 'none',
        }}
        x-data="{
          copied: false,
          get metaTags() {
            let html = ''
            for (const tag of frame.debug.htmlTags) {
              let text = tag
              if (text.includes('_frog_fc:frame:image')) text = text.replace('_frog_fc:frame:image', frame.imageUrl)
              else if (text.includes('_frog_fc:frame:post_url')) text = text.replace('_frog_fc:frame:post_url', frame.postUrl)
              else if (text.includes('_frog_fc:frame:state')) text = text.replace('_frog_fc:frame:state', frame.state)
              else if (text.includes('_frog_og:image')) text = text.replace('_frog_og:image', frame.image)
              html += text + '\n'
            }
            return html
          }
        }"
      >
        <div
          class="items-center absolute"
          style={{ right: '0.5rem', top: '0.5rem' }}
        >
          <button
            aria-label="copy"
            type="button"
            class="text-gray-600 bg-transparent p-1.5 rounded-sm hover:bg-gray-100"
            x-show="!copied"
            x-on:click="
              if (copied) return
              navigator.clipboard.writeText(metaTags)
              copied = true
              setTimeout(() => copied = false, 1_000)
            "
          >
            {copyIcon}
          </button>
          <div
            class="text-green-900 bg-green-100 p-1.5 rounded-sm"
            x-show="copied"
          >
            {checkIcon}
          </div>
        </div>

        <div class="p-4 scrollbars">
          <div x-html="getCodeHtml(metaTags, 'html')" />
        </div>
      </section>
    </div>
  )
}
