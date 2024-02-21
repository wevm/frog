export function Tabs() {
  const indicatorStyle = {
    display: 'none',
    height: '2px',
    bottom: '0',
    left: '0.75rem',
    right: '0.75rem',
    position: 'absolute',
  }
  return (
    <div>
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
          class="text-sm scrollbars flex flex-col lg:flex-row gap-4 divide-y lg:divide-x lg:divide-y-0"
          x-show="tab === 'request'"
        >
          <div class="flex flex-col gap-4 flex-grow p-4">
            <div class="font-medium text-gray-900">Request</div>
            <div style={{ height: '10rem' }} />
          </div>
          <div class="flex-grow p-4">
            <div class="font-medium text-gray-900">Response</div>
          </div>
        </section>

        <section
          id="context-section"
          role="tabpanel"
          aria-labelledby="context"
          class="p-4 text-sm scrollbars"
          x-html="data.tools.contextHtml"
          x-show="tab === 'context'"
        />

        <section
          id="meta-tags-section"
          role="tabpanel"
          aria-labelledby="meta-tags"
          class="p-4 text-sm scrollbars"
          x-html="data.tools.metaTagsHtml"
          x-show="tab === 'meta-tags'"
        />
      </div>
    </div>
  )
}
