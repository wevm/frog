import {
  chevronLeftIcon,
  chevronRightIcon,
  farcasterIcon,
  globeIcon,
  refreshIcon,
} from './icons.js'
import { AuthDialog } from './AuthDialog.js'

export function Navigator() {
  return (
    <div class="items-center flex gap-2 w-full" style={{ height: '2rem' }}>
      <div class="flex border rounded-md h-full">
        <button
          aria-label="back"
          class="text-gray-700 bg-background-100 px-2 rounded-l-md"
          type="button"
          x-on:click={`
            const nextId = id - 1
            if (nextId < 0)
              return getFrame()
                .then((json) => {
                  data = json
                  id = -1
                  inputText = ''
                })
                .catch(console.error)

            const body = history[nextId].body
            postFrameAction(body)
              .then((json) => {
                data = json
                id = nextId
                inputText = ''
              })
              .catch(console.error)
          `}
          {...{
            ':disabled': 'id === -1',
          }}
        >
          <span {...{ ':style': "id === -1 && { opacity: '0.35' }" }}>
            {chevronLeftIcon}
          </span>
        </button>
        <div class="bg-gray-alpha-300 h-full" style={{ width: '1px' }} />
        <button
          aria-label="forward"
          class="text-gray-700 bg-background-100 px-2 rounded-r-md"
          type="button"
          x-data="{ get disabled() { return !history[id + 1] } }"
          x-on:click={`
            let nextId = id + 1
            if (!history[nextId]) return

            const body = history[nextId].body
            postFrameAction(body)
              .then((json) => {
                data = json
                id = nextId
                inputText = ''
              })
              .catch(console.error)
          `}
          {...{
            ':disabled': 'disabled',
          }}
        >
          <span {...{ ':style': "disabled && { opacity: '0.35' }" }}>
            {chevronRightIcon}
          </span>
        </button>
      </div>

      <button
        aria-label="refresh"
        class="bg-background-100 border rounded-md text-gray-700 px-2 rounded-r-md h-full"
        type="button"
        x-on:click={`
          const selectedLog = logs[selectedLogIndex]
          const body = selectedLog ? selectedLog.request.body : history[id]?.body
          if (selectedLog && selectedLog.request.type === 'initial') getFrame().then((json) => data = json).catch(console.error)
          else if (body) postFrameAction(body).then((json) => data = json).catch(console.error)
          else getFrame().then((json) => data = json).catch(console.error)
        `}
      >
        {refreshIcon}
      </button>

      <div
        class="relative grid h-full"
        x-data="{ open: false }"
        style={{ flex: '1' }}
      >
        <button
          type="button"
          class="bg-background-100 border rounded-md w-full h-full relative overflow-hidden"
          style={{
            paddingLeft: '1.75rem',
            paddingRight: '1.75rem',
          }}
          x-on:click="open = true"
        >
          <div
            class="flex items-center h-full text-gray-700"
            style={{ left: '0.5rem', position: 'absolute' }}
          >
            {globeIcon}
          </div>
          <div class="overflow-hidden whitespace-nowrap text-ellipsis h-full">
            <span
              class="font-sans text-gray-1000"
              style={{ lineHeight: '1.9rem', fontSize: '13px' }}
              x-text="formatUrl(data.state.context.url)"
            />
          </div>
        </button>

        <div
          x-show="open"
          class="border bg-background-100 rounded-lg w-full overflow-hidden py-1"
          style={{
            position: 'absolute',
            marginTop: '4px',
            top: '100%',
            zIndex: '10',
          }}
          x-data="{ url: new URL(data.request.url) }"
          {...{
            '@click.outside': 'open = false',
            '@keyup.escape': 'open = false',
            'x-trap': 'open',
          }}
        >
          <template x-for="(route, index) in data.routes">
            <button
              type="button"
              class="bg-transparent display-block font-sans text-sm whitespace-nowrap px-3 py-2 rounded-lg overflow-hidden text-ellipsis text-gray-900 w-full text-left"
              style={{ textDecoration: 'none' }}
              x-text="`${url.protocol}//${url.host}${route === '/' ? '' : route}`"
              x-on:click="
                const nextRoute = route === '/' ? '/dev' : route + '/dev'
                window.history.pushState({}, '', nextRoute)
                const nextFrame = window.location.toString().replace('/dev', '')
                getFrame(nextFrame, true)
                  .then((json) => {
                    data = json
                    history = []
                    id = -1
                    inputText = ''
                    open = false
                  })
                  .catch(console.error)
              "
            />
          </template>
        </div>
      </div>

      <template x-if="user">
        {/* TODO: Dropdown to log out and view connected account info */}
        <button
          type="button"
          class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
          x-on:click="logout()"
        >
          <img
            {...{ ':src': 'user.pfp' }}
            style={{ height: '30px', width: '30px' }}
          />
        </button>
      </template>

      <template x-if="!user">
        <div style={{ display: 'contents' }} x-data="{ open: false }">
          <button
            type="button"
            class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
            x-on:click="open = true"
          >
            <div style={{ height: '30px', width: '30px' }}>{farcasterIcon}</div>
          </button>
          <AuthDialog />
        </div>
      </template>
    </div>
  )
}
