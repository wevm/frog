import {
  chevronDownIcon,
  chevronUpIcon,
  circleBackslashIcon,
  idCardIcon,
  pencil2Icon,
  resetIcon,
} from './icons.js'

export function Timeline() {
  const buttonClass =
    'border rounded-sm bg-background-200 p-1.5 text-gray-700 hover:bg-gray-100'

  return (
    <div
      class="h-timeline flex flex-col justify-between"
      x-data="{
        previousLog() {
          const nextLogIndex = logIndex + 1 > logs.length - 1 ? 0 : logIndex + 1
          const key = logs[nextLogIndex]
          dataKey = key
          logIndex = nextLogIndex

          const element = document.querySelector(`#log-${nextLogIndex}`)
          element.scrollIntoView({ block: 'nearest' })
        },
        nextLog() {
          let nextLogIndex = logIndex - 1 >= 0 ? logIndex - 1 : logs.length - 1
          if (logIndex === -1 && logs.length > 1) nextLogIndex = logs.length - 2

          const key = logs[nextLogIndex]
          dataKey = key
          logIndex = nextLogIndex

          const element = document.querySelector(`#log-${nextLogIndex}`)
          element.scrollIntoView({ block: 'nearest' })
        },
      }"
    >
      <div class="border rounded-t-md overflow-hidden flex flex-col h-full">
        <div x-ref="container" class="scrollbars">
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
                  ':id': '`log-${index}`',
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
                      class="flex items-center border px-1 py-0.5 leading-4 rounded-sm text-gray-900 uppercase"
                      x-text="log.method"
                    />
                    <div
                      class="flex items-center border px-1 py-0.5 leading-4 rounded-sm uppercase"
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

                <div
                  class="font-mono text-gray-900 text-xs overflow-hidden whitespace-nowrap text-ellipsis text-left"
                  x-data="{
                    get url() {
                      const urlString = log.body ? log.body.url : log.url
                      const url = new URL(urlString)
                      if (urlString.length > 45) return url.pathname
                      return formatUrl(urlString)
                    }
                  }"
                  x-text="url"
                />
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="bg-background-100 px-2 py-2 flex justify-between border rounded-b-md border-t-0">
        <div class="flex gap-1.5">
          <div class="flex border rounded-sm bg-background-200 text-gray-700 divide-x">
            <button
              class="bg-transparent p-1.5 hover:bg-gray-100 rounded-l-sm"
              type="button"
              x-on:click="previousLog"
            >
              {chevronUpIcon}
            </button>

            <button
              class="bg-transparent p-1.5 hover:bg-gray-100 rounded-r-sm"
              type="button"
              x-on:click="nextLog"
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

        <div x-data="{ open: false }" class="relative">
          <button
            class={buttonClass}
            type="button"
            x-on:click="open = !open"
            x-ref="button"
          >
            {idCardIcon}
          </button>

          <form
            x-cloak
            x-show="open"
            class="border bg-background-100 rounded-lg w-full overflow-hidden px-4 pb-4 pt-3 flex flex-col gap-3 absolute"
            style={{
              marginBottom: '4px',
              bottom: '100%',
              right: '0',
              width: '230px',
              zIndex: '10',
            }}
            {...{
              '@click.outside': 'close',
              '@keyup.escape': 'close',
              '@submit.prevent': 'submit',
              'x-trap': 'open',
            }}
            x-effect="
              if (open) {
                userFid = overrides.userFid
                castFid = overrides.castFid
                castHash = overrides.castHash
              }
            "
            x-data="{
              userFid: overrides.userFid,
              castFid: overrides.castFid,
              castHash: overrides.castHash,
              overrideUserFid: Boolean(user) && overrides.userFid !== user.userFid,

              close() {
                this.overrideUserFid = Boolean(user) && overrides.userFid !== user.userFid
                open = false
              },
              async submit() {
                overrides = {
                  userFid: parseInt(this.userFid, 10),
                  castFid: parseInt(this.castFid, 10),
                  castHash: this.castHash,
                }

                const nextStackId = logs[logIndex] ?? dataKey
                const nextData = dataMap[dataKey]
                if (!nextData || nextData?.type === 'initial') {
                  open = false
                  return
                }

                const body = {
                  ...nextData.body,
                  castId: {
                    fid: overrides.castFid,
                    hash: overrides.castHash,
                  },
                  fid: overrides.userFid !== user?.userFid ? overrides.userFid : user.userFid,
                }

                let json
                switch (nextData.type) {
                  case 'action': {
                    json = await postFrameAction(body)
                    break
                  }
                  case 'redirect': {
                    json = await postFrameRedirect(body)
                    break
                  }
                }

                dataKey = json.id
                inputText = ''

                open = false
              },
            }"
          >
            <div class="flex flex-col gap-0.5">
              <div
                class="text-xs text-gray-700 font-medium"
                style={{ paddingLeft: '0.25rem' }}
              >
                User
              </div>

              <div class="relative flex items-center">
                <input
                  aria-label="User FID"
                  autocomplete="off"
                  class="bg-background-200 rounded-md border px-3 py-2 text-sm leading-snug w-full text-xs"
                  name="userFid"
                  type="text"
                  required
                  pattern="^[0-9]*$"
                  placeholder="FID"
                  x-model="userFid"
                  x-ref="userFid"
                  data-1p-ignore
                  {...{
                    ':disabled': 'Boolean(user) && overrideUserFid === false',
                  }}
                />

                <button
                  aria-label="Edit User FID"
                  x-show="!overrideUserFid && user?.userFid === parseInt(userFid, 10)"
                  class="absolute text-xs bg-transparent text-gray-700 font-medium hover:bg-gray-100 p-1 rounded-sm"
                  type="button"
                  style={{ right: '0.25rem' }}
                  x-on:click="
                    overrideUserFid = true
                    $nextTick(() => $refs.userFid.focus())
                  "
                >
                  {pencil2Icon}
                </button>

                <button
                  aria-label="Restore User FID"
                  x-show="user && overrideUserFid"
                  class="absolute text-xs bg-transparent text-gray-700 font-medium hover:bg-gray-100 p-1 rounded-sm"
                  type="button"
                  style={{ right: '0.25rem' }}
                  x-on:click="
                    userFid = user.userFid
                    overrideUserFid = false
                  "
                >
                  {resetIcon}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-0.5">
              <div
                class="text-xs text-gray-700 font-medium"
                style={{ paddingLeft: '0.25rem' }}
              >
                Cast
              </div>

              <div class="bg-background-200 border rounded-md divide-y">
                <input
                  aria-label="Cast FID"
                  autocomplete="off"
                  class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-t-md"
                  name="inputText"
                  type="text"
                  required
                  pattern="^[0-9]*$"
                  placeholder="FID"
                  x-model="castFid"
                />

                <input
                  aria-label="Cast Hash"
                  autocomplete="off"
                  class="bg-transparent px-3 py-2 text-sm leading-snug w-full text-xs rounded-b-md"
                  name="inputText"
                  type="text"
                  required
                  pattern="^0x[a-fA-F0-9]{40}$"
                  placeholder="Hash"
                  x-model="castHash"
                />
              </div>
            </div>

            <div class="flex gap-1.5 mt-1.5">
              <button
                class="bg-background-100 border rounded-md w-full text-xs font-medium py-1.5"
                type="button"
                x-on:click="close"
              >
                Cancel
              </button>
              <button
                class="bg-gray-200 hover:bg-gray-100 rounded-md w-full text-xs text-bg font-medium py-1.5"
                type="submit"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
