import { codeToHtml } from 'shiki'

import { type FrameContext, type PreviousFrameContext } from '../types.js'
import {
  type Frame as FrameType,
  type FrameButton,
  type FrameInput,
} from './types.js'
import { type State } from './utils.js'

export type AppProps = {
  baseUrl: string
  frame: FrameType
  routes: readonly string[]
  state: State
}

export function App(props: AppProps) {
  const { baseUrl, frame, routes, state } = props
  return (
    <div class="items-center flex flex-col p-4">
      <div class="max-w-7xl flex flex-col gap-2 w-full">
        <Header />
        <Preview {...{ baseUrl, frame, routes, state }} />
      </div>
    </div>
  )
}

type PreviewProps = {
  baseUrl: string
  frame: FrameType
  routes: readonly string[]
  state: State
}

export function Preview(props: PreviewProps) {
  const { baseUrl, frame, routes, state } = props
  const hxTarget = 'preview'
  return (
    <form
      class="flex flex-col gap-2 w-full"
      hx-post="/dev"
      hx-swap="innerHTML"
      hx-target={`#${hxTarget}`}
      id={hxTarget}
    >
      <div class="flex flex-row gap-2" style={{ minHeight: '397px' }}>
        <Frame {...{ ...frame, baseUrl }} />
        <Navigator {...{ baseUrl, routes }} />
      </div>
      <Inspector {...{ frame, state }} />
    </form>
  )
}

type FrameProps = FrameType & {
  baseUrl: string
}

