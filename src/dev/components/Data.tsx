import { checkCircledIcon, crossCircledIcon } from './icons.js'

export function Data() {
  return (
    <div
      class="bg-background-100 border rounded-md overflow-hidden divide-y"
      style={{ height: 'min-content' }}
      x-data="{
        get rows() {
          return [
            { property: 'fc:frame', value: data.frame.version, status: 'valid' },
            { property: 'fc:frame:image', value: data.frame.imageUrl, status: 'valid' },
            { property: 'fc:frame:aspect_ratio', value: data.frame.imageAspectRatio, status: 'valid' },
            {
              property: 'fc:frame:post_url',
              value: data.frame.postUrl,
              status: data.frame.debug.postUrlTooLong ? 'error' : 'valid',
            },
            {
              property: 'fc:frame:state',
              value: data.frame.state,
              status: data.frame.debug.stateTooLong ? 'error' : 'valid',
            },
            {
              property: 'og:image',
              value: data.frame.image || 'Not Provided',
              status: data.frame.image ? 'valid' : 'error',
            },
            {
              property: 'og:title',
              value: data.frame.title || 'Not Provided',
              status: data.frame.title ? 'valid' : 'error',
            },
            ...(data.frame.input?.text ? [{
              property: 'fc:frame:input:text',
              value: data.frame.input.text,
              status: data.frame.debug.inputTextTooLong ? 'error' : 'valid',
              message: `Input text is ${data.frame.input.text.length} bytes and must be 32 bytes or less. Non-ASCII characters, like emoji, can take up more than 1 byte of space.`
            }] : []),
            ...(data.frame.buttons.map(button => ({
              property: `fc:frame:button:${button.index}`,
              value: `
                <span>${button.title}</span>${button.type ? `, <span>${button.type}</span>` : ''}${button.target ? `, <span>${button.target}</span>` : ''}
              `,
              status: 'valid',
            }))),
          ]
        },
      }"
    >
      <template x-for="(row, index) in rows">
        <div class="flex flex-col">
          <div
            class="items-center flex flex-row"
            style={{ fontSize: '0.8125rem' }}
          >
            <div
              class="text-gray-700 p-3 font-medium"
              x-text="row.property"
              style={{ minWidth: '10rem' }}
            />
            <div
              class="text-gray-1000 p-3 text-ellipsis overflow-hidden whitespace-nowrap"
              x-html="row.value"
            />
            <div
              class="flex p-3"
              style={{
                justifyContent: 'flex-end',
                flex: '1',
                marginBottom: '1px',
              }}
            >
              <template x-if="row.status === 'valid'">
                <span class="text-green-600">{checkCircledIcon}</span>
              </template>
              <template x-if="row.status === 'error'">
                <span class="text-red-600">{crossCircledIcon}</span>
              </template>
            </div>
          </div>

          <template x-if="row.status === 'error' && row.message">
            <div class="p-3" style={{ paddingTop: '0' }}>
              <div class="bg-red-100 text-gray-900 text-xs rounded-sm p-3">
                <span x-html="row.message" />
              </div>
            </div>
          </template>
        </div>
      </template>

      {/* TODO: Add property errors */}
      {/* <div> */}
      {/*   <div x-text="JSON.stringify(frame.debug)" /> */}
      {/* </div> */}
    </div>
  )
}
