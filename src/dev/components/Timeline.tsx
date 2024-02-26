import {
  chevronDownIcon,
  chevronUpIcon,
  circleBackslashIcon,
  personIcon,
} from './icons.js'

export function Timeline() {
  const buttonClass =
    'border rounded-sm bg-background-200 p-1 text-gray-700 hover:bg-gray-100'

  return (
    <div class="border rounded-md overflow-hidden h-timeline flex flex-col justify-between divide-y">
      <div class="scrollbars">
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
                  '(index !== 0 || logs.length < 6) && { borderBottomWidth: `1px` }',
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
      <div class="bg-background-100 px-2 py-2 flex justify-between">
        <div class="flex gap-1">
          <div
            class="border rounded-sm bg-background-200 text-gray-700 divide-x"
            style={{ height: '25px' }}
          >
            <button
              class="bg-transparent p-1 hover:bg-gray-100 rounded-l-sm"
              type="button"
              x-on:click="
                const nextLogIndex = logIndex + 1 > logs.length - 1 ? 0 : logIndex + 1
                const key = logs[nextLogIndex]
                dataKey = key
                logIndex = nextLogIndex
                // TODO: Scroll page
              "
            >
              {chevronUpIcon}
            </button>
            <button
              class="bg-transparent p-1 hover:bg-gray-100 rounded-r-sm"
              type="button"
              x-on:click="
                const nextLogIndex = logIndex - 1 >= 0 ? logIndex - 1 : logs.length - 1
                const key = logs[nextLogIndex]
                dataKey = key
                logIndex = nextLogIndex
                // TODO: Scroll page
              "
            >
              {chevronDownIcon}
            </button>
          </div>
          <button
            class={buttonClass}
            type="button"
            x-on:click="
              const log = logs.at(-1)
              dataKey = log
              logs = [log]
              logIndex = -1
            "
          >
            {circleBackslashIcon}
          </button>
        </div>

        <button
          class={buttonClass}
          type="button"
          x-on:click="
            // TODO: Override/change FID, Cast
          "
        >
          {personIcon}
        </button>
      </div>
    </div>
  )
}