function Frame(props: FrameProps) {
  const {
    baseUrl,
    buttons,
    imageAspectRatio,
    imageUrl,
    input,
    postUrl,
    title,
  } = props
  return (
    <div class="w-full" style={{ maxWidth: '512px' }}>
      <div class="rounded-md relative w-full">
        <Img {...{ imageAspectRatio, imageUrl, title }} />

        <input name="action" type="hidden" value={postUrl} />

        {Boolean(input || buttons?.length) && (
          <div class="flex flex-col px-4 py-2 gap-2 rounded-bl-md rounded-br-md border-t-0 border">
            {input && <Input {...input} />}

            {buttons && (
              <div class={`grid gap-2.5 grid-cols-${buttons.length}`}>
                {buttons.map((button) => (
                  <Button {...button} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div class="text-xs mt-1 text-right">
        <a href={baseUrl}>{new URL(baseUrl).host}</a>
      </div>
    </div>
  )
}

type ImgProps = {
  imageAspectRatio: string
  imageUrl: string
  title?: string | undefined
}

function Img(props: ImgProps) {
  const { imageAspectRatio, imageUrl, title = 'Farcaster frame' } = props
  return (
    <img
      alt={title}
      src={imageUrl}
      class="rounded-t-lg border object-cover w-full"
      style={{
        aspectRatio: imageAspectRatio.replace(':', '/'),
        maxHeight: '526px',
      }}
    />
  )
}

type InputProps = FrameInput & { name?: string | undefined }

function Input(props: InputProps) {
  const { name = 'inputText', text } = props
  return (
    <input
      aria-label={text}
      class="rounded-sm border px-3 py-2.5 text-sm leading-snug w-full"
      name={name}
      placeholder={text}
    />
  )
}

type ButtonProps = FrameButton & { name?: string | undefined }

function Button(props: ButtonProps) {
  const { index, name = 'buttonIndex', title, type = 'post' } = props
  return (
    <button
      key={index}
      name={name}
      class="flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4"
      type="submit"
      value={index}
    >
      {type === 'mint' && mintIcon}
      <span>{title}</span>
      {type === 'post_redirect' && redirectIcon}
      {type === 'link' && linkIcon}
    </button>
  )
}

const linkIcon = (
  <svg
    aria-hidden="true"
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
    width="13"
    height="13"
    viewBox="0 0 28 28"
    fill="none"
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

type NavigatorProps = {
  baseUrl: string
  routes: readonly string[]
}

function Navigator(props: NavigatorProps) {
  const { baseUrl, routes } = props
  const url = new URL(baseUrl)
  return (
    <div class="flex flex-col gap-1">
      {routes.map((route) => (
        <a
          class="font-mono text-xs. whitespace-nowrap"
          key={route}
          href={route === '/' ? '/dev' : `${route}/dev`}
        >
          {route === '/' ? '/' : route}
          {url.pathname === route ? ' ▲' : ''}
        </a>
      ))}
    </div>
  )
}

type InspectorProps = {
  frame: FrameType
  state: {
    context: FrameContext
    previousContext?: PreviousFrameContext | undefined
  }
}

async function Inspector(props: InspectorProps) {
  const { frame, state } = props
  const {
    debug: {
      buttons: _b,
      imageAspectRatio: _ia,
      imageUrl: _iu,
      input: _in,
      postUrl: _pu,
      version: _v,
      htmlTags,
      ...debug
    } = {},
    title: _t,
    ...rest
  } = frame

  const themes = {
    light: 'vitesse-light',
    dark: 'vitesse-dark',
  }
  const [contextHtml, previousContextHtml, frameHtml, metaTagsHtml, debugHtml] =
    await Promise.all([
      codeToHtml(JSON.stringify(state.context, null, 2), {
        lang: 'json',
        themes,
      }),
      codeToHtml(JSON.stringify(state.previousContext, null, 2), {
        lang: 'json',
        themes,
      }),
      codeToHtml(JSON.stringify(rest, null, 2), {
        lang: 'json',
        themes,
      }),
      codeToHtml((htmlTags ?? []).join('\n'), {
        lang: 'html',
        themes,
      }),
      codeToHtml(JSON.stringify(debug, null, 2), {
        lang: 'json',
        themes,
      }),
    ])

  const headerClass = 'text-fg2 text-sm font-bold p-2 pb-0'
  return (
    <div class="flex flex-col gap-2 max-w-full">
      <div class="border rounded-lg grid grid-cols-2 max-w-full">
        <div>
          <div class={headerClass}>Current Context</div>
          <div
            dangerouslySetInnerHTML={{ __html: contextHtml }}
            class="p-2 scrollbars"
            style={{ maxHeight: '48vh' }}
          />
        </div>
        <div class="border-l">
          <div class={headerClass}>Previous Context</div>
          <div
            dangerouslySetInnerHTML={{ __html: previousContextHtml }}
            class="p-2 scrollbars"
            style={{ maxHeight: '48vh' }}
          />
        </div>
      </div>

      <div class="rounded-lg border max-w-full">
        <div class="flex flex-col gap-2 scrollbars">
          <div class="grid gap-2.5 grid-cols-2">
            <div>
              <div class={headerClass}>Frame</div>
              <div
                class="p-2"
                dangerouslySetInnerHTML={{ __html: frameHtml }}
              />
            </div>

            {debug && (
              <div>
                <div class={headerClass}>Debug</div>
                <div
                  class="p-2"
                  dangerouslySetInnerHTML={{ __html: debugHtml }}
                />
              </div>
            )}
          </div>

          {htmlTags && (
            <div>
              <div class={headerClass}>Meta Tags</div>
              <div
                class="p-2"
                dangerouslySetInnerHTML={{ __html: metaTagsHtml }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type HeaderProps = {}

function Header(_props: HeaderProps) {
  return (
    <header class="flex text-xs gap-2 w-full">
      <span>𝑭𝒂𝒓𝒄</span>
      <a href="TODO" target="_blank" rel="noreferrer">
        Docs
      </a>
      <a
        href="https://docs.farcaster.xyz/reference/frames/spec"
        target="_blank"
        rel="noreferrer"
      >
        Frames Spec
      </a>
      <a
        href="https://warpcast.com/~/developers/frames"
        target="_blank"
        rel="noreferrer"
      >
        Warpcast Frame Validator
      </a>
      <a href="https://github.com/wevm/farc" target="_blank" rel="noreferrer">
        GitHub
      </a>
    </header>
  )
}

export function DevStyles() {
  const styles = `
    :root {
      --bg: #181818;
      --bn: #262626;
      --br: #404040;
      --fg: rgba(255, 255, 255, 0.87);
      --fg2: rgba(255, 255, 255, 0.7);
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8f8f8;
        --bn: #F5F5F5;
        --br: #A3A3A3;
        --fg: #181818;
        --fg2: #454545;
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
    
    button {
      background: var(--bn);
    }

    input {
      background: var(--bg);
    }

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
      color: #9ca3af;
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
    .border-l { border-left-width: 1px; }
    .border-t-0 { border-top-width: 0; }
    .cursor-pointer { cursor: pointer; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: monospace; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-row { flex-direction: row; }
    .gap-1\\.5 { gap: 0.375rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-2\\.5 { gap: 0.625rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .h-10 { height: 2.5rem; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .leading-snug { line-height: 1.375; }
    .max-w-full { max-width: 100%; }
    .max-w-7xl { max-width: 80rem; }
    .mt-1 { margin-top: 0.25rem; }
    .object-cover { object-fit: cover; }
    .opacity-80 { opacity: 0.8; }
    .p-2 { padding: 0.5rem; }
    .p-4 { padding: 1rem; }
    .pb-0 { padding-bottom: 0; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .relative { position: relative; }
    .rounded-bl-md { border-bottom-left-radius: 0.375rem; }
    .rounded-br-md { border-bottom-right-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-sm { border-radius: 0.25rem; }
    .rounded-t-lg { border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem; }
    .text-right { text-align: right; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .w-full { width: 100%; }
    .whitespace-nowrap { white-space: nowrap; }

    .text-fg2 { color: var(--fg2); }

    .scrollbars {
      overflow: auto;
      scrollbar-color: var(--br) transparent;
      scrollbar-width: thin;
    }
  `
  return <style>{styles}</style>
}
