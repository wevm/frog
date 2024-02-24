import { checkCircledIcon, crossCircledIcon } from './icons.js'

export function Data() {
  return (
    <div
      role="grid"
      aria-colcount="16"
      class="bg-background-100 border rounded-md overflow-hidden"
      style={{ height: 'min-content' }}
      x-data="{
        get validations() {
          const imageSize = data.metrics.imageSize
          const limits = {
            postUrl: 256,
            inputText: 32,
            state: 4_096,
            image: 256,
          }
          const postUrlTooLong = frame.postUrl.length > limits.postUrl
          const inputTextTooLong = frame.input?.text
            ? frame.input.text.length > limits.inputText
            : false
          const stateTooLong = frame.state.length > limits.state
          const imageTooLarge = imageSize ? imageSize / 1024 > limits.image : false

          return [
            {
              property: 'fc:frame',
              value: frame.version,
              status: frame.version === 'vNext' ? 'valid' : 'invalid',
              message: `Version is ${frame.version} and must be vNext.`,
            },
            {
              property: 'fc:frame:image',
              value: frame.imageUrl,
              status: imageTooLarge ? 'invalid' : 'valid',
              message: `Image is ${((imageSize ?? 1024) / 1024).toFixed(
                2,
              )} kilobytes and must be ${limits.image.toLocaleString()} kilobytes or less.`,
            },
            {
              property: 'fc:frame:aspect_ratio',
              value: frame.imageAspectRatio,
              status: 'valid',
            },
            {
              property: 'fc:frame:post_url',
              value: frame.postUrl,
              status: postUrlTooLong ? 'invalid' : 'valid',
              message: `Post URL is ${
                frame.postUrl.length
              } bytes and must be ${limits.postUrl.toLocaleString()} bytes or less.`,
            },
            ...(frame.state
              ? [
                  {
                    property: 'fc:frame:state',
                    value: decodeURIComponent(frame.state),
                    status: stateTooLong ? 'invalid' : 'valid',
                    message: `State is ${
                      frame.state.length
                    } bytes and must be ${limits.state.toLocaleString()} bytes or less.`,
                  },
                ]
              : []),
            {
              property: 'og:image',
              value: frame.image,
              status: 'valid',
            },
            ...(frame.input?.text
              ? [
                  {
                    property: 'fc:frame:input:text',
                    value: frame.input.text,
                    status: inputTextTooLong ? 'invalid' : 'valid',
                    message: `Input text is ${
                      frame.input.text.length
                    } bytes and must be ${limits.inputText.toLocaleString()} bytes or less. Keep in mind non-ASCII characters, like emoji, can take up more than 1 byte of space.`,
                  },
                ]
              : []),
            ...(frame.buttons.map((button) => ({
                property: `fc:frame:button:${button.index}`,
                value: `${button.title}${button.type !== 'post' ? `, ${button.type}` : ''}${
                  button.target ? `, ${button.target}` : ''
                }`,
                status: 'valid',
              }))),
          ]
        },
      }"
    >
      <div class="sr-only" role="rowgroup">
        <div role="row">
          <span role="columnheader" aria-colindex="1">
            Property
          </span>
          <span role="columnheader" aria-colindex="2">
            Value
          </span>
          <span role="columnheader" aria-colindex="3">
            Status
          </span>
        </div>
      </div>

      <div role="rowgroup" class="overflow-hidden divide-y">
        <template x-for="(row, index) in validations">
          <div role="row" class="flex flex-col">
            <div
              class="items-center flex flex-row"
              style={{ fontSize: '0.8125rem' }}
            >
              <div
                class="text-gray-700 p-3 font-medium"
                x-text="row.property"
                style={{ minWidth: '10rem' }}
                role="gridcell"
                aria-colindex="1"
              />
              <div
                role="gridcell"
                aria-colindex="2"
                class="bg-transparent text-gray-1000 p-3 text-ellipsis overflow-hidden whitespace-nowrap"
                x-text="row.value"
              />
              <div
                role="gridcell"
                aria-colindex="3"
                class="flex p-3"
                style={{
                  justifyContent: 'flex-end',
                  flex: '1',
                  marginBottom: '2px',
                }}
              >
                <span class="sr-only" x-text="row.status" />
                <template x-if="row.status === 'valid'">
                  <span class="text-green-900">{checkCircledIcon}</span>
                </template>
                <template x-if="row.status === 'invalid'">
                  <span class="text-red-900">{crossCircledIcon}</span>
                </template>
              </div>
            </div>

            <template x-if="row.status === 'invalid' && row.message">
              <div class="p-3" style={{ paddingTop: '0' }}>
                <div class="border border-red-100 text-red-900 text-xs rounded-lg p-3">
                  <span x-html="row.message" />
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  )
}
