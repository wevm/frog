import { type Frame as FrameType, type State } from '../types.js'
import { Data } from './Data.js'
import { Frame } from './Frame.js'
import { Metrics } from './Metrics.js'
import { Navigator } from './Navigator.js'
import { Tabs } from './Tabs.js'
import { Timeline } from './Timeline.js'

export type PreviewProps = {
  frame: FrameType
  request:
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
          error?: string | undefined
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
          error?: string | undefined
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
          location?: string
          error?: string | undefined
        }
        timestamp: number
        url: string
      }
  routes: readonly string[]
  state: State
  tools: {
    contextHtml: string
    metaTagsHtml: string
  }
}

export function Preview(props: PreviewProps) {
  return (
    <div
      x-data={`{
        init() {
          if (!this.logs || this.logs.length === 0) this.logs = [${JSON.stringify(
            props,
          )}]

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
        },
        data: {
          frame: ${JSON.stringify(props.frame)},
          request: ${JSON.stringify(props.request)},
          routes: ${JSON.stringify(props.routes)},
          state: ${JSON.stringify(props.state)},
          tools: ${JSON.stringify(props.tools)},
        },

        history: [],
        id: -1,
        inputText: '',
        logs: [],
        selectedLogIndex: -1,
        tab: $persist('request'),
        user: $persist(null),

        async getFrame(url = this.data.request.url, replaceLogs = false) {
          const response = await fetch(url + '/dev/frame', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await response.json()
          this.logs = replaceLogs ? [json] : [...this.logs, json]
          this.selectedLogIndex = -1
          return json
        },
        async postFrameAction(body) {
          const response = await fetch(this.data.request.url + '/dev/frame/action', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await response.json()
          this.logs = [...this.logs, json]
          this.selectedLogIndex = -1
          return json
        },
        async postFrameRedirect(body) {
          const response = await fetch(this.data.request.url + '/dev/frame/redirect', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await response.json()
          this.logs = [...this.logs, { ...this.logs.at(-1), request: json }]
          this.selectedLogIndex = -1
          return json
        },
        async fetchAuthCode() {
          const response = await fetch(this.data.request.url + '/dev/frame/auth/code', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await response.json()
          return json
        },
        async fetchAuthStatus(token) {
          const response = await fetch(this.data.request.url + '/dev/frame/auth/status/' + token, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const json = await response.json()
          return json
        },
        async logout(body) {
          const response = await fetch(this.data.request.url + '/dev/frame/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await response.json()
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
        }
      }`}
      class="flex flex-col md:flex-row w-full md:h-full pl-6 pr-6 md:pr-0 gap-4 md:gap-6 pb-6 md:pb-0"
      style={{
        maxWidth: '1512px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <div
        class="bg-background-200 border rounded-md overflow-hidden order-1 md:order-0 md:mt-6 h-sidebar md:h-sidebar md:max-h-sidebar md:min-w-sidebar lg:min-w-sidebar"
        x-effect="
          if (history.length === 0) return

          const state = {
            history,
            id,
            logs,
            selectedLogIndex,
          }
          const compressed = LZString.compressToBase64(JSON.stringify(state))
            .replace(/\+/g, '-') // Convert '+' to '-'
            .replace(/\//g, '_') // Convert '/' to '_'
            .replace(/=+$/, '') // Remove ending '='

          // const url = new URL(window.location.href)
          // url.searchParams.set('state', compressed)
          // window.history.pushState({}, '', url);
        "
      >
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
