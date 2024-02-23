import { cross1Icon } from './icons.js'

export function AuthDialog() {
  return (
    <template x-teleport="body">
      <div
        class="flex items-center justify-center p-6"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          position: 'fixed',
          inset: '0',
        }}
        x-show="open"
        x-data="{
          code: undefined,
          copied: false,
          timedOut: false,
          url: undefined,

          async auth() {
            this.timedOut = false
            const data = await fetchAuthCode()
            this.code = data.code
            this.token = data.token
            this.url = data.url

            const timeout = 300_000
            const interval = 1_500
            const deadline = Date.now() + timeout

            while (Date.now() < deadline) {
              // Stop polling if dialog is closed
              if (!this.open) return

              const data = await fetchAuthStatus(token)
              if (data.state === 'completed') {
                const { state: _, ...rest } = data
                user = rest
                this.open = false
                return
              }

              await new Promise((resolve) => setTimeout(resolve, interval))
            }

            this.timedOut = true
          },
        }"
        x-effect="
          if (!open) return
          auth()
        "
      >
        <div
          class="bg-background-100 relative flex flex-col gap-4 scrollbars p-6 border-gray-alpha-100 border"
          style={{ borderRadius: '1.5rem' }}
          {...{
            '@click.outside': 'open = false',
            '@keyup.escape': 'open = false',
            'x-trap.noscroll': 'open',
          }}
        >
          <button
            type="button"
            class="bg-transparent text-gray-800 hover:bg-gray-100 rounded-full flex items-center justify-center"
            style={{
              position: 'absolute',
              height: '2rem',
              width: '2rem',
              top: '1.25rem',
              right: '1rem',
            }}
            x-on:click="open = false"
          >
            <span class="sr-only">Close</span>
            {cross1Icon}
          </button>
          <h1 class="text-base font-bold text-gray-1000 text-center">
            Scan with Phone
          </h1>
          <p
            class="text-sm text-gray-700 leading-snug text-center"
            style={{ maxWidth: '17rem' }}
          >
            Scan with your phone's camera to sign in with your Farcaster
            account.
          </p>

          <div class="relative">
            <div
              x-html={`code ?? '<div class="border border-gray-100" style="border-radius:1.5rem;height:276px;width:276px;" />'`}
              {...{ ':style': "timedOut && { opacity: '0.1' }" }}
            />
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              class="flex items-center justify-center flex-col gap-4"
              style={{
                position: 'absolute',
                inset: '0',
              }}
              x-show="timedOut"
            >
              <div class="font-medium text-gray-1000">Code timed out</div>
              <button
                class="bg-gray-1000 border border-gray-200 py-2 px-4 text-gray-100 font-medium text-sm rounded-md"
                type="button"
                x-on:click="auth()"
              >
                Refresh
              </button>
            </div>
          </div>

          <button
            type="button"
            class="bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1"
            x-on:click="
              if (copied) return
              navigator.clipboard.writeText(url)
              copied = true
              setTimeout(() => copied = false, 1_000)
            "
            x-text="copied ? 'Copied!' : 'Copy to Clipboard'"
            {...{
              ':disabled': 'timedOut',
              ':style': "timedOut && { opacity: '0.4' }",
            }}
          />
        </div>
      </div>
    </template>
  )
}
