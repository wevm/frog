export function Timeline() {
  return (
    <div class="border rounded-md overflow-hidden h-sidebar md:h-sidebar">
      <div class="scrollbars h-full">
        <div
          class="bg-background-100 w-full flex"
          style={{
            flexDirection: 'column-reverse',
            justifyContent: 'flex-end',
          }}
        >
          <template x-for="(key, index) in logs">
            <button
              type="button"
              class="flex flex-col gap-2 p-4 w-full border-gray-200 hover:bg-gray-100"
              {...{
                ':class':
                  'index === logIndex ? "bg-gray-100" : "bg-transparent"',
                ':style':
                  '(index !== 0 || logs.length < 7) && { borderBottomWidth: `1px` }',
                ':tabIndex': 'logs.length - index',
              }}
              x-data="{
            get log() { return dataMap[key] },
          }"
              x-on:click={`
            dataKey = key
            logIndex = index
          `}
            >
              <div class="flex flex-row items-center justify-between w-full">
                <div class="flex gap-1.5 font-mono text-gray-700 text-xs items-center">
                  <div
                    class="flex items-center border px-1.5 rounded-sm text-gray-900 uppercase"
                    x-text="log.method"
                  />
                  <div
                    class="flex items-center border px-1.5 rounded-sm uppercase"
                    x-text="log.response.status"
                    {...{
                      ':class': `{
                        'border-green-100': log.response.success,
                        'text-green-900': log.response.success,
                        'border-red-100': !log.response.success,
                        'text-red-900': !log.response.success,
                      }`,
                    }}
                  />
                  <span x-text="formatSpeed(log.metrics.speed)" />
                </div>
                <div
                  class="font-mono text-gray-700 text-xs"
                  x-text="formatTime(log.timestamp)"
                />
              </div>

              <div class="flex gap-1.5 font-mono text-gray-900 text-xs">
                <span x-text="formatUrl(log.body ? log.body.url : log.url)" />
              </div>
            </button>
          </template>
        </div>
      </div>
    </div>
  )
}
