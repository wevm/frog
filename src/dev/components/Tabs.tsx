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
  const labelClass = 'text-gray-700 font-medium text-sm min-w-36'
  const valueClass = 'text-gray-1000 font-mono text-sm line-clamp-2 text-right'
  return (
    <div
      x-data="{
        tab: $persist('request'),
      }"
    >
      <div class="border rounded-md bg-background-100 h-full">
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
          class="text-sm scrollbars flex flex-col lg:flex-row divide-y lg:divide-x lg:divide-y-0"
          x-data="{
            get frameData() { return data.context.frameData },
          }"
          x-show="tab === 'request'"
          style={{ fontSize: '0.8125rem' }}
        >
          <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
            <div class={rowClass}>
              <div class={labelClass}>Method</div>
              <div
                class="flex items-center border px-1.5 rounded-sm text-gray-1000 font-mono"
                x-text="data.request.method"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div class={rowClass}>
              <div class={labelClass}>Time</div>
              <div
                class={valueClass}
                x-text="new Date(data.request.timestamp).toLocaleString()"
              />
            </div>

            <div class={rowClass}>
              <div class={labelClass}>Host</div>
              <div class={valueClass} x-text="new URL(data.request.url).host" />
            </div>

            <div class={rowClass}>
              <div class={labelClass}>Request Path</div>
              <div
                class={valueClass}
                x-text="new URL(data.request.url).pathname"
              />
            </div>

            <div class={rowClass} x-show="frameData?.fid">
              <div class={labelClass}>FID</div>
              <div class={valueClass} x-text="`#${frameData?.fid}`" />
            </div>

            <div class={rowClass} x-show="frameData?.inputText">
              <div class={labelClass}>Input Text</div>
              <div class={valueClass} x-text="frameData?.inputText" />
            </div>

            <div class={rowClass} x-show="frameData?.buttonIndex">
              <div class={labelClass}>Button Index</div>
              <div class={valueClass} x-text="frameData?.buttonIndex" />
            </div>
          </div>

          <div class="flex flex-col px-4 py-2 lg:w-1/2 divide-y">
            <div class={rowClass}>
              <div class={labelClass}>Status Code</div>
              <div
                class="flex flex-row gap-2 items-center font-mono"
                {...{
                  ':class': `{
                    'text-green-900': data.request.response.success,
                    'text-red-900': !data.request.response.success,
                  }`,
                }}
              >
                <div
                  class="flex items-center border px-1.5 rounded-sm"
                  x-text="data.request.response.status"
                  style={{ textTransform: 'uppercase' }}
                  {...{
                    ':class': `{
                      'border-green-100': data.request.response.success,
                      'border-red-100': !data.request.response.success,
                    }`,
                  }}
                />
                <div x-text="data.request.response.statusText" />
              </div>
            </div>

            <div class={rowClass} x-show="data.request.metrics.speed">
              <div class={labelClass}>Response Time</div>
              <div
                class={valueClass}
                x-text="formatSpeed(data.request.metrics.speed)"
              />
            </div>

            <div class={rowClass} x-show="data.request.metrics.htmlSize">
              <div class={labelClass}>Frame Size</div>
              <div
                class={valueClass}
                x-text="formatFileSize(data.request.metrics.htmlSize)"
              />
            </div>

            <div class={rowClass} x-show="data.request.metrics.imageSize">
              <div class={labelClass}>Image Size</div>
              <div
                class={valueClass}
                x-text="formatFileSize(data.request.metrics.imageSize)"
              />
            </div>

            <div class={rowClass} x-show="data.request.response.location">
              <div class={labelClass}>Location</div>
              <div class={valueClass} x-text="data.request.response.location" />
            </div>

            <div class={rowClass} x-show="data.request.response.error">
              <div class={labelClass}>Error</div>
              <div class={valueClass} x-text="data.request.response.error" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
