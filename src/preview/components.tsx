import { codeToHtml } from 'shiki'

import type { FrameContext, PreviousFrameContext } from '../types.js'
import type { Frame as FrameType, FrameButton, FrameInput } from './types.js'

export type PreviewProps = {
  baseUrl: string
  frame: FrameType
  state: {
    context: FrameContext
    previousContext?: PreviousFrameContext | undefined
  }
}

export function Preview(props: PreviewProps) {
  const { baseUrl, frame, state } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', fontSize: '0.75rem', gap: '0.5rem' }}>
        <span>𝑭𝒂𝒓𝒄 ▶︎</span>
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
      </div>

      <Frame {...{ ...frame, baseUrl }} />
      <Devtools {...{ frame, state }} />
    </div>
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
    <div style={{ maxWidth: '512px', width: '100%' }}>
      <form
        action="preview"
        method="post"
        style={{ borderRadius: '0.5rem', position: 'relative', width: '100%' }}
      >
        <Img
          {...{
            imageAspectRatio,
            imageUrl,
            title,
            url: baseUrl,
          }}
        />

        <input name="action" type="hidden" value={postUrl} />

        {Boolean(input || buttons?.length) && (
          <div
            style={{
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem',
              borderTopWidth: '0 !important',
              borderWidth: '1px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
            }}
          >
            {input && <Input {...input} />}

            {buttons && (
              <div
                style={{
                  display: 'grid',
                  gap: '10px',
                  gridTemplateColumns: `repeat(${buttons.length}, minmax(0,1fr))`,
                }}
              >
                {buttons.map((button) => (
                  <Button {...button} />
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

type ImgProps = {
  imageAspectRatio: string
  imageUrl: string
  title?: string | undefined
  url: string
}

function Img(props: ImgProps) {
  const { imageAspectRatio, imageUrl, title = 'Farcaster frame', url } = props
  return (
    <div style={{ position: 'relative' }}>
      <img
        alt={title}
        src={imageUrl}
        style={{
          aspectRatio: imageAspectRatio.replace(':', '/'),
          borderTopLeftRadius: '0.5rem',
          borderTopRightRadius: '0.5rem',
          borderWidth: '1px',
          maxHeight: '526px',
          objectFit: 'cover',
          width: '100%',
        }}
      />
      <div
        style={{
          background: '#00000080',
          borderRadius: '0.25rem',
          bottom: 0,
          color: 'white',
          fontSize: '0.875rem',
          marginBottom: '0.5rem',
          marginRight: '1rem',
          paddingBottom: '0.125rem',
          paddingLeft: '0.5rem',
          paddingRight: '0.5rem',
          paddingTop: '0.125rem',
          position: 'absolute',
          right: 0,
        }}
      >
        {new URL(url).host}
      </div>
    </div>
  )
}

type InputProps = FrameInput & { name?: string | undefined }

function Input(props: InputProps) {
  const { name = 'inputText', text } = props
  return (
    <input
      aria-label={text}
      name={name}
      placeholder={text}
      style={{
        borderRadius: '0.25rem',
        borderWidth: '1px',
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
        paddingBottom: '9px',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '10px',
        width: '100%',
      }}
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
      style={{
        alignItems: 'center',
        borderRadius: '0.5rem',
        borderWidth: '1px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'row',
        fontSize: '0.875rem',
        gap: '5px',
        height: '2.5rem',
        justifyContent: 'center',
        paddingBottom: '0.5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        paddingTop: '0.5rem',
      }}
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

type DevtoolsProps = {
  frame: FrameType
  state: {
    context: FrameContext
    previousContext?: PreviousFrameContext | undefined
  }
}

async function Devtools(props: DevtoolsProps) {
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

  const headerStyle = {
    fontFamily: 'sans-serif',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  }

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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          borderWidth: '1px',
          borderRadius: '0.5rem',
          display: 'grid',
          gap: '10px',
          gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
          maxWidth: '1200px',
        }}
      >
        <pre
          style={{
            fontFamily: 'monospace',
            padding: '0.5rem',
          }}
        >
          <div style={headerStyle}>Current</div>
          <div
            dangerouslySetInnerHTML={{ __html: contextHtml }}
            style={{
              maxHeight: '48vh',
              overflow: 'auto',
            }}
          />
        </pre>
        <pre
          style={{
            fontFamily: 'monospace',
            borderLeftWidth: '1px',
            padding: '0.5rem',
          }}
        >
          <div style={headerStyle}>Previous</div>
          <div
            dangerouslySetInnerHTML={{ __html: previousContextHtml }}
            style={{ maxHeight: '48vh', overflow: 'auto' }}
          />
        </pre>
      </div>

      <div
        style={{
          borderRadius: '0.5rem',
          borderWidth: '1px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '1200px',
          overflow: 'auto',
          padding: '0.5rem',
        }}
      >
        <pre style={{ fontFamily: 'monospace' }}>
          <div style={headerStyle}>Frame</div>
          <div dangerouslySetInnerHTML={{ __html: frameHtml }} />
        </pre>

        {htmlTags && (
          <pre style={{ fontFamily: 'monospace' }}>
            <div style={headerStyle}>Meta Tags</div>
            <div dangerouslySetInnerHTML={{ __html: metaTagsHtml }} />
          </pre>
        )}

        {debug && (
          <pre style={{ fontFamily: 'monospace' }}>
            <div style={headerStyle}>Debug</div>
            <div dangerouslySetInnerHTML={{ __html: debugHtml }} />
          </pre>
        )}
      </div>
    </div>
  )
}

export function previewStyles() {
  return `
    :root {
      --bg: #181818;
      --bn: #262626;
      --br: #404040;
      --fg: rgba(255, 255, 255, 0.87);
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8f8f8;
        --bn: #F5F5F5;
        --br: #A3A3A3;
        --fg: #181818;
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
      text-rendering: optimizeLegibility;

      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
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
      --shiki-light-bg: transparent !important;
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
  `
}
