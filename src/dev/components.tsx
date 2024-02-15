import { type Frame as FrameType } from './types.js'
import { type State, type getInspectorData } from './utils.js'

export type PreviewProps = {
  baseUrl: string
  error?: string
  frame: FrameType
  routes: readonly string[]
  inspectorData: Awaited<ReturnType<typeof getInspectorData>>
  state: State
}

export function Preview(props: PreviewProps) {
  const { baseUrl, error, frame, routes, state } = props
  return (
    <div
      class="items-center flex flex-col p-4 mt-1"
      x-data={`{
        error: ${error ? `'${error}'` : undefined},
        baseUrl: '${baseUrl}',
        history: [],
        id: -1,
        initialData: {
          frame: ${JSON.stringify(frame)},
          inspectorData: ${JSON.stringify(props.inspectorData)},
          routes: ${JSON.stringify(routes)},
          state: ${JSON.stringify(state)},
        },
        inputText: '',
        data: {
          frame: ${JSON.stringify(frame)},
          inspectorData: ${JSON.stringify(props.inspectorData)},
          routes: ${JSON.stringify(routes)},
          state: ${JSON.stringify(state)},
        },
        get frame() { return this.data.frame },
      }`}
    >
      <div
        class="max-w-7xl flex flex-col gap-2.5 w-full"
        x-data="{
          get inspectorData() { return data.inspectorData },
          get routes() { return data.routes },
          get state() { return data.state },
          get buttonCount() { return frame.buttons?.length ?? 0 },
          get hasIntents() { return Boolean(frame.input || frame.buttons.length) },
        }"
      >
        <HistoryBar />
        <div class="flex flex-row gap-2.5" style={{ minHeight: '397px' }}>
          <Frame />
          <Navigator />
        </div>
        <div class="text-er text-sm" x-text="error" />
        <Inspector />
      </div>
    </div>
  )
}

function HistoryBar() {
  return (
    <div class="items-center flex gap-2.5 w-full" style={{ maxWidth: '512px' }}>
      <div class="flex border rounded-md" style={{ height: '1.6rem' }}>
        <button
          aria-label="back"
          class="text-fg2 bg-transparent px-1.5 rounded-l-md"
          type="button"
          x-data="{ get disabled() { return id === -1 } }"
          x-on:click={`
            const nextId = id - 1
            if (nextId < 0) {
              data = initialData
              id = -1
              inputText = ''
              return
            }

            const body = history[nextId].body
            fetch(baseUrl + '/dev/action', {
              method: 'POST',
              body,
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then((res) => res.json())
            .then((json) => {
              data = json
              id = nextId
              inputText = ''
            })
            .catch(console.error)
          `}
          {...{
            ':disabled': 'disabled',
            ':style': "disabled && { opacity: '0.25' }",
          }}
        >
          {arrowLeftIcon}
        </button>
        <div class="bg-br h-full" style={{ width: '1px' }} />
        <button
          aria-label="forward"
          class="text-fg2 bg-transparent px-1.5 rounded-r-md"
          type="button"
          x-data="{ get disabled() { return !history[id + 1] } }"
          x-on:click={`
            let nextId = id + 1
            if (!history[nextId]) return

            const body = history[nextId].body
            fetch(baseUrl + '/dev/action', {
              method: 'POST',
              body,
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then((res) => res.json())
            .then((json) => {
              data = json
              id = nextId
              inputText = ''
            })
            .catch(console.error)
          `}
          {...{
            ':disabled': 'disabled',
            ':style': "disabled && { opacity: '0.25' }",
          }}
        >
          {arrowRightIcon}
        </button>
      </div>

      <div class="flex gap-2 w-full" style={{ height: '1.6rem' }}>
        <div class="items-center flex text-fg2 border px-1.5 rounded-md font-mono w-full gap-1">
          <button type="button" class="bg-transparent">
            {clockIcon}
          </button>
          <div
            class="overflow-hidden whitespace-nowrap text-ellipsis text-xs"
            style={{ marginTop: '1px' }}
            x-text="state.context.url.replace(/https?:\\/\\//, '')"
          />
        </div>
        <div class="items-center flex text-fg2 border px-1.5 rounded-md font-mono gap-1">
          {stopwatchIcon}
          <div class="text-xs" x-text="'24ms'" />
        </div>
      </div>
    </div>
  )
}

