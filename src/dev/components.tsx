import {
  chevronLeftIcon,
  chevronRightIcon,
  externalLinkIcon,
  farcasterIcon,
  globeIcon,
  mintIcon,
  redirectIcon,
  refreshIcon,
  stopwatchIcon,
} from './icons.js'
import { type Frame as FrameType } from './types.js'
import { type State } from './utils.js'

export type PreviewProps = {
  baseUrl: string
  contextHtml: string
  frame: FrameType
  routes: readonly string[]
  speed: number
  state: State
}

export function Preview(props: PreviewProps) {
  const { baseUrl, contextHtml, frame, routes, speed, state } = props
  return (
    <div
      class="flex flex-col items-center p-4"
      x-data={`{
        baseUrl: '${baseUrl}',
        data: {
          frame: ${JSON.stringify(frame)},
          contextHtml: ${JSON.stringify(contextHtml)},
          routes: ${JSON.stringify(routes)},
          speed: ${speed},
          state: ${JSON.stringify(state)},
        },
        history: [],
        id: -1,
        inputText: '',
        logs: [{ method: 'GET', url: '${baseUrl}', speed: ${speed}, time: Date.now() }],
        get frame() { return this.data.frame },
        get speed() { return this.data.speed },

        async getFrame() {
          const response = await fetch(this.baseUrl + '/dev/frame', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const json = await response.json()
          this.logs = [...this.logs, { method: 'GET', url: this.baseUrl, speed: json.speed, time: Date.now() }]
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
          this.logs = [...this.logs, { method: 'POST', url: body.postUrl, body, speed: json.speed, time: Date.now() }]
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
          this.logs = [...this.logs, { method: 'POST', url: body.postUrl, body, speed: json.speed, time: Date.now() }]
          return json
        },

        formatSpeed(speed) {
          if (speed % 1 === 0) return speed
          return (Math.round((speed + Number.EPSILON) * 100) / 100).toFixed(2)
        },
        formatUrl(url) {
          let urlObj = new URL(url)
          urlObj.search = ''
          const urlString = urlObj.toString().replace(/https?:\\/\\//, '')
          return urlString.endsWith('/') ? urlString.slice(0, -1) : urlString
        }
      }`}
    >
      <div
        class="grid gap-2.5 w-full"
        style={{ maxWidth: '68rem' }}
        x-data="{
          get contextHtml() { return data.contextHtml },
          get routes() { return data.routes },
          get state() { return data.state },
          get buttonCount() { return frame.buttons?.length ?? 0 },
          get hasIntents() { return Boolean(frame.input || frame.buttons.length) },
        }"
      >
        <Navigator />

        <div class="container gap-4" style={{ minHeight: '25.5rem' }}>
          <Frame />
          <Data />
        </div>

        <div class="border divide-x rounded-md container">
          <div class="p-4 scrollbars" style={{ height: '22.75rem' }}>
            <div class="grayscale text-sm" x-html="contextHtml" />
          </div>
          <div class="scrollbars" style={{ height: '22.75rem' }}>
            <Timeline />
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
          class="text-fg2 bg-transparent px-2 rounded-l-md"
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
            ':style': "id === -1 && { opacity: '0.35' }",
          }}
        >
          {chevronLeftIcon}
        </button>
        <div class="bg-br h-full" style={{ width: '1px' }} />
        <button
          aria-label="forward"
          class="text-fg2 bg-transparent px-2 rounded-r-md"
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
            ':style': "disabled && { opacity: '0.35' }",
          }}
        >
          {chevronRightIcon}
        </button>
      </div>

      <button
        aria-label="refresh"
        class="border rounded-md text-fg2 bg-transparent px-2 rounded-r-md h-full"
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
          class="bg-transparent border rounded-md text-fg2 w-full h-full relative overflow-hidden"
          style={{
            paddingLeft: '1.75rem',
            paddingRight: '1.75rem',
          }}
          x-on:click="open = true"
        >
          <div
            class="flex items-center h-full"
            style={{ left: '0.5rem', position: 'absolute' }}
          >
            {globeIcon}
          </div>
          <div class="overflow-hidden whitespace-nowrap text-ellipsis h-full">
            <span
              class="font-mono text-sm"
              style={{ lineHeight: '2rem' }}
              x-text="formatUrl(state.context.url)"
            />
          </div>
        </button>

        <div
          x-show="open"
          class="border bg-bg rounded-lg w-full overflow-hidden"
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
              class="display-block font-mono text-sm whitespace-nowrap px-3 py-1.5 rounded-lg overflow-hidden text-ellipsis"
              x-text="`${url.protocol}//${url.host}${route === '/' ? '' : route}`"
              style={{ textDecoration: 'none' }}
              {...{
                ':href': `route === '/' ? '/dev' : route + '/dev'`,
              }}
            />
          </template>
        </div>
      </div>

      <div class="border rounded-md items-center flex text-fg2 px-1.5 rounded-md font-mono gap-1.5 h-full text-sm">
        {stopwatchIcon}
        <div x-text="`${formatSpeed(speed)}ms`" />
      </div>

      <button
        type="button"
        class="bg-transparent rounded-md border overflow-hidden text-fg2"
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
          <div class="bg-bg2 flex flex-col px-4 py-2 gap-2 rounded-bl-md rounded-br-md border-t-0 border">
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
        <a {...{ ':href': 'baseUrl' }} x-text="new URL(baseUrl).host" />
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
        maxHeight: '526px',
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
      class="bg-bg rounded-sm border px-3 py-2.5 text-sm leading-snug w-full"
      name="inputText"
      style={{ paddingBottom: '0.5rem' }}
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
    'bg-bn flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4 w-full'
  const innerHtml = (
    <span
      class="whitespace-nowrap overflow-hidden text-ellipsis"
      style={{ lineHeight: 'normal', marginTop: '2px' }}
      x-text="title"
    />
  )
  const leavingAppPrompt = (
    <div
      x-show="open"
      class="flex flex-col gap-1.5 border bg-bg p-4 rounded-lg text-center"
      style={{ position: 'absolute', marginTop: '4px', width: '20rem' }}
      {...{
        '@click.outside': 'open = false',
        '@keyup.escape': 'open = false',
        'x-trap': 'open',
      }}
    >
      <h1 class="font-bold text-base">Leaving Warpcast</h1>
      <div class="line-clamp-2 text-fg2 text-sm font-mono" x-text="url" />
      <p class="text-base leading-snug">
        If you connect your wallet and the site is malicious, you may lose
        funds.
      </p>
      <div class="flex gap-1.5 mt-1">
        <button
          class="bg-bg border rounded-md w-full text-sm font-bold py-1"
          type="button"
          x-on:click="open = false"
        >
          <div style={{ marginTop: '1px' }}>Cancel</div>
        </button>
        <button
          class="bg-er border-er rounded-md w-full text-sm text-white font-bold py-1"
          target="_blank"
          type="button"
          x-on:click={`open = false; window.open(url, '_blank');`}
        >
          <div style={{ marginTop: '1px' }}>I Understand</div>
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
            <div style={{ marginTop: '2px' }}>{externalLinkIcon}</div>
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
                  if (!json.success) return
                  url = json.redirectUrl
                  open = true
                })
                .catch(console.error)
          `}
          >
            {innerHtml}
            <div style={{ marginTop: '2px' }}>{redirectIcon}</div>
          </button>

          {leavingAppPrompt}
        </div>
      </template>

      <template x-if="type === 'mint'">
        <button class={buttonClass} type="button">
          <div>{mintIcon}</div>
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
    <div class="flex flex-col gap-1.5 w-full scrollbars font-mono text-fg2 py-2 text-sm">
      <div>
        fc:frame <span class="text-fg" x-text="frame.version" />
      </div>
      <div class="text-ellipsis overflow-hidden whitespace-nowrap">
        fc:frame:image <span class="text-fg" x-text="frame.imageUrl" />
      </div>
      <div>
        fc:frame:image:aspect_ratio{' '}
        <span class="text-fg" x-text="frame.imageAspectRatio" />
      </div>
      <div class="text-ellipsis overflow-hidden whitespace-nowrap">
        fc:frame:post_url <span class="text-fg" x-text="frame.postUrl" />
      </div>
      <div class="text-ellipsis overflow-hidden whitespace-nowrap">
        og:image <span class="text-fg" x-text="frame.title || 'unset'" />
      </div>
      <div class="text-ellipsis overflow-hidden whitespace-nowrap">
        og:title <span class="text-fg" x-text="frame.title || 'unset'" />
      </div>

      <template x-if="frame.input">
        <div>
          <div class="text-ellipsis overflow-hidden whitespace-nowrap">
            fc:frame:input:text{' '}
            <span class="text-fg" x-text="frame.input.text" />
          </div>
        </div>
      </template>

      <template x-for="button in frame.buttons">
        <div class="text-ellipsis overflow-hidden whitespace-nowrap">
          fc:frame:button:
          <span x-text="button.index" />{' '}
          <span class="text-fg" x-text="button.type" />
          <span x-text="button.title ? ', ' : ''" />
          <span class="text-fg" x-text="button.title" />
          <span x-text="button.target ? ', ' : ''" />
          <span class="text-fg" x-text="button.target" />
        </div>
      </template>
    </div>
  )
}

function Timeline() {
  return (
    <div
      class="w-full flex divide-y-reverse"
      style={{
        flexDirection: 'column-reverse',
        justifyContent: 'flex-end',
      }}
    >
      <template x-for="log in logs">
        <div class="flex flex-col p-4 gap-1.5">
          <div
            class="flex flex-row"
            style={{ justifyContent: 'space-between' }}
          >
            <div class="flex gap-1.5 font-mono text-fg2 text-sm">
              <div
                class="flex items-center bg-bn px-1 rounded-sm text-xs"
                x-text="log.method"
              />
              <span x-text="`${formatSpeed(log.speed)}ms`" />
            </div>
            <span
              class="font-mono text-fg2 text-sm"
              x-text="new Date(log.time).toLocaleTimeString()"
            />
          </div>

          <div class="flex gap-1.5 font-mono text-fg2 text-sm">
            <span x-text="`${formatUrl(log.url)}`" />
          </div>
        </div>
      </template>
    </div>
  )
}

export function Styles() {
  const styles = `
    :root {
      --bg: #0A0A0A;
      --bg2: #111111;
      --bn: #1F1F1F;
      --br: #252525;
      --er: #7F1E1E;
      --fg: #EDEDED;
      --fg2: #A1A1A1;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #FFFFFF;
        --bg2: #FAFAFA;
        --bn: #F2F2F2;
        --br: #EBEBEB;
        --er: #C9403D;
        --fg: #171717;
        --fg2: #666666;
      }
    }

    *,
    ::before,
    ::after {
      box-sizing: border-box;
      border-width: 0;
      border-style: solid;
      border-color: var(--br);
    }

    ::selection {
      background-color: #2860CA;
    }

    html {
      background-color: var(--bg);
      color-scheme: light dark;
      color: var(--fg);
      font-family: sans-serif;
      font-synthesis: none;
      font-weight: 400;
      line-height: 1.5;
      scrollbar-color: var(--br) transparent;
      scrollbar-width: thin;
      scrollbar-gutter: stable;
      text-rendering: optimizeLegibility;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
    }

    a {
      color: var(--fg2);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      text-decoration-skip-ink: auto;
    }

    body {
      margin: 0;
      line-height: inherit;
    }
    
    a:focus-visible,
    button:focus-visible,
    dialog:focus-visible,
    div:focus-visible,
    input:focus-visible,
    pre:focus-visible {
      box-shadow: 0 0 0 2px rgba(0, 125, 255, 0.8);
      outline: none;
    }

    h1, p { margin: 0; }

    pre {
      margin: 0;
      --shiki-dark-bg: transparent !important;
      background: transparent !important;
    }

    @media (prefers-color-scheme: dark) {
      .shiki,
      .shiki span {
        color: var(--shiki-dark) !important;
        background-color: var(--shiki-dark-bg) !important;
        /* Optional, if you also want font styles */
        font-style: var(--shiki-dark-font-style) !important;
        font-weight: var(--shiki-dark-font-weight) !important;
        text-decoration: var(--shiki-dark-text-decoration) !important;
      }
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
      color: var(--fg2);
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
    .divide-x > * + * {
      border-right-width: 0;
      border-left-width: 1px;
    }
    .divide-y > * + * {
      border-top-width: 1px;
      border-bottom-width: 0px;
    }
    .divide-y-reverse > * + * {
      border-top-width: 0px;
      border-bottom-width: 1px;
    }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
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
    .mt-1 { margin-top: 0.25rem; }
    .object-cover { object-fit: cover; }
    .overflow-hidden { overflow: hidden; }
    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .pb-0 { padding-bottom: 0; }
    .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
    .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
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
    .w-full { width: 100%; }
    .whitespace-nowrap { white-space: nowrap; }

    .bg-bg { background-color: var(--bg) !important; }
    .bg-bg2 { background-color: var(--bg2) !important; }
    .bg-bn { background-color: var(--bn) !important; }
    .bg-br { background-color: var(--br) !important; }
    .bg-er { background-color: var(--er) !important; }
    .bg-transparent { background-color: transparent !important; }
    .border-er { border-color: var(--er) !important; } w
    .text-er { color: var(--er); }
    .text-fg { color: var(--fg); }
    .text-fg2 { color: var(--fg2); }
    .text-white { color: #FAFAFA; }

    .scrollbars {
      overflow: auto;
      scrollbar-color: var(--br) transparent;
      scrollbar-width: thin;
    }

    .line-clamp-2 {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .grayscale {
      filter: grayscale(100%);
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
