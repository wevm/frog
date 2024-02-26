export function Tabs() {
  const indicatorStyle = {
    display: 'none',
    height: '2px',
    bottom: '0',
    left: '0.75rem',
    right: '0.75rem',
    position: 'absolute',
  }

  const rowClass = 'flex flex-row py-3 justify-between'
  const labelClass = 'text-gray-700 font-medium min-w-36'
  const valueClass = 'text-gray-1000 font-mono line-clamp-2 text-right'
  return (
    <div
      class="border rounded-md bg-background-100"
      x-data="{
        get state() {
          if (data.context.status === 'initial' && data.context.previousState)
            return data.context.previousState
          return frame.debug.state
        },
      }"
    >
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
            class="bg-transparent relative py-3 border-gray-1000 px-3"
            x-on:click="tab = 'request'"
            {...{
              ':aria-selected': 'tab === "request"',
              ':class': `{
                  'text-gray-700': tab !== 'request',
                  'text-gray-1000': tab === 'request',
                }`,
            }}
          >
            Request
            <div
              aria-hidden="true"
              class="bg-gray-1000"
              style={indicatorStyle}
              {...{
                ':style': `tab === 'request' && {
                    display: 'block',
                  }`,
              }}
            />
          </button>
        </li>

        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="context"
            class="relative bg-transparent py-3 border-gray-1000 px-3"
            x-on:click="tab = 'context'"
            {...{
              ':aria-selected': 'tab === "context"',
              ':class': `{
                  'text-gray-700': tab !== 'context',
                  'text-gray-1000': tab === 'context',
                }`,
            }}
          >
            Context
            <div
              aria-hidden="true"
              class="bg-gray-1000"
              style={indicatorStyle}
              {...{
                ':style': `tab === 'context' && {
                    display: 'block',
                  }`,
              }}
            />
          </button>
        </li>

        <li role="presentation" x-show="state">
          <button
            role="tab"
            type="button"
            id="state"
            class="relative bg-transparent py-3 border-gray-1000 px-3"
            x-on:click="tab = 'state'"
            {...{
              ':aria-selected': 'tab === "state"',
              ':class': `{
                  'text-gray-700': tab !== 'state',
                  'text-gray-1000': tab === 'state',
                }`,
            }}
          >
            State
            <div
              aria-hidden="true"
              class="bg-gray-1000"
              style={indicatorStyle}
              {...{
                ':style': `tab === 'state' && {
                    display: 'block',
                  }`,
              }}
            />
          </button>
        </li>

        <li role="presentation">
          <button
            role="tab"
            type="button"
            id="meta-tags"
            class="relative bg-transparent py-3 border-gray-1000 px-3"
            x-on:click="tab = 'meta-tags'"
            {...{
              ':aria-selected': 'tab === "meta-tags"',
              ':class': `{
                  'text-gray-700': tab !== 'meta-tags',
                  'text-gray-1000': tab === 'meta-tags',
                }`,
            }}
          >
            Meta Tags
            <div
              aria-hidden="true"
              class="bg-gray-1000"
              style={indicatorStyle}
              {...{
                ':style': `tab === 'meta-tags' && {
                    display: 'block',
                  }`,
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
        x-data="{
            get body() { return data.body },
            get url() {
              if (data.body) return data.body.url
              return data.url
            },
          }"
        x-show="tab === 'request'"
        style={{ fontSize: '0.8125rem' }}
      >
        <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
          <div class={rowClass}>
            <div class={labelClass}>Method</div>
            <div
              class="flex items-center border px-1.5 rounded-sm text-gray-900 font-mono uppercase"
              x-text="data.method"
            />
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Time</div>
            <div
              class={valueClass}
              x-text="new Date(data.timestamp).toLocaleString()"
            />
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Host</div>
            <div class={valueClass} x-text="new URL(url).host" />
          </div>

          <div class={rowClass}>
            <div class={labelClass}>Request Path</div>
            <div class={valueClass} x-text="new URL(url).pathname" />
          </div>

          <div class={rowClass} x-show="body?.fid">
            <div class={labelClass}>FID</div>
            <div class={valueClass} x-text="`#${body?.fid}`" />
          </div>

          <div class={rowClass} x-show="body?.inputText">
            <div class={labelClass}>Input Text</div>
            <div class={valueClass} x-text="body?.inputText" />
          </div>

          <div class={rowClass} x-show="body?.buttonIndex">
            <div class={labelClass}>Button Index</div>
            <div class={valueClass} x-text="body?.buttonIndex" />
          </div>
        </div>

        <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
          <div class={rowClass}>
            <div class={labelClass}>Status Code</div>
            <div
              class="flex flex-row gap-2 items-center font-mono"
              {...{
                ':class': `{
                    'text-green-900': data.response.success,
                    'text-red-900': !data.response.success,
                  }`,
              }}
            >
              <div
                class="flex items-center border px-1.5 rounded-sm uppercase"
                x-text="data.response.status"
                {...{
                  ':class': `{
                      'border-green-100': data.response.success,
                      'border-red-100': !data.response.success,
                    }`,
                }}
              />
              <div x-text="data.response.statusText" />
            </div>
          </div>

          <div class={rowClass} x-show="data.metrics.speed">
            <div class={labelClass}>Response Time</div>
            <div class={valueClass} x-text="formatSpeed(data.metrics.speed)" />
          </div>

          <div class={rowClass} x-show="data.metrics.htmlSize">
            <div class={labelClass}>Frame Size</div>
            <div
              class={valueClass}
              x-text="formatFileSize(data.metrics.htmlSize)"
            />
          </div>

          <div class={rowClass} x-show="data.metrics.imageSize">
            <div class={labelClass}>Image Size</div>
            <div
              class={valueClass}
              x-text="formatFileSize(data.metrics.imageSize)"
            />
          </div>

          <div class={rowClass} x-show="data.response.location">
            <div class={labelClass}>Location</div>
            <div class={valueClass} x-text="data.response.location" />
          </div>

          <div class={rowClass} x-show="data.response.error">
            <div class={labelClass}>Error</div>
            <div class={valueClass} x-text="data.response.error" />
          </div>
        </div>
      </section>

      <section
        id="context-section"
        role="tabpanel"
        aria-labelledby="context"
        class="p-4 scrollbars"
        x-show="tab === 'context'"
        style={{ fontSize: '0.8125rem' }}
      >
        <div x-html="getCodeHtml(JSON.stringify(data.context ?? {}, null, 2), 'json')" />
      </section>

      <section
        id="state-section"
        role="tabpanel"
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
        class="p-4 scrollbars relative"
        x-show="tab === 'meta-tags'"
        style={{ fontSize: '0.8125rem' }}
        x-data="{
          get metaTags() {
            let html = ''
            for (const tag of frame.debug.htmlTags) {
              let text = tag
              if (text.includes('_frog_fc:frame:image')) text = text.replace('_frog_fc:frame:image', frame.imageUrl)
              else if (text.includes('_frog_fc:frame:state')) text = text.replace('_frog_fc:frame:state', frame.state)
              else if (text.includes('_frog_og:image')) text = text.replace('_frog_og:image', frame.image)
              html += text + '\n'
            }
            return html
          }
        }"
      >
        <div x-html="getCodeHtml(metaTags, 'html')" />
      </section>
    </div>
  )
}
