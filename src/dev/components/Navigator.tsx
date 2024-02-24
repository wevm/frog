import { AuthDialog } from './AuthDialog.js'
import {
  chevronLeftIcon,
  chevronRightIcon,
  externalLinkIcon,
  farcasterIcon,
  globeIcon,
  refreshIcon,
} from './icons.js'

export function Navigator() {
  return (
    <div class="items-center flex gap-2 w-full" style={{ height: '2rem' }}>
      <div class="flex border rounded-md h-full">
        <button
          aria-label="back"
          class="text-gray-700 bg-background-100 px-2 rounded-l-md"
          type="button"
          x-on:click={`
            const previousStackIndex = stackIndex - 1
            const previousStackId = stack[previousStackIndex]
            const previousData = dataMap[previousStackId]
            if (!previousData) return

            let json
            switch (previousData.type) {
              case 'initial': {
                json = await getFrame(previousData.url)
                break
              }
              case 'action': {
                json = await postFrameAction(previousData.body)
                break
              }
              case 'redirect': {
                json = await postFrameRedirect(previousData.body)
                break
              }
            }

            dataKey = json.id
            stackIndex = previousStackIndex
            inputText = ''
          `}
          {...{
            ':disabled': 'stackIndex === 0',
          }}
        >
          <span {...{ ':style': "stackIndex === 0 && { opacity: '0.35' }" }}>
            {chevronLeftIcon}
          </span>
        </button>
        <div class="bg-gray-alpha-300 h-full" style={{ width: '1px' }} />
        <button
          aria-label="forward"
          class="text-gray-700 bg-background-100 px-2 rounded-r-md"
          type="button"
          x-data="{ get disabled() { return !stack[stackIndex + 1] } }"
          x-on:click={`
            const nextStackIndex = stackIndex + 1
            const nextStackId = stack[nextStackIndex]
            const nextData = dataMap[nextStackId]
            if (!nextData) return

            let json
            switch (nextData.type) {
              case 'initial': {
                json = await getFrame(nextData.url)
                break
              }
              case 'action': {
                json = await postFrameAction(nextData.body)
                break
              }
              case 'redirect': {
                json = await postFrameRedirect(nextData.body)
                break
              }
            }

            dataKey = json.id
            stackIndex = nextStackIndex
            inputText = ''
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
          const nextStackId = logs[logIndex] ?? dataKey
          const nextData = dataMap[dataKey]
          if (!nextData) return

          let json
          switch (nextData?.type) {
            case 'initial': {
              json = await getFrame(nextData.url)
              break
            }
            case 'action': {
              json = await postFrameAction(nextData.body)
              break
            }
            case 'redirect': {
              json = await postFrameRedirect(nextData.body)
              break
            }
          }

          dataKey = json.id
          inputText = ''
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
              x-text="formatUrl(data.body ? data.body.url : data.url)"
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
          x-data="{ url: new URL(data.body ? data.body.url : data.url) }"
          {...{
            '@click.outside': 'open = false',
            '@keyup.escape': 'open = false',
            'x-trap': 'open',
          }}
        >
          <template x-for="(route, index) in routes">
            <button
              type="button"
              class="bg-transparent display-block font-sans text-sm whitespace-nowrap px-3 py-2 rounded-lg overflow-hidden text-ellipsis text-gray-900 w-full text-left"
              x-text="`${url.protocol}//${url.host}${route === '/' ? '' : route}`"
              x-on:click="
                const nextRoute = route === '/' ? '/dev' : route + '/dev'
                history.replaceState({}, '', nextRoute)

                const nextFrame = window.location.toString().replace('/dev', '')
                getFrame(nextFrame, true)
                  .then((json) => {
                    const id = json.id
                    dataKey = id

                    stack = [id]
                    stackIndex = 0

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
        <div class="relative grid h-full" x-data="{ open: false }">
          <button
            aria-label="open user menu"
            type="button"
            class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
            x-on:click="open = true"
          >
            <div style={{ height: '30px', width: '30px' }} x-show="!user.pfp">
              {farcasterIcon}
            </div>
            <img
              style={{ height: '32px', width: '32px' }}
              x-show="user.pfp"
              {...{ ':src': 'user.pfp' }}
            />
          </button>

          <div
            x-show="open"
            class="border bg-background-100 rounded-xl w-full overflow-hidden"
            style={{
              position: 'absolute',
              marginTop: '4px',
              top: '100%',
              right: '0',
              width: '225px',
              zIndex: '10',
            }}
            {...{
              '@click.outside': 'open = false',
              '@keyup.escape': 'open = false',
              'x-trap': 'open',
            }}
          >
            <div class="text-sm p-4">
              <div
                x-show="user.username"
                x-text="user.displayName ?? user.username"
              />
              <div class="text-gray-700" x-text="`FID #${user.userFid}`" />
            </div>

            <div class="px-4">
              <div class="border-t w-full" />
            </div>

            <div class="py-2">
              <a
                type="button"
                class="bg-transparent flex items-center justify-between font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
                style={{ textDecoration: 'none' }}
                target="_blank"
                rel="noopener noreferrer"
                {...{
                  ':href': '`https://warpcast.com/${user.username}`',
                }}
              >
                <span>Warpcast Profile</span>
                <div style={{ marginTop: '1px' }}> {externalLinkIcon}</div>
              </a>

              <button
                type="button"
                class="bg-transparent display-block font-sans text-sm px-4 py-2 text-gray-700 w-full text-left hover:bg-gray-100"
                x-on:click="logout()"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
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
