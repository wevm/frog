import {
  chevronLeftIcon,
  chevronRightIcon,
  externalLinkIcon,
  farcasterIcon,
  fileTextIcon,
  globeIcon,
  imageIcon,
  warpIcon,
  refreshIcon,
  stopwatchIcon,
} from './icons.js'
import { type Frame as FrameType } from './types.js'
import { type State } from './utils.js'

export type PreviewProps = {
  baseUrl: string
  contextHtml: string
  frame: FrameType
  log:
    | {
        type: 'initial'
        method: 'get'
        metrics: {
          htmlSize: number
          imageSize: number
          speed: number
        }
        response: {
          success: boolean
          status: number
          statusText: string
        }
        timestamp: number
        url: string
      }
    | {
        type: 'response'
        method: 'post'
        body: object
        metrics: {
          htmlSize: number
          imageSize: number
          speed: number
        }
        response: {
          success: boolean
          status: number
          statusText: string
        }
        timestamp: number
        url: string
      }
    | {
        type: 'redirect'
        method: 'post'
        body: object
        metrics: {
          speed: number
        }
        response: {
          success: boolean
          status: number
          statusText: string
          location: string
        }
        timestamp: number
        url: string
      }
  routes: readonly string[]
  state: State
}

export function Preview(props: PreviewProps) {
  const { baseUrl, contextHtml, frame, log, routes, state } = props
  return (
    <div
      x-data={`{
        data: {
          baseUrl: '${baseUrl}',
          contextHtml: ${JSON.stringify(contextHtml)},
          frame: ${JSON.stringify(frame)},
          log: ${JSON.stringify(log)},
          routes: ${JSON.stringify(routes)},
          state: ${JSON.stringify(state)},
        },
        history: [],
        id: -1,
        inputText: '',
        logs: [${JSON.stringify(log)}],
        get baseUrl() { return this.data.baseUrl },
        get frame() { return this.data.frame },
        get log() { return this.data.log },

        get contextHtml() { return this.data.contextHtml },
        get routes() { return this.data.routes },
        get state() { return this.data.state },
        get buttonCount() { return this.frame.buttons?.length ?? 0 },
        get hasIntents() { return Boolean(this.frame.input || this.frame.buttons.length) },

        async getFrame() {
          const response = await fetch(this.baseUrl + '/dev/frame', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const json = await response.json()
          this.logs = [...this.logs, json.log]
          return json
        },
        async postFrameAction(body) {
          const response = await fetch(this.baseUrl + '/dev/frame/action', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const json = await response.json()
          this.logs = [...this.logs, json.log]
          return json
        },
        async postFrameRedirect(body) {
          const response = await fetch(this.baseUrl + '/dev/frame/redirect', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const json = await response.json()
          this.logs = [...this.logs, json]
          return json
        },

        formatFileSize(sizeInBytes) {
          if (sizeInBytes < 1024) return sizeInBytes + 'b'
          if (sizeInBytes < 1024 * 1024) return (sizeInBytes / 1024).toFixed(2) + 'kb'
          return (sizeInBytes / (1024 * 1024)).toFixed(2) + 'mb'
        },
        formatSpeed(speed) {
          if (speed < 1000) return (Math.round((speed + Number.EPSILON) * 100) / 100).toFixed(2) + 'ms'
          if (speed % 1 === 0) return (speed / 100) + 's'
          return (speed / 1000).toFixed(2) + 's'
        },
        formatTime(time) {
          return new Date(time).toLocaleTimeString()
        },
        formatUrl(url) {
          let urlObj = new URL(url)
          urlObj.search = ''
          const urlString = urlObj.toString().replace(/https?:\\/\\//, '')
          return urlString.endsWith('/') ? urlString.slice(0, -1) : urlString
        }
      }`}
      class="flex w-full h-full"
      style={{
        paddingLeft: '1.5rem',
        gap: '1.5rem',
        maxWidth: '1512px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div
        class="bg-background-200 border rounded-md overflow-hidden h-full"
        style={{
          marginTop: '1.5rem',
          maxHeight: '554px',
          minWidth: '350px',
        }}
      >
        <div class="bg-background-100 scrollbars h-full">
          <Timeline />
        </div>
      </div>

      <div
        class="flex flex-col scrollbars h-full w-full gap-4"
        style={{
          paddingTop: '1.5rem',
          paddingBottom: '1.5rem',
          paddingRight: '1.5rem',
        }}
      >
        <Navigator />

        <div class="flex flex-row gap-4">
          <div class="flex flex-col gap-4">
            <Metrics />
            <div style={{ minWidth: '532.5px', minHeight: '411px' }}>
              <Frame />
            </div>
          </div>
          <Data />
        </div>

        <div>
          <div class="border rounded-md bg-background-100 h-full overflow-hidden">
            <div
              class="bg-background-200 border flex flex-row gap-6 text-sm px-4"
              style={{ borderLeft: '0', borderRight: '0', borderTop: '0' }}
            >
              <button type="button" class="bg-transparent py-3 text-gray-700">
                Request/Response
              </button>
              <button
                type="button"
                class="bg-transparent py-3 border-gray-1000"
                style={{
                  borderBottomWidth: '2px',
                  marginBottom: '-1px',
                }}
              >
                Context
              </button>
              <button type="button" class="bg-transparent py-3 text-gray-700">
                Meta Tags
              </button>
            </div>

            <div class="p-4 text-sm" x-html="contextHtml" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Navigator() {
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
        <div class="bg-gray-alpha-400 h-full" style={{ width: '1px' }} />
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
          const body = history[id]?.body
          if (body) postFrameAction(body).then((json) => data = json).catch(console.error)
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
              class="font-sans text-sm text-gray-1000"
              style={{ lineHeight: '1.85rem' }}
              x-text="formatUrl(state.context.url)"
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
          x-data="{ url: new URL(baseUrl) }"
          {...{
            '@click.outside': 'open = false',
            '@keyup.escape': 'open = false',
            'x-trap': 'open',
          }}
        >
          <template x-for="(route, index) in routes">
            <a
              class="display-block font-sans text-sm whitespace-nowrap px-3 py-2 rounded-lg overflow-hidden text-ellipsis text-gray-900"
              x-text="`${url.protocol}//${url.host}${route === '/' ? '' : route}`"
              style={{ textDecoration: 'none' }}
              {...{
                ':href': `route === '/' ? '/dev' : route + '/dev'`,
              }}
            />
          </template>
        </div>
      </div>

      <button
        type="button"
        class="bg-background-100 rounded-md border overflow-hidden text-gray-700"
      >
        {farcasterIcon}
      </button>
    </div>
  )
}

function Frame() {
  return (
    <div class="w-full h-full">
      <div class="relative rounded-md relative w-full">
        <Img />

        <template x-if="hasIntents">
          <div class="bg-background-100 flex flex-col px-4 py-2 gap-2 rounded-bl-md rounded-br-md border-t-0 border">
            <template x-if="frame.input">
              <Input />
            </template>

            <template x-if="Boolean(frame.buttons.length)">
              <div
                class="grid gap-2.5"
                {...{
                  ':class': `{
                    'grid-cols-1': buttonCount === 1,
                    'grid-cols-2': buttonCount === 2,
                    'grid-cols-3': buttonCount === 3,
                    'grid-cols-4': buttonCount === 4,
                  }`,
                }}
              >
                <template x-for="button in frame.buttons">
                  <Button />
                </template>
              </div>
            </template>
          </div>
        </template>
      </div>

      <div class="text-xs mt-1 text-right">
        <a
          class="text-gray-700 font-medium"
          {...{ ':href': 'baseUrl' }}
          x-text="new URL(baseUrl).host"
        />
      </div>
    </div>
  )
}

function Img() {
  return (
    <img
      class="border object-cover w-full rounded-t-lg"
      style={{
        minHeight: '269px',
        maxHeight: '532.5px',
      }}
      {...{
        ':alt': `frame.title ?? 'Farcaster frame'`,
        ':class': `{
          'rounded-lg': !hasIntents,
        }`,
        ':src': 'frame.imageUrl',
        ':style': `{
          aspectRatio: frame.imageAspectRatio.replace(':', '/'),
        }`,
      }}
    />
  )
}

function Input() {
  return (
    <input
      autocomplete="off"
      class="bg-background-200 rounded-md border px-3 py-2.5 text-sm leading-snug w-full"
      name="inputText"
      type="text"
      x-model="inputText"
      {...{
        ':aria-label': 'frame.input.text',
        ':placeholder': 'frame.input.text',
      }}
    />
  )
}

function Button() {
  const buttonClass =
    'bg-gray-200 border-gray-300 flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4 w-full'
  const innerHtml = (
    <span
      class="whitespace-nowrap overflow-hidden text-ellipsis text-gray-1000 font-medium"
      x-text="title"
    />
  )
  const leavingAppPrompt = (
    <div
      x-show="open"
      class="flex flex-col gap-1.5 border bg-background-100 p-4 rounded-lg text-center"
      style={{
        position: 'absolute',
        marginTop: '4px',
        width: '20rem',
        zIndex: '10',
      }}
      {...{
        '@click.outside': 'open = false',
        '@keyup.escape': 'open = false',
        'x-trap': 'open',
      }}
    >
      <h1 class="font-semibold text-base text-gray-1000">Leaving Warpcast</h1>
      <div class="line-clamp-2 text-gray-700 text-sm font-mono" x-text="url" />
      <p class="text-sm leading-snug text-gray-900">
        If you connect your wallet and the site is malicious, you may lose
        funds.
      </p>
      <div class="flex gap-1.5 mt-1.5">
        <button
          class="bg-background-100 border rounded-md w-full text-sm font-medium py-2"
          type="button"
          x-on:click="open = false"
        >
          Cancel
        </button>
        <button
          class="bg-red-400 rounded-md w-full text-sm text-bg font-medium py-2"
          target="_blank"
          type="button"
          x-on:click={`open = false; window.open(url, '_blank');`}
        >
          Continue
        </button>
      </div>
    </div>
  )

  return (
    <div
      class="relative"
      x-data={`{
        ...button,
        open: false,
        target: button.target,
        url: button.type === 'link' && button.target ? button.target : undefined,
      }`}
    >
      <template x-if="type === 'link'">
        <div>
          <button class={buttonClass} type="button" x-on:click="open = true">
            {innerHtml}
            <div class="text-gray-900" style={{ marginTop: '2px' }}>
              {externalLinkIcon}
            </div>
          </button>

          {leavingAppPrompt}
        </div>
      </template>

      <template x-if="type === 'post_redirect'">
        <div>
          <button
            class={buttonClass}
            type="button"
            x-on:click={`
              if (open) return
              const body = {
                buttonIndex: index,
                inputText,
                postUrl: target ?? frame.postUrl,
              }
              postFrameRedirect(body)
                .then((json) => {
                  // TODO: show error
                  if (json.response.status !== 302) return
                  url = json.response.location
                  open = true
                })
                .catch(console.error)
          `}
          >
            {innerHtml}
            <div class="text-gray-900" style={{ marginTop: '2px' }}>
              {externalLinkIcon}
            </div>
          </button>

          {leavingAppPrompt}
        </div>
      </template>

      <template x-if="type === 'mint'">
        <button class={buttonClass} type="button">
          <div>{warpIcon}</div>
          {innerHtml}
        </button>
      </template>

      <template x-if="type === 'post'">
        <button
          class={buttonClass}
          type="button"
          x-on:click={`
            const body = {
              buttonIndex: index,
              inputText,
              postUrl: target ?? frame.postUrl,
            }
            postFrameAction(body)
              .then((json) => {
                const nextId = id + 1
                const item = { body, url: json.state.context.url }
                if (nextId < history.length) history = [...history.slice(0, nextId), item]
                else history = [...history, item]
                data = json
                id = nextId
                inputText = ''
              })
              .catch(console.error)
          `}
        >
          {innerHtml}
        </button>
      </template>
    </div>
  )
}

function Data() {
  return (
    <div
      class="bg-background-100 border rounded-md overflow-hidden"
      style={{ height: 'min-content' }}
      x-data="{
        rows: [
          { property: 'fc:frame', value: frame.version },
          { property: 'fc:frame:image', value: frame.imageUrl },
          { property: 'fc:frame:aspect_ratio', value: frame.imageAspectRatio },
          { property: 'fc:frame:post_url', value: frame.postUrl },
          { property: 'og:image', value: frame.image || 'Not Provided' },
          { property: 'og:title', value: frame.title || 'Not Provided' },
          ...(frame.input?.text ? [{ property: 'fc:frame:input:text', value: frame.input.text }] : []),
          ...(frame.buttons.map(button => ({
            property: `fc:frame:button:${button.index}`,
            value: `
              <span>${button.title}</span>${button.type ? ` <span>${button.type}</span>` : ''}${button.target ? ` <span>${button.target}</span>` : ''}
            `
          }))),
        ]
      }"
    >
      <template x-for="(row, index) in rows">
        <div
          class="flex flex-row"
          {...{
            ':style':
              'index !== rows.length - 1 && { borderBottomWidth: `1px` }',
          }}
        >
          <div
            class="text-sm text-gray-700 p-3 font-medium"
            x-text="row.property"
            style={{ minWidth: '12rem' }}
          />
          <div
            class="text-sm text-gray-1000 p-3 text-ellipsis overflow-hidden whitespace-nowrap"
            x-html="row.value"
          />
        </div>
      </template>

      {/* TODO: Add property errors */}
      {/* <div> */}
      {/*   <div x-text="JSON.stringify(frame.debug)" /> */}
      {/* </div> */}
    </div>
  )
}

function Metrics() {
  return (
    <div
      class="bg-background-100 border rounded-md flex flex-row gap-2 divide-x"
      style={{ justifyContent: 'space-around' }}
    >
      <div
        class="items-center flex font-mono gap-1.5 text-base justify-center"
        style={{ flex: '1', padding: '0.65rem' }}
      >
        <span class="text-gray-700">{stopwatchIcon}</span>
        <div class="text-gray-1000" x-text="formatSpeed(log.metrics.speed)" />
      </div>

      <div
        class="items-center flex font-mono gap-1.5 text-base justify-center"
        style={{ flex: '1', padding: '0.65rem' }}
      >
        <span class="text-gray-700">{fileTextIcon}</span>
        <div
          class="text-gray-1000"
          x-text="formatFileSize(log.metrics.htmlSize)"
        />
      </div>

      <div
        class="items-center flex font-mono gap-1.5 text-base justify-center"
        style={{ flex: '1', padding: '0.65rem' }}
      >
        <span class="text-gray-700">{imageIcon}</span>
        <div
          class="text-gray-1000"
          x-text="formatFileSize(log.metrics.imageSize)"
        />
      </div>
    </div>
  )
}

function Timeline() {
  return (
    <div
      class="w-full flex"
      style={{
        flexDirection: 'column-reverse',
        justifyContent: 'flex-end',
      }}
    >
      <template x-for="(log, index) in logs">
        <button
          type="button"
          class="bg-transparent flex flex-col p-4 gap-2 w-full"
          {...{
            ':style':
              '(index !== 0 || logs.length < 7) && { borderBottomWidth: `1px` }',
          }}
        >
          <div
            class="flex flex-row"
            style={{ justifyContent: 'space-between' }}
          >
            <div class="flex gap-1.5 font-mono text-gray-700 text-xs items-center">
              <div
                class="flex items-center border px-1.5 rounded-sm text-gray-900"
                x-text="log.method"
                style={{ textTransform: 'uppercase' }}
              />
              <div
                class="flex items-center border px-1.5 rounded-sm"
                x-text="log.response.status"
                style={{ textTransform: 'uppercase' }}
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
            <span
              class="font-mono text-gray-700 text-xs"
              x-text="formatTime(log.timestamp)"
            />
          </div>

          <div class="flex gap-1.5 font-mono text-gray-1000 text-xs">
            <span x-text="`${formatUrl(log.url)}`" />
          </div>
        </button>
      </template>
    </div>
  )
}

export function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://rsms.me/" />
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    </>
  )
}

