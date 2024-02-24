import { type FrameContext } from '../../types.js'
import { type Frame as FrameType } from '../types.js'
import { Data } from './Data.js'
import { Frame } from './Frame.js'
import { Metrics } from './Metrics.js'
import { Navigator } from './Navigator.js'
import { Tabs } from './Tabs.js'
import { Timeline } from './Timeline.js'

export type PreviewProps = {
  data: {
    context: FrameContext
    frame: FrameType
    request:
      | {
          type: 'initial' | 'action'
          method: 'get' | 'post'
          metrics: {
            htmlSize: number
            imageSize: number
            speed: number
          }
          response: {
            success: boolean
            status: number
            statusText: string
            error?: string | undefined
          }
          timestamp: number
          url: string
        }
      | {
          type: 'redirect'
          method: 'post'
          metrics: {
            speed: number
          }
          response: {
            success: boolean
            status: number
            statusText: string
            location?: string
            error?: string | undefined
          }
          timestamp: number
          url: string
        }
  }
  routes: readonly string[]
}

export function Preview(props: PreviewProps) {
  return (
    <div
      x-data={`{
        init() {
          if (!this.logs || this.logs.length === 0)
            this.logs = [${JSON.stringify(props.data)}]

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

          $watch('logIndex', (logIndex) => this.saveState({ logIndex }))
          $watch('logs', (logs) => this.saveState({ logs }))
          $watch('stackIndex', (stackIndex) => this.saveState({ stackIndex }))
          $watch('stack', (stack) => this.saveState({ stack }))

          this.restoreState()
        },
        data: ${JSON.stringify(props.data)},
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

        inputText: '',
        logIndex: -1,
        logs: [],
        stackIndex: -1,
        stack: [],
        user: $persist(null),

        async getFrame(url = this.data.request.url, replaceLogs = false) {
          const json = await fetch(this.parsePath(url) + '/dev/frame', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())
          console.log('getFrame', json.data)

          this.logs = replaceLogs ? [json.data] : [...this.logs, json.data]
          this.routes = json.routes
          this.logIndex = -1

          return json.data
        },
        async postFrameAction(body) {
          const url = this.parsePath(this.data.request.url)
          const json = await fetch(url + '/dev/frame/action', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())
          console.log('postFrameAction', json.data)

          this.logs = [...this.logs, json.data]
          this.routes = json.routes
          this.logIndex = -1

          return json.data
        },
        async postFrameRedirect(body) {
          const url = this.parsePath(this.data.request.url)
          const json = await fetch(url + '/dev/frame/redirect', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())

          this.logs = [...this.logs, { ...this.logs.at(-1), request: json }]
          this.logIndex = -1

          return json
        },
        async fetchAuthCode() {
          const url = this.parsePath(this.data.request.url)
          const json = await fetch(url + '/dev/frame/auth/code', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }).then((response) => response.json())
          return json
        },
        async fetchAuthStatus(token) {
          const url = this.parsePath(this.data.request.url)
          const json = await fetch(url + '/dev/frame/auth/status/' + token, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then((response) => response.json())
          return json
        },
        async logout(body) {
          const url = this.parsePath(this.data.request.url)
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

        saveState(state) {
          if (this.logs.length === 1) return

          const nextState = {
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

            this.logs = restored.logs
            this.logIndex = restored.logIndex
            this.stack = restored.stack
            this.stackIndex = restored.stackIndex

            this.data = restored.logIndex > -1 ? restored.logs[restored.logIndex] : restored.logs.at(-1)
          } catch (error) {
            console.log('Failed to restore state', error.message)
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
      class="flex flex-col md:flex-row w-full md:h-full pl-6 pr-6 md:pr-0 gap-4 md:gap-6 pb-6 md:pb-0"
      style={{
        maxWidth: '1512px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div class="bg-background-200 border rounded-md overflow-hidden order-1 md:order-0 md:mt-6 h-sidebar md:h-sidebar md:max-h-sidebar md:min-w-sidebar lg:min-w-sidebar">
        <div class="bg-background-100 scrollbars h-full">
          <Timeline />
        </div>
      </div>

      <div
        class="flex flex-col md:scrollbars md:h-full w-full gap-4 pt-6 md:pb-6 pr-0 md:pr-6 order-0 md:order-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        <Navigator />

        <div class="flex flex-col lg:flex-row gap-4">
          <div class="flex flex-col gap-4">
            <Metrics />
            <div class="lg:min-w-frame lg:min-h-frame">
              <Frame />
            </div>
          </div>
          <Data />
        </div>

        <Tabs />
      </div>
    </div>
  )
}