function Frame() {
  return (
    <div class="w-full" style={{ maxWidth: '512px' }}>
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
      style={{ lineHeight: 'normal' }}
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
            <div style={{ marginTop: '2px' }}>{innerHtml}</div>
            <div style={{ marginTop: '2px' }}>{linkIcon}</div>
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
              fetch(baseUrl + '/dev/redirect', {
                method: 'POST',
                body: JSON.stringify({
                  buttonIndex: index,
                  inputText,
                  postUrl: target ?? frame.postUrl,
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
              })
              .then((res) => res.json())
              .then((json) => {
                // TODO: show error
                if (!json.success) return
                url = json.redirectUrl
                open = true
              })
              .catch(console.error)
          `}
          >
            <div style={{ marginTop: '2px' }}>{innerHtml}</div>
            <div style={{ marginTop: '2px' }}>{redirectIcon}</div>
          </button>

          {leavingAppPrompt}
        </div>
      </template>

      <template x-if="type === 'mint'">
        <button
          class={buttonClass}
          style={{ paddingTop: '0.625rem ' }}
          type="button"
        >
          {mintIcon}
          {innerHtml}
        </button>
      </template>

      <template x-if="type === 'post'">
        <button
          class={buttonClass}
          style={{ paddingTop: '0.625rem' }}
          type="button"
          x-on:click={`
            const body = JSON.stringify({
              buttonIndex: index,
              inputText,
              postUrl: target ?? frame.postUrl,
            })
            fetch(baseUrl + '/dev/action', {
              method: 'POST',
              body,
              headers: {
                'Content-Type': 'application/json',
              },
            })
            .then((res) => res.json())
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

const linkIcon = (
  <svg
    aria-hidden="true"
    class="text-fg2"
    fill="none"
    height="13"
    viewBox="0 0 15 15"
    width="13"
  >
    <path
      d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
)

const mintIcon = (
  <svg
    aria-hidden="true"
    fill="none"
    height="13"
    viewBox="0 0 28 28"
    width="13"
  >
    <path
      fill="currentColor"
      fill-rule="evenodd"
      d="M14.804.333a1.137 1.137 0 0 0-1.608 0L.333 13.196a1.137 1.137 0 0 0 0 1.608l12.863 12.863a1.137 1.137 0 0 0 1.608 0l12.863-12.863a1.137 1.137 0 0 0 0-1.608L14.804.333ZM14 5.159c0-.89-1.077-1.337-1.707-.707l-8.134 8.134a2 2 0 0 0 0 2.828l8.134 8.134c.63.63 1.707.184 1.707-.707V5.159Z"
      clip-rule="nonzero"
    />
  </svg>
)

const redirectIcon = (
  <svg
    aria-hidden="true"
    class="text-fg2"
    fill="none"
    height="13"
    viewBox="0 0 15 15"
    width="13"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M12 13C12.5523 13 13 12.5523 13 12V3C13 2.44771 12.5523 2 12 2H3C2.44771 2 2 2.44771 2 3V6.5C2 6.77614 2.22386 7 2.5 7C2.77614 7 3 6.77614 3 6.5V3H12V12H8.5C8.22386 12 8 12.2239 8 12.5C8 12.7761 8.22386 13 8.5 13H12ZM9 6.5C9 6.5001 9 6.50021 9 6.50031V6.50035V9.5C9 9.77614 8.77614 10 8.5 10C8.22386 10 8 9.77614 8 9.5V7.70711L2.85355 12.8536C2.65829 13.0488 2.34171 13.0488 2.14645 12.8536C1.95118 12.6583 1.95118 12.3417 2.14645 12.1464L7.29289 7H5.5C5.22386 7 5 6.77614 5 6.5C5 6.22386 5.22386 6 5.5 6H8.5C8.56779 6 8.63244 6.01349 8.69139 6.03794C8.74949 6.06198 8.80398 6.09744 8.85143 6.14433C8.94251 6.23434 8.9992 6.35909 8.99999 6.49708L8.99999 6.49738"
      fill="currentColor"
    />
  </svg>
)

const arrowLeftIcon = (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
)

const arrowRightIcon = (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 15 15"
    fill="none"
  >
    <path
      d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
)

const stopwatchIcon = (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 15 15"
    fill="none"
  >
    <path
      d="M5.49998 0.5C5.49998 0.223858 5.72383 0 5.99998 0H7.49998H8.99998C9.27612 0 9.49998 0.223858 9.49998 0.5C9.49998 0.776142 9.27612 1 8.99998 1H7.99998V2.11922C9.09832 2.20409 10.119 2.56622 10.992 3.13572C11.0116 3.10851 11.0336 3.08252 11.058 3.05806L11.858 2.25806C12.1021 2.01398 12.4978 2.01398 12.7419 2.25806C12.986 2.50214 12.986 2.89786 12.7419 3.14194L11.967 3.91682C13.1595 5.07925 13.9 6.70314 13.9 8.49998C13.9 12.0346 11.0346 14.9 7.49998 14.9C3.96535 14.9 1.09998 12.0346 1.09998 8.49998C1.09998 5.13362 3.69904 2.3743 6.99998 2.11922V1H5.99998C5.72383 1 5.49998 0.776142 5.49998 0.5ZM2.09998 8.49998C2.09998 5.51764 4.51764 3.09998 7.49998 3.09998C10.4823 3.09998 12.9 5.51764 12.9 8.49998C12.9 11.4823 10.4823 13.9 7.49998 13.9C4.51764 13.9 2.09998 11.4823 2.09998 8.49998ZM7.99998 4.5C7.99998 4.22386 7.77612 4 7.49998 4C7.22383 4 6.99998 4.22386 6.99998 4.5V9.5C6.99998 9.77614 7.22383 10 7.49998 10C7.77612 10 7.99998 9.77614 7.99998 9.5V4.5Z"
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
)

const clockIcon = (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 15 15"
    fill="none"
  >
    <path
      d="M7.50009 0.877014C3.84241 0.877014 0.877258 3.84216 0.877258 7.49984C0.877258 11.1575 3.8424 14.1227 7.50009 14.1227C11.1578 14.1227 14.1229 11.1575 14.1229 7.49984C14.1229 3.84216 11.1577 0.877014 7.50009 0.877014ZM1.82726 7.49984C1.82726 4.36683 4.36708 1.82701 7.50009 1.82701C10.6331 1.82701 13.1729 4.36683 13.1729 7.49984C13.1729 10.6328 10.6331 13.1727 7.50009 13.1727C4.36708 13.1727 1.82726 10.6328 1.82726 7.49984ZM8 4.50001C8 4.22387 7.77614 4.00001 7.5 4.00001C7.22386 4.00001 7 4.22387 7 4.50001V7.50001C7 7.63262 7.05268 7.7598 7.14645 7.85357L9.14645 9.85357C9.34171 10.0488 9.65829 10.0488 9.85355 9.85357C10.0488 9.65831 10.0488 9.34172 9.85355 9.14646L8 7.29291V4.50001Z"
      fill="currentColor"
      fill-rule="evenodd"
      clip-rule="evenodd"
    />
  </svg>
)

function Navigator() {
  return (
    <div class="flex flex-col gap-0.5" x-data="{ url: new URL(baseUrl) }">
      <template x-for="route in routes">
        <a
          class="font-mono text-xs whitespace-nowrap"
          x-data="{ active: url.pathname === route }"
          x-text="`${route === '/' ? '/' : route}${active ? ' ▲' : ''}`"
          {...{ ':href': `route === '/' ? '/dev' : route + '/dev'` }}
        />
      </template>
    </div>
  )
}

async function Inspector() {
  return (
    <div class="border divide-y rounded-lg flex flex-col max-w-full">
      <div class="divide-x grid grid-cols-2 max-w-full">
        <div
          x-data="{
            title: 'Current Context',
            get content() { return inspectorData.contextHtml },
          }"
        >
          <Panel />
        </div>
      </div>

      <div class="divide-x grid grid-cols-2 max-w-full">
        <div
          x-data="{
            title: 'Frame Data',
            get content() { return inspectorData.frameHtml },
          }"
        >
          <Panel />
        </div>

        <div
          x-data="{
            title: 'Debug',
            get content() { return inspectorData.debugHtml },
          }"
        >
          <Panel />
        </div>
      </div>

      <div class="max-w-full">
        <div
          x-data="{
            title: 'Meta Tags',
            get content() { return inspectorData.metaTagsHtml },
          }"
        >
          <Panel />
        </div>
      </div>
    </div>
  )
}

function Panel() {
  return (
    <>
      <div class="text-fg2 text-sm font-bold p-2 pb-0" x-text="title" />
      <div
        class="h-full p-2 scrollbars"
        style={{ maxHeight: '47vh' }}
        x-html="content"
      />
    </>
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
    .divide-x > * + * {
      border-right-width: 0;
      border-left-width: 1px;
    }
    .divide-y > * + * {
      border-top-width: 1px;
      border-bottom-width: 0px;
    }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .gap-0\\.5 { gap: 0.125rem; }
    .gap-1 { gap: 0.25rem; }
    .gap-1\\.5 { gap: 0.375rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-2\\.5 { gap: 0.625rem; }
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
    .max-w-7xl { max-width: 80rem; }
    .mt-1 { margin-top: 0.25rem; }
    .object-cover { object-fit: cover; }
    .opacity-80 { opacity: 0.8; }
    .overflow-hidden { overflow: hidden; }
    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .pb-0 { padding-bottom: 0; }
    .px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
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

    [x-cloak] { display: none !important; }
  `
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