export function Styles() {
  const colors = `
    :root {
      --gray-100-value:0,0%,10%;
      --gray-200-value:0,0%,12%;
      --gray-300-value:0,0%,16%;
      --gray-400-value:0,0%,18%;
      --gray-500-value:0,0%,27%;
      --gray-600-value:0,0%,53%;
      --gray-700-value:0,0%,56%;
      --gray-800-value:0,0%,49%;
      --gray-900-value:0,0%,63%;
      --gray-1000-value:0,0%,93%;
      --blue-100-value:216,50%,12%;
      --blue-200-value:214,59%,15%;
      --blue-300-value:213,71%,20%;
      --blue-400-value:212,78%,23%;
      --blue-500-value:211,86%,27%;
      --blue-600-value:206,100%,50%;
      --blue-700-value:212,100%,48%;
      --blue-800-value:212,100%,41%;
      --blue-900-value:210,100%,66%;
      --blue-1000-value:206,100%,96%;
      --red-100-value:357,37%,12%;
      --red-200-value:357,46%,16%;
      --red-300-value:356,54%,22%;
      --red-400-value:357,55%,26%;
      --red-500-value:357,60%,32%;
      --red-600-value:358,75%,59%;
      --red-700-value:358,75%,59%;
      --red-800-value:358,69%,52%;
      --red-900-value:358,100%,69%;
      --red-1000-value:353,90%,96%;
      --amber-100-value:35,100%,8%;
      --amber-200-value:32,100%,10%;
      --amber-300-value:33,100%,15%;
      --amber-400-value:35,100%,17%;
      --amber-500-value:35,91%,22%;
      --amber-600-value:39,85%,49%;
      --amber-700-value:39,100%,57%;
      --amber-800-value:35,100%,52%;
      --amber-900-value:35,100%,52%;
      --amber-1000-value:40,94%,93%;
      --green-100-value:136,50%,9%;
      --green-200-value:137,50%,12%;
      --green-300-value:136,50%,14%;
      --green-400-value:135,70%,16%;
      --green-500-value:135,70%,23%;
      --green-600-value:135,70%,34%;
      --green-700-value:131,41%,46%;
      --green-800-value:132,43%,39%;
      --green-900-value:131,43%,57%;
      --green-1000-value:136,73%,94%;
      --teal-100-value:169,78%,7%;
      --teal-200-value:170,74%,9%;
      --teal-300-value:171,75%,13%;
      --teal-400-value:171,85%,13%;
      --teal-500-value:172,85%,20%;
      --teal-600-value:172,85%,32%;
      --teal-700-value:173,80%,36%;
      --teal-800-value:173,83%,30%;
      --teal-900-value:174,90%,41%;
      --teal-1000-value:166,71%,93%;
      --purple-100-value:283,30%,12%;
      --purple-200-value:281,38%,16%;
      --purple-300-value:279,44%,23%;
      --purple-400-value:277,46%,28%;
      --purple-500-value:274,49%,35%;
      --purple-600-value:272,51%,54%;
      --purple-700-value:272,51%,54%;
      --purple-800-value:272,47%,45%;
      --purple-900-value:275,80%,71%;
      --purple-1000-value:281,73%,96%;
      --pink-100-value:335,32%,12%;
      --pink-200-value:335,43%,16%;
      --pink-300-value:335,47%,21%;
      --pink-400-value:335,51%,22%;
      --pink-500-value:335,57%,27%;
      --pink-600-value:336,75%,40%;
      --pink-700-value:336,80%,58%;
      --pink-800-value:336,74%,51%;
      --pink-900-value:341,90%,67%;
      --pink-1000-value:333,90%,96%;
      --gray-alpha-100:hsla(0,0%,100%,.06);
      --gray-alpha-200:hsla(0,0%,100%,.09);
      --gray-alpha-300:hsla(0,0%,100%,.13);
      --gray-alpha-400:hsla(0,0%,100%,.14);
      --gray-alpha-500:hsla(0,0%,100%,.24);
      --gray-alpha-600:hsla(0,0%,100%,.51);
      --gray-alpha-700:hsla(0,0%,100%,.54);
      --gray-alpha-800:hsla(0,0%,100%,.47);
      --gray-alpha-900:hsla(0,0%,100%,.61);
      --gray-alpha-1000:hsla(0,0%,100%,.92);
      --background-100:#0a0a0a;
      --background-200:#000;
      --focus-border:0 0 0 1px var(--gray-alpha-300),0px 0px 0px 2px hsla(var(--blue-900-value),0.75);
      --focus-color:var(--blue-900)

      --gray-100:hsla(var(--gray-100-value),1);
      --gray-200:hsla(var(--gray-200-value),1);
      --gray-300:hsla(var(--gray-300-value),1);
      --gray-400:hsla(var(--gray-400-value),1);
      --gray-500:hsla(var(--gray-500-value),1);
      --gray-600:hsla(var(--gray-600-value),1);
      --gray-700:hsla(var(--gray-700-value),1);
      --gray-800:hsla(var(--gray-800-value),1);
      --gray-900:hsla(var(--gray-900-value),1);
      --gray-1000:hsla(var(--gray-1000-value),1);
      --blue-100:hsla(var(--blue-100-value),1);
      --blue-200:hsla(var(--blue-200-value),1);
      --blue-300:hsla(var(--blue-300-value),1);
      --blue-400:hsla(var(--blue-400-value),1);
      --blue-500:hsla(var(--blue-500-value),1);
      --blue-600:hsla(var(--blue-600-value),1);
      --blue-700:hsla(var(--blue-700-value),1);
      --blue-800:hsla(var(--blue-800-value),1);
      --blue-900:hsla(var(--blue-900-value),1);
      --blue-1000:hsla(var(--blue-1000-value),1);
      --amber-100:hsla(var(--amber-100-value),1);
      --amber-200:hsla(var(--amber-200-value),1);
      --amber-300:hsla(var(--amber-300-value),1);
      --amber-400:hsla(var(--amber-400-value),1);
      --amber-500:hsla(var(--amber-500-value),1);
      --amber-600:hsla(var(--amber-600-value),1);
      --amber-700:hsla(var(--amber-700-value),1);
      --amber-800:hsla(var(--amber-800-value),1);
      --amber-900:hsla(var(--amber-900-value),1);
      --amber-1000:hsla(var(--amber-1000-value),1);
      --red-100:hsla(var(--red-100-value),1);
      --red-200:hsla(var(--red-200-value),1);
      --red-300:hsla(var(--red-300-value),1);
      --red-400:hsla(var(--red-400-value),1);
      --red-500:hsla(var(--red-500-value),1);
      --red-600:hsla(var(--red-600-value),1);
      --red-700:hsla(var(--red-700-value),1);
      --red-800:hsla(var(--red-800-value),1);
      --red-900:hsla(var(--red-900-value),1);
      --red-1000:hsla(var(--red-1000-value),1);
      --green-100:hsla(var(--green-100-value),1);
      --green-200:hsla(var(--green-200-value),1);
      --green-300:hsla(var(--green-300-value),1);
      --green-400:hsla(var(--green-400-value),1);
      --green-500:hsla(var(--green-500-value),1);
      --green-600:hsla(var(--green-600-value),1);
      --green-700:hsla(var(--green-700-value),1);
      --green-800:hsla(var(--green-800-value),1);
      --green-900:hsla(var(--green-900-value),1);
      --green-1000:hsla(var(--green-1000-value),1);
      --teal-100:hsla(var(--teal-100-value),1);
      --teal-200:hsla(var(--teal-200-value),1);
      --teal-300:hsla(var(--teal-300-value),1);
      --teal-400:hsla(var(--teal-400-value),1);
      --teal-500:hsla(var(--teal-500-value),1);
      --teal-600:hsla(var(--teal-600-value),1);
      --teal-700:hsla(var(--teal-700-value),1);
      --teal-800:hsla(var(--teal-800-value),1);
      --teal-900:hsla(var(--teal-900-value),1);
      --teal-1000:hsla(var(--teal-1000-value),1);
      --purple-100:hsla(var(--purple-100-value),1);
      --purple-200:hsla(var(--purple-200-value),1);
      --purple-300:hsla(var(--purple-300-value),1);
      --purple-400:hsla(var(--purple-400-value),1);
      --purple-500:hsla(var(--purple-500-value),1);
      --purple-600:hsla(var(--purple-600-value),1);
      --purple-700:hsla(var(--purple-700-value),1);
      --purple-800:hsla(var(--purple-800-value),1);
      --purple-900:hsla(var(--purple-900-value),1);
      --purple-1000:hsla(var(--purple-1000-value),1);
      --pink-100:hsla(var(--pink-100-value),1);
      --pink-200:hsla(var(--pink-200-value),1);
      --pink-300:hsla(var(--pink-300-value),1);
      --pink-400:hsla(var(--pink-400-value),1);
      --pink-500:hsla(var(--pink-500-value),1);
      --pink-600:hsla(var(--pink-600-value),1);
      --pink-700:hsla(var(--pink-700-value),1);
      --pink-800:hsla(var(--pink-800-value),1);
      --pink-900:hsla(var(--pink-900-value),1);
      --pink-1000:hsla(var(--pink-1000-value),1)
    }

    @media (prefers-color-scheme: light) {
      :root {
        --gray-100-value:0,0%,95%;
        --gray-200-value:0,0%,92%;
        --gray-300-value:0,0%,90%;
        --gray-400-value:0,0%,92%;
        --gray-500-value:0,0%,79%;
        --gray-600-value:0,0%,66%;
        --gray-700-value:0,0%,56%;
        --gray-800-value:0,0%,49%;
        --gray-900-value:0,0%,40%;
        --gray-1000-value:0,0%,9%;
        --blue-100-value:212,100%,97%;
        --blue-200-value:210,100%,96%;
        --blue-300-value:210,100%,94%;
        --blue-400-value:209,100%,90%;
        --blue-500-value:209,100%,80%;
        --blue-600-value:208,100%,66%;
        --blue-700-value:212,100%,48%;
        --blue-800-value:212,100%,41%;
        --blue-900-value:211,100%,42%;
        --blue-1000-value:211,100%,15%;
        --red-100-value:0,100%,97%;
        --red-200-value:0,100%,96%;
        --red-300-value:0,100%,95%;
        --red-400-value:0,90%,92%;
        --red-500-value:0,82%,85%;
        --red-600-value:359,90%,71%;
        --red-700-value:358,75%,59%;
        --red-800-value:358,70%,52%;
        --red-900-value:358,66%,48%;
        --red-1000-value:355,49%,15%;
        --amber-100-value:39,100%,95%;
        --amber-200-value:44,100%,92%;
        --amber-300-value:43,96%,90%;
        --amber-400-value:42,100%,78%;
        --amber-500-value:38,100%,71%;
        --amber-600-value:36,90%,62%;
        --amber-700-value:39,100%,57%;
        --amber-800-value:35,100%,52%;
        --amber-900-value:30,100%,32%;
        --amber-1000-value:20,79%,17%;
        --green-100-value:120,60%,96%;
        --green-200-value:120,60%,95%;
        --green-300-value:120,60%,91%;
        --green-400-value:122,60%,86%;
        --green-500-value:124,60%,75%;
        --green-600-value:125,60%,64%;
        --green-700-value:131,41%,46%;
        --green-800-value:132,43%,39%;
        --green-900-value:133,50%,32%;
        --green-1000-value:128,29%,15%;
        --teal-100-value:169,70%,96%;
        --teal-200-value:167,70%,94%;
        --teal-300-value:168,70%,90%;
        --teal-400-value:170,70%,85%;
        --teal-500-value:170,70%,72%;
        --teal-600-value:170,70%,57%;
        --teal-700-value:173,80%,36%;
        --teal-800-value:173,83%,30%;
        --teal-900-value:174,91%,25%;
        --teal-1000-value:171,80%,13%;
        --purple-100-value:276,100%,97%;
        --purple-200-value:277,87%,97%;
        --purple-300-value:274,78%,95%;
        --purple-400-value:276,71%,92%;
        --purple-500-value:274,70%,82%;
        --purple-600-value:273,72%,73%;
        --purple-700-value:272,51%,54%;
        --purple-800-value:272,47%,45%;
        --purple-900-value:274,71%,43%;
        --purple-1000-value:276,100%,15%;
        --pink-100-value:330,100%,96%;
        --pink-200-value:340,90%,96%;
        --pink-300-value:340,82%,94%;
        --pink-400-value:341,76%,91%;
        --pink-500-value:340,75%,84%;
        --pink-600-value:341,75%,73%;
        --pink-700-value:336,80%,58%;
        --pink-800-value:336,74%,51%;
        --pink-900-value:336,65%,45%;
        --pink-1000-value:333,74%,15%;
        --gray-alpha-100:rgba(0,0,0,.05);
        --gray-alpha-200:rgba(0,0,0,.08);
        --gray-alpha-300:rgba(0,0,0,.1);
        --gray-alpha-400:rgba(0,0,0,.08);
        --gray-alpha-500:rgba(0,0,0,.21);
        --gray-alpha-600:rgba(0,0,0,.34);
        --gray-alpha-700:rgba(0,0,0,.44);
        --gray-alpha-800:rgba(0,0,0,.51);
        --gray-alpha-900:rgba(0,0,0,.61);
        --gray-alpha-1000:rgba(0,0,0,.91);
        --background-100:#fff;
        --background-200:#fafafa;
        --focus-border:0 0 0 1px var(--gray-alpha-600),0px 0px 0px 2px hsla(var(--blue-700-value),0.75);
        --focus-color:var(--blue-700);
      }
    }

    .bg-gray-100 { background-color: var(--gray-100); }
    .bg-gray-200 { background-color: var(--gray-200); }
    .bg-gray-300 { background-color: var(--gray-300); }
    .bg-gray-400 { background-color: var(--gray-400); }
    .bg-gray-500 { background-color: var(--gray-500); }
    .bg-gray-600 { background-color: var(--gray-600); }
    .bg-gray-700 { background-color: var(--gray-700); }
    .bg-gray-800 { background-color: var(--gray-800); }
    .bg-gray-900 { background-color: var(--gray-900); }
    .bg-gray-1000 { background-color: var(--gray-1000); }
    .bg-blue-100 { background-color: var(--blue-100); }
    .bg-blue-200 { background-color: var(--blue-200); }
    .bg-blue-300 { background-color: var(--blue-300); }
    .bg-blue-400 { background-color: var(--blue-400); }
    .bg-blue-500 { background-color: var(--blue-500); }
    .bg-blue-600 { background-color: var(--blue-600); }
    .bg-blue-700 { background-color: var(--blue-700); }
    .bg-blue-800 { background-color: var(--blue-800); }
    .bg-blue-900 { background-color: var(--blue-900); }
    .bg-blue-1000 { background-color: var(--blue-1000); }
    .bg-amber-100 { background-color: var(--amber-100); }
    .bg-amber-200 { background-color: var(--amber-200); }
    .bg-amber-300 { background-color: var(--amber-300); }
    .bg-amber-400 { background-color: var(--amber-400); }
    .bg-amber-500 { background-color: var(--amber-500); }
    .bg-amber-600 { background-color: var(--amber-600); }
    .bg-amber-700 { background-color: var(--amber-700); }
    .bg-amber-800 { background-color: var(--amber-800); }
    .bg-amber-900 { background-color: var(--amber-900); }
    .bg-amber-1000 { background-color: var(--amber-1000); }
    .bg-red-100 { background-color: var(--red-100); }
    .bg-red-200 { background-color: var(--red-200); }
    .bg-red-300 { background-color: var(--red-300); }
    .bg-red-400 { background-color: var(--red-400); }
    .bg-red-500 { background-color: var(--red-500); }
    .bg-red-600 { background-color: var(--red-600); }
    .bg-red-700 { background-color: var(--red-700); }
    .bg-red-800 { background-color: var(--red-800); }
    .bg-red-900 { background-color: var(--red-900); }
    .bg-red-1000 { background-color: var(--red-1000); }
    .bg-green-100 { background-color: var(--green-100); }
    .bg-green-200 { background-color: var(--green-200); }
    .bg-green-300 { background-color: var(--green-300); }
    .bg-green-400 { background-color: var(--green-400); }
    .bg-green-500 { background-color: var(--green-500); }
    .bg-green-600 { background-color: var(--green-600); }
    .bg-green-700 { background-color: var(--green-700); }
    .bg-green-800 { background-color: var(--green-800); }
    .bg-green-900 { background-color: var(--green-900); }
    .bg-green-1000 { background-color: var(--green-1000); }
    .bg-teal-100 { background-color: var(--teal-100); }
    .bg-teal-200 { background-color: var(--teal-200); }
    .bg-teal-300 { background-color: var(--teal-300); }
    .bg-teal-400 { background-color: var(--teal-400); }
    .bg-teal-500 { background-color: var(--teal-500); }
    .bg-teal-600 { background-color: var(--teal-600); }
    .bg-teal-700 { background-color: var(--teal-700); }
    .bg-teal-800 { background-color: var(--teal-800); }
    .bg-teal-900 { background-color: var(--teal-900); }
    .bg-teal-1000 { background-color: var(--teal-1000); }
    .bg-purple-100 { background-color: var(--purple-100); }
    .bg-purple-200 { background-color: var(--purple-200); }
    .bg-purple-300 { background-color: var(--purple-300); }
    .bg-purple-400 { background-color: var(--purple-400); }
    .bg-purple-500 { background-color: var(--purple-500); }
    .bg-purple-600 { background-color: var(--purple-600); }
    .bg-purple-700 { background-color: var(--purple-700); }
    .bg-purple-800 { background-color: var(--purple-800); }
    .bg-purple-900 { background-color: var(--purple-900); }
    .bg-purple-1000 { background-color: var(--purple-1000); }
    .bg-pink-100 { background-color: var(--pink-100); }
    .bg-pink-200 { background-color: var(--pink-200); }
    .bg-pink-300 { background-color: var(--pink-300); }
    .bg-pink-400 { background-color: var(--pink-400); }
    .bg-pink-500 { background-color: var(--pink-500); }
    .bg-pink-600 { background-color: var(--pink-600); }
    .bg-pink-700 { background-color: var(--pink-700); }
    .bg-pink-800 { background-color: var(--pink-800); }
    .bg-pink-900 { background-color: var(--pink-900); }
    .bg-pink-1000 { background-color: var(--pink-1000); }
    .bg-gray-alpha-100 { background-color: var(--gray-alpha-100); }
    .bg-gray-alpha-200 { background-color: var(--gray-alpha-200); }
    .bg-gray-alpha-300 { background-color: var(--gray-alpha-300); }
    .bg-gray-alpha-400 { background-color: var(--gray-alpha-400); }
    .bg-gray-alpha-500 { background-color: var(--gray-alpha-500); }
    .bg-gray-alpha-600 { background-color: var(--gray-alpha-600); }
    .bg-gray-alpha-700 { background-color: var(--gray-alpha-700); }
    .bg-gray-alpha-800 { background-color: var(--gray-alpha-800); }
    .bg-gray-alpha-900 { background-color: var(--gray-alpha-900); }
    .bg-gray-alpha-1000 { background-color: var(--gray-alpha-1000); }
    .bg-background-100 { background-color: var(--background-100); }
    .bg-background-200 { background-color: var(--background-200); }

    .border-gray-100 { border-color: var(--gray-100) !important; }
    .border-gray-200 { border-color: var(--gray-200) !important; }
    .border-gray-300 { border-color: var(--gray-300) !important; }
    .border-gray-400 { border-color: var(--gray-400) !important; }
    .border-gray-500 { border-color: var(--gray-500) !important; }
    .border-gray-600 { border-color: var(--gray-600) !important; }
    .border-gray-700 { border-color: var(--gray-700) !important; }
    .border-gray-800 { border-color: var(--gray-800) !important; }
    .border-gray-900 { border-color: var(--gray-900) !important; }
    .border-gray-1000 { border-color: var(--gray-1000) !important; }
    .border-blue-100 { border-color: var(--blue-100) !important; }
    .border-blue-200 { border-color: var(--blue-200) !important; }
    .border-blue-300 { border-color: var(--blue-300) !important; }
    .border-blue-400 { border-color: var(--blue-400) !important; }
    .border-blue-500 { border-color: var(--blue-500) !important; }
    .border-blue-600 { border-color: var(--blue-600) !important; }
    .border-blue-700 { border-color: var(--blue-700) !important; }
    .border-blue-800 { border-color: var(--blue-800) !important; }
    .border-blue-900 { border-color: var(--blue-900) !important; }
    .border-blue-1000 { border-color: var(--blue-1000) !important; }
    .border-amber-100 { border-color: var(--amber-100) !important; }
    .border-amber-200 { border-color: var(--amber-200) !important; }
    .border-amber-300 { border-color: var(--amber-300) !important; }
    .border-amber-400 { border-color: var(--amber-400) !important; }
    .border-amber-500 { border-color: var(--amber-500) !important; }
    .border-amber-600 { border-color: var(--amber-600) !important; }
    .border-amber-700 { border-color: var(--amber-700) !important; }
    .border-amber-800 { border-color: var(--amber-800) !important; }
    .border-amber-900 { border-color: var(--amber-900) !important; }
    .border-amber-1000 { border-color: var(--amber-1000) !important; }
    .border-red-100 { border-color: var(--red-100) !important; }
    .border-red-200 { border-color: var(--red-200) !important; }
    .border-red-300 { border-color: var(--red-300) !important; }
    .border-red-400 { border-color: var(--red-400) !important; }
    .border-red-500 { border-color: var(--red-500) !important; }
    .border-red-600 { border-color: var(--red-600) !important; }
    .border-red-700 { border-color: var(--red-700) !important; }
    .border-red-800 { border-color: var(--red-800) !important; }
    .border-red-900 { border-color: var(--red-900) !important; }
    .border-red-1000 { border-color: var(--red-1000) !important; }
    .border-green-100 { border-color: var(--green-100) !important; }
    .border-green-200 { border-color: var(--green-200) !important; }
    .border-green-300 { border-color: var(--green-300) !important; }
    .border-green-400 { border-color: var(--green-400) !important; }
    .border-green-500 { border-color: var(--green-500) !important; }
    .border-green-600 { border-color: var(--green-600) !important; }
    .border-green-700 { border-color: var(--green-700) !important; }
    .border-green-800 { border-color: var(--green-800) !important; }
    .border-green-900 { border-color: var(--green-900) !important; }
    .border-green-1000 { border-color: var(--green-1000) !important; }
    .border-teal-100 { border-color: var(--teal-100) !important; }
    .border-teal-200 { border-color: var(--teal-200) !important; }
    .border-teal-300 { border-color: var(--teal-300) !important; }
    .border-teal-400 { border-color: var(--teal-400) !important; }
    .border-teal-500 { border-color: var(--teal-500) !important; }
    .border-teal-600 { border-color: var(--teal-600) !important; }
    .border-teal-700 { border-color: var(--teal-700) !important; }
    .border-teal-800 { border-color: var(--teal-800) !important; }
    .border-teal-900 { border-color: var(--teal-900) !important; }
    .border-teal-1000 { border-color: var(--teal-1000) !important; }
    .border-purple-100 { border-color: var(--purple-100) !important; }
    .border-purple-200 { border-color: var(--purple-200) !important; }
    .border-purple-300 { border-color: var(--purple-300) !important; }
    .border-purple-400 { border-color: var(--purple-400) !important; }
    .border-purple-500 { border-color: var(--purple-500) !important; }
    .border-purple-600 { border-color: var(--purple-600) !important; }
    .border-purple-700 { border-color: var(--purple-700) !important; }
    .border-purple-800 { border-color: var(--purple-800) !important; }
    .border-purple-900 { border-color: var(--purple-900) !important; }
    .border-purple-1000 { border-color: var(--purple-1000) !important; }
    .border-pink-100 { border-color: var(--pink-100) !important; }
    .border-pink-200 { border-color: var(--pink-200) !important; }
    .border-pink-300 { border-color: var(--pink-300) !important; }
    .border-pink-400 { border-color: var(--pink-400) !important; }
    .border-pink-500 { border-color: var(--pink-500) !important; }
    .border-pink-600 { border-color: var(--pink-600) !important; }
    .border-pink-700 { border-color: var(--pink-700) !important; }
    .border-pink-800 { border-color: var(--pink-800) !important; }
    .border-pink-900 { border-color: var(--pink-900) !important; }
    .border-pink-1000 { border-color: var(--pink-1000) !important; }
    .border-gray-alpha-100 { border-color: var(--gray-alpha-100) !important; }
    .border-gray-alpha-200 { border-color: var(--gray-alpha-200) !important; }
    .border-gray-alpha-300 { border-color: var(--gray-alpha-300) !important; }
    .border-gray-alpha-400 { border-color: var(--gray-alpha-400) !important; }
    .border-gray-alpha-500 { border-color: var(--gray-alpha-500) !important; }
    .border-gray-alpha-600 { border-color: var(--gray-alpha-600) !important; }
    .border-gray-alpha-700 { border-color: var(--gray-alpha-700) !important; }
    .border-gray-alpha-800 { border-color: var(--gray-alpha-800) !important; }
    .border-gray-alpha-900 { border-color: var(--gray-alpha-900) !important; }
    .border-gray-alpha-1000 { border-color: var(--gray-alpha-1000) !important; }
    .border-background-100 { border-color: var(--background-100) !important; }
    .border-background-200 { border-color: var(--background-200) !important; }

    .text-gray-100 { color: var(--gray-100); }
    .text-gray-200 { color: var(--gray-200); }
    .text-gray-300 { color: var(--gray-300); }
    .text-gray-400 { color: var(--gray-400); }
    .text-gray-500 { color: var(--gray-500); }
    .text-gray-600 { color: var(--gray-600); }
    .text-gray-700 { color: var(--gray-700); }
    .text-gray-800 { color: var(--gray-800); }
    .text-gray-900 { color: var(--gray-900); }
    .text-gray-1000 { color: var(--gray-1000); }
    .text-blue-100 { color: var(--blue-100); }
    .text-blue-200 { color: var(--blue-200); }
    .text-blue-300 { color: var(--blue-300); }
    .text-blue-400 { color: var(--blue-400); }
    .text-blue-500 { color: var(--blue-500); }
    .text-blue-600 { color: var(--blue-600); }
    .text-blue-700 { color: var(--blue-700); }
    .text-blue-800 { color: var(--blue-800); }
    .text-blue-900 { color: var(--blue-900); }
    .text-blue-1000 { color: var(--blue-1000); }
    .text-amber-100 { color: var(--amber-100); }
    .text-amber-200 { color: var(--amber-200); }
    .text-amber-300 { color: var(--amber-300); }
    .text-amber-400 { color: var(--amber-400); }
    .text-amber-500 { color: var(--amber-500); }
    .text-amber-600 { color: var(--amber-600); }
    .text-amber-700 { color: var(--amber-700); }
    .text-amber-800 { color: var(--amber-800); }
    .text-amber-900 { color: var(--amber-900); }
    .text-amber-1000 { color: var(--amber-1000); }
    .text-red-100 { color: var(--red-100); }
    .text-red-200 { color: var(--red-200); }
    .text-red-300 { color: var(--red-300); }
    .text-red-400 { color: var(--red-400); }
    .text-red-500 { color: var(--red-500); }
    .text-red-600 { color: var(--red-600); }
    .text-red-700 { color: var(--red-700); }
    .text-red-800 { color: var(--red-800); }
    .text-red-900 { color: var(--red-900); }
    .text-red-1000 { color: var(--red-1000); }
    .text-green-100 { color: var(--green-100); }
    .text-green-200 { color: var(--green-200); }
    .text-green-300 { color: var(--green-300); }
    .text-green-400 { color: var(--green-400); }
    .text-green-500 { color: var(--green-500); }
    .text-green-600 { color: var(--green-600); }
    .text-green-700 { color: var(--green-700); }
    .text-green-800 { color: var(--green-800); }
    .text-green-900 { color: var(--green-900); }
    .text-green-1000 { color: var(--green-1000); }
    .text-teal-100 { color: var(--teal-100); }
    .text-teal-200 { color: var(--teal-200); }
    .text-teal-300 { color: var(--teal-300); }
    .text-teal-400 { color: var(--teal-400); }
    .text-teal-500 { color: var(--teal-500); }
    .text-teal-600 { color: var(--teal-600); }
    .text-teal-700 { color: var(--teal-700); }
    .text-teal-800 { color: var(--teal-800); }
    .text-teal-900 { color: var(--teal-900); }
    .text-teal-1000 { color: var(--teal-1000); }
    .text-purple-100 { color: var(--purple-100); }
    .text-purple-200 { color: var(--purple-200); }
    .text-purple-300 { color: var(--purple-300); }
    .text-purple-400 { color: var(--purple-400); }
    .text-purple-500 { color: var(--purple-500); }
    .text-purple-600 { color: var(--purple-600); }
    .text-purple-700 { color: var(--purple-700); }
    .text-purple-800 { color: var(--purple-800); }
    .text-purple-900 { color: var(--purple-900); }
    .text-purple-1000 { color: var(--purple-1000); }
    .text-pink-100 { color: var(--pink-100); }
    .text-pink-200 { color: var(--pink-200); }
    .text-pink-300 { color: var(--pink-300); }
    .text-pink-400 { color: var(--pink-400); }
    .text-pink-500 { color: var(--pink-500); }
    .text-pink-600 { color: var(--pink-600); }
    .text-pink-700 { color: var(--pink-700); }
    .text-pink-800 { color: var(--pink-800); }
    .text-pink-900 { color: var(--pink-900); }
    .text-pink-1000 { color: var(--pink-1000); }
    .text-gray-alpha-100 { color: var(--gray-alpha-100); }
    .text-gray-alpha-200 { color: var(--gray-alpha-200); }
    .text-gray-alpha-300 { color: var(--gray-alpha-300); }
    .text-gray-alpha-400 { color: var(--gray-alpha-400); }
    .text-gray-alpha-500 { color: var(--gray-alpha-500); }
    .text-gray-alpha-600 { color: var(--gray-alpha-600); }
    .text-gray-alpha-700 { color: var(--gray-alpha-700); }
    .text-gray-alpha-800 { color: var(--gray-alpha-800); }
    .text-gray-alpha-900 { color: var(--gray-alpha-900); }
    .text-gray-alpha-1000 { color: var(--gray-alpha-1000); }
    .text-background-100 { color: var(--background-100); }
    .text-background-200 { color: var(--background-200); }
  `
  const styles = `
    ${colors}

    :root {
      --page-margin: 1rem;
      --page-width: 93rem;
      --page-width-with-margin: calc(var(--page-width) + calc(2 * var(--page-margin)));

      color-scheme: dark;
      font-family: Inter, arial, sans-serif;
      font-feature-settings: 'liga' 1, 'calt' 1; /* fix for Chrome */
    }

    @media (prefers-color-scheme: light) {
      :root {
        color-scheme: light;
      }
    }

    @supports (font-variation-settings: normal) {
      :root { font-family: InterVariable, arial, sans-serif; }
    }

    *,
    ::before,
    ::after {
      box-sizing: border-box;
      border-width: 0;
      border-style: solid;
      border-color: var(--gray-alpha-400);
    }

    ::selection {
      background-color: var(--blue-700);
      color: var(--gray-1000);
    }

    html {
      background-color: var(--background-200);
      color: var(--gray-1000);
      font-synthesis: none;
      font-weight: 400;
      line-height: 1.5;
      scrollbar-color: var(--a2) transparent;
      scrollbar-width: thin;
      text-rendering: optimizeLegibility;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
    }

    a {
      color: inherit;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      text-decoration-skip-ink: auto;
    }

    body {
      height: 100vh;
      margin: 0;
      line-height: inherit;
    }
    
    a:focus-visible,
    button:focus-visible,
    dialog:focus-visible,
    div:focus-visible,
    input:focus-visible,
    pre:focus-visible {
      box-shadow: var(--focus-border);
      outline: none;
      isolation: isolate;
    }

    h1, p { margin: 0; }

    pre {
      margin: 0;
      background: transparent !important;

      --shiki-foreground: var(--gray-500);
      --shiki-background: var(--background-100);
      --shiki-token-constant: var(--gray-1000);
      --shiki-token-string: var(--gray-700);
      --shiki-token-comment: var(--gray-700);
      --shiki-token-keyword: var(--gray-700);
      --shiki-token-parameter: var(--gray-700);
      --shiki-token-function: var(--gray-700);
      --shiki-token-string-expression: var(--gray-1000);
      --shiki-token-punctuation: var(--gray-700);
      --shiki-token-link: var(--gray-700);
    }

    ul { margin: 0; padding: 0; }
    li { list-style: none; }

    /** Reset **/

    button,
    input {
      font-family: inherit; 
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    table {
      text-indent: 0;
      border-color: inherit;
      border-collapse: collapse;
    }

    button,
    input {
      font-family: inherit;
      font-feature-settings: inherit;
      font-variation-settings: inherit;
      font-size: 100%;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    button {
      cursor: pointer;
      text-transform: none;
    }

    button[type='submit'] {
      -webkit-appearance: button;
      background-color: transparent;
      background-image: none;
    }

    :-moz-focusring {
      outline: auto;
    }

    input::placeholder {
      opacity: 1;
      color: var(--gray-700);
    }

    :disabled {
      cursor: default;
    }

    img,
    svg,
    video {
      display: block;
      vertical-align: middle;
    }

    img,
    video {
      max-width: 100%;
      height: auto;
    }

    [hidden] {
      display: none;
    }

    /** Utilities **/

    .border { border-width: 1px; }
    .border-t-0 { border-top-width: 0; }
    .cursor-pointer { cursor: pointer; }
    .display-block { display: block; }
    .divide-y > * + * {
      border-top-width: 1px;
      border-bottom-width: 0px;
    }
    .divide-y-reverse > * + * {
      border-top-width: 0px;
      border-bottom-width: 1px;
    }
    .font-normal { font-weight: 400; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: "Roboto Mono",Menlo,Monaco,Lucida Console,Liberation Mono,DejaVu Sans Mono,Bitstream Vera Sans Mono,Courier New,monospace; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .flex-wrap { flex-wrap: wrap; }
    .gap-0\\.5 { gap: 0.125rem; }
    .gap-1 { gap: 0.25rem; }
    .gap-1\\.5 { gap: 0.375rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-2\\.5 { gap: 0.625rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .h-full { height: 100%; }
    .h-10 { height: 2.5rem; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .leading-snug { line-height: 1.375; }
    .max-w-full { max-width: 100%; }
    .mx-4 { margin-left: 1rem; margin-right: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-1\\.5 { margin-top: 0.375rem; }
    .object-cover { object-fit: cover; }
    .overflow-hidden { overflow: hidden; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .pb-0 { padding-bottom: 0; }
    .pb-4 { padding-bottom: 1rem; }
    .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
    .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .relative { position: relative; }
    .rounded-bl-md { border-bottom-left-radius: 0.375rem; }
    .rounded-br-md { border-bottom-right-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-sm { border-radius: 0.25rem; }
    .rounded-l-md { border-top-left-radius: 0.375rem; border-bottom-left-radius: 0.375rem; }
    .rounded-r-md { border-top-right-radius: 0.375rem; border-bottom-right-radius: 0.375rem; }
    .rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
    .text-center { text-align: center; }
    .text-ellipsis { text-overflow: ellipsis; }
    .text-right { text-align: right; }
    .text-base { font-size: 1rem; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .w-fit { width: fit-content; }
    .w-full { width: 100%; }
    .whitespace-nowrap { white-space: nowrap; }

    .bg-transparent { background-color: transparent !important; }

    .scrollbars {
      overflow: auto;
      scrollbar-color: var(--gray-alpha-400) transparent;
      scrollbar-width: thin;
    }

    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    [x-cloak] { display: none !important; }

    .container {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr)); 
    }
    @media screen and (max-width: 768px) {
      .container {
        grid-template-columns: repeat(1, minmax(0, 1fr));
      }
    }

    .sr-only {
      border-width: 0;
      clip: rect(0, 0, 0, 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
      width: 1px;
    }

    .md\\:divide-y-0 > * + * {
      border-top-width: 0px;
      border-bottom-width: 0px;
    }
    @media screen and (max-width: 768px) {
      .md\\:divide-y-0 > * + * {
        border-top-width: inherit;
      }
    }

    .divide-x > * + * {
      border-right-width: 0;
      border-left-width: 1px;
    }
  `
  // biome-ignore lint/security/noDangerouslySetInnerHtml:
  return <style dangerouslySetInnerHTML={{ __html: styles }} />
}

export function Scripts() {
  return (
    <>
      {/* TODO: Vendor into project */}
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/@alpinejs/focus@3.x.x/dist/cdn.min.js"
      />
      <script
        defer
        src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
      />
    </>
  )
}
