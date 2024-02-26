import { type FrameContext } from '../../types.js'
import { type Frame as FrameType, type RequestBody } from '../types.js'
import { Data } from './Data.js'
import { Frame } from './Frame.js'
import { Metrics } from './Metrics.js'
import { Navigator } from './Navigator.js'
import { QuickLinks } from './QuickLinks.js'
import { Tabs } from './Tabs.js'
import { Timeline } from './Timeline.js'

export type PreviewProps = {
  data: Data
  routes: readonly string[]
}

type Data = {
  id: string
  metrics: {
    speed: number
  }
  response: {
    success: boolean
    status: number
    statusText: string
    error?: string | undefined
  }
  timestamp: number
} & (
  | {
      type: 'initial'
      method: 'get'
      context: FrameContext
      frame: FrameType
      metrics: {
        htmlSize: number
        imageSize: number
      }
      url: string
    }
  | {
      type: 'action'
      method: 'post'
      body: RequestBody
      context: FrameContext
      frame: FrameType
      metrics: {
        htmlSize: number
        imageSize: number
      }
    }
  | {
      type: 'redirect'
      method: 'post'
      body: RequestBody
      response: {
        location?: string
      }
    }
)

export function Preview(props: PreviewProps) {
  return (
    <div
      x-data={`{
        init() {
          try {
            const userCookie = this.getCookie('user')
            const user = userCookie ? JSON.parse(decodeURIComponent(userCookie)) : {}
            if (user.token)
              this.fetchAuthStatus(user.token)
                .then((data) => {
                  if (data.state !== 'completed') return
                  const { state: _, ...rest } = data
                  this.user = rest
                })
                .catch(console.error)
          } catch (e) {
            console.log({ e })
          }

          $watch('dataKey', (dataKey) => this.saveState({ dataKey }))
          $watch('dataMap', (dataMap) => this.saveState({ dataMap }))
          $watch('logIndex', (logIndex) => this.saveState({ logIndex }))
          $watch('logs', (logs) => this.saveState({ logs }))
          $watch('stackIndex', (stackIndex) => this.saveState({ stackIndex }))
          $watch('stack', (stack) => this.saveState({ stack }))

          this.restoreState()
        },
        get data() {
          return this.dataMap[this.dataKey]
        },
        routes: ${JSON.stringify(props.routes)},

        get frame() {
          const frame = this.data.frame
          const contextString = this.toSearchParams(this.data.context).toString()
          return {
            ...frame,
            image: frame.image.replace('_frog_image', contextString),
            imageUrl: frame.imageUrl.replace('_frog_imageUrl', contextString),
          }
        },

        dataKey: '${props.data.id}',
        dataMap: { '${props.data.id}': ${JSON.stringify(props.data)} },
        inputText: '',
        logIndex: -1,
        logs: ['${props.data.id}'],
        stackIndex: 0,
        stack: ['${props.data.id}'],
        tab: $persist('request'),
        user: $persist(null),

        async getFrame(url, replaceLogs = false) {
          const json = await fetch(this.parsePath(url) + '/dev/frame', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())

          const { data, routes } = json
          const id = data.id
          this.dataMap[id] = data
          this.routes = routes

          this.logIndex = -1
          this.logs = replaceLogs ? [id] : [...this.logs, id]

          return json.data
        },
        async postFrameAction(body) {
          const url = this.parsePath(body.url)
          const json = await fetch(url + '/dev/frame/action', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())

          const { data, routes } = json
          const id = data.id
          this.dataMap[id] = data
          this.routes = routes

          this.logIndex = -1
          this.logs = [...this.logs, id]

          return data
        },
        async postFrameRedirect(body) {
          const url = this.parsePath(body.url)
          const json = await fetch(url + '/dev/frame/redirect', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())

          const previousData = this.dataMap[this.logs.at(-1)]
          const data = {
            context: previousData.context,
            frame: previousData.frame,
            ...json,
          }
          const id = json.id
          this.dataMap[id] = data
         
          this.logIndex = -1
          this.logs = [...this.logs, id]

          return data
        },
        async fetchAuthCode() {
          const url = this.parsePath(this.data.body ? this.data.body.url : this.data.url)
          const json = await fetch(url + '/dev/frame/auth/code', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())
          return json
        },
        async fetchAuthStatus(token) {
          const url = this.parsePath(this.data.body ? this.data.body.url : this.data.url)
          const json = await fetch(url + '/dev/frame/auth/status/' + token, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then((response) => response.json())
          return json
        },
        async logout(body) {
          const url = this.parsePath(this.data.body ? this.data.body.url : this.data.url)
          const json = await fetch(url + '/dev/frame/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())
          this.user = null
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
        },

        cache: {},
        async getCodeHtml(code, lang) {
          const key = lang + "_" + code
          if (this.cache[key]) return this.cache[key]

          const theme = createCssVariablesTheme({
            name: 'css-variables',
            variablePrefix: '--shiki-',
            variableDefaults: {},
            fontStyle: true,
          })

          const highlighter = await getHighlighter({
            langs: ['html', 'json'],
            themes: [theme],
          })

          const html = await highlighter.codeToHtml(code, {
            lang,
            theme: 'css-variables',
          })
          this.cache[key] = html
          return html
        },

        saveState(state) {
          if (this.logs.length === 1) return

          const nextState = {
            dataKey: this.dataKey,
            dataMap: this.dataMap,
            logs: this.logs,
            logIndex: this.logIndex,
            stack: this.stack,
            stackIndex: this.stackIndex,
            ...state,
          }
          const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(nextState))
          window.history.replaceState(null, null, '#state/' + compressed);
        },
        restoreState() {
          if (!location.hash.startsWith('#state')) return
          const state = location.hash.replace('#state/', '').trim()

          try {
            let restored = LZString.decompressFromEncodedURIComponent(state)
            // Fallback incase there is an extra level of decoding:
            // https://gitter.im/Microsoft/TypeScript?at=5dc478ab9c39821509ff189a
            if (!restored) restored = LZString.decompressFromEncodedURIComponent(decodeURIComponent(state))
            restored = JSON.parse(restored)

            this.dataKey = restored.dataKey
            this.dataMap = restored.dataMap
            this.logs = restored.logs
            this.logIndex = restored.logIndex
            this.stack = restored.stack
            this.stackIndex = restored.stackIndex
          } catch (error) {
            console.log('failed to restore state:', error.message)
            history.replaceState(null, null, location.pathname);
          }
        },
        getCookie(name) {
          const cookieArr = document.cookie.split(";")
          for (let i = 0; i < cookieArr.length; i++) {
            var cookie = cookieArr[i]
              
            while (cookie.charAt(0) == " ") {
              cookie = cookie.substring(1, cookie.length)
            }
              
            if (cookie.indexOf(name) == 0)
              return cookie.substring(name.length + 1, cookie.length)
          }
          return null
        },
        parsePath(path_) {
          let path = path_.split('?')[0]
          if (path.endsWith('/')) path = path.slice(0, -1)
          return path
        },
        toSearchParams(object) {
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(object)) {
            const encoded = (() => {
              if (typeof value === 'string') return encodeURIComponent(value)
              if (typeof value === 'number') return value.toString()
              if (typeof value === 'boolean') return value.toString()
              if (typeof value === 'object' && value !== null) {
                return encodeURIComponent(
                  Array.isArray(value)
                    ? '#A_' + value.join(',')
                    : '#O_' + JSON.stringify(value),
                )
              }
              return undefined
            })()
            if (encoded) params.set(key, encoded)
          }
          return params
        },
      }`}
      class="flex flex-col container md:grid md:container gap-4 md:gap-6"
      style={{
        maxWidth: '1512px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <aside
        class="order-1 space-y-4 scrollbars md:min-w-sidebar lg:min-w-sidebar w-full"
        style={{
          position: 'sticky',
          top: '1.5rem',
          alignSelf: 'start',
        }}
      >
        <Timeline />
        <QuickLinks />
      </aside>

      <main class="flex flex-col md:h-full w-full gap-4 order-0 md:order-1 overflow-hidden">
        <Navigator />

        <div class="flex flex-col lg:flex-row gap-4">
          <div class="flex flex-col gap-4">
            <Metrics />
            <Frame />
          </div>
          <Data />
        </div>

        <Tabs />
      </main>
    </div>
  )
}
