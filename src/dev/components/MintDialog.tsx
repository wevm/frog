import { cross1Icon, externalLinkIcon } from './icons.js'

export function MintDialog() {
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
      >
        <div
          class="bg-background-100 flex flex-col gap-4 scrollbars p-6 border-gray-alpha-100 border"
          style={{ borderRadius: '1.5rem', paddingTop: '2rem' }}
          {...{
            '@click.outside': 'open = false',
            '@keyup.escape': 'open = false',
            'x-trap.noscroll': 'open',
          }}
        >
          <button
            type="button"
            class="text-gray-800 bg-gray-100 rounded-full flex items-center justify-center"
            style={{
              position: 'absolute',
              height: '2rem',
              width: '2rem',
              top: '1.25rem',
              right: '1.25rem',
            }}
            x-on:click="open = false"
          >
            <span class="sr-only">Close</span>
            {cross1Icon}
          </button>

          <h1 class="sr-only text-base font-bold text-gray-1000 text-center">
            Mint
          </h1>

          <div class="flex flex-col gap-2">
            <img
              class="border object-cover w-full rounded-md"
              style={{
                maxHeight: '430.5px',
              }}
              {...{
                ':alt': `data.frame.title ?? 'Farcaster frame'`,
                ':src': 'data.frame.imageUrl',
                ':style': `{
                  aspectRatio: data.frame.imageAspectRatio.replace(':', '/'),
                }`,
              }}
            />

            <div class="flex flex-row justify-between text-sm text-gray-1000 px-1 font-medium">
              <div>BasePaint Day #191</div>
              <div class="flex flex-row gap-1 items-center">
                <div
                  class="bg-gray-500 rounded-full"
                  style={{ height: '15px', width: '15px' }}
                />
                <div>Base</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="items-center justify-center gap-1 flex bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1"
          >
            Mint
            <div class="text-gray-900">{externalLinkIcon}</div>
          </button>
        </div>
      </div>
    </template>
  )
}
