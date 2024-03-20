import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import { Data as DataType, Frame } from '../types/frog'
import { formatFileSize } from '../utils/format'

type DataProps = {
  data: DataType
  frame: Frame
}

export function Data(props: DataProps) {
  const { data, frame } = props

  const imageSize = 'imageSize' in data.metrics ? data.metrics.imageSize : null
  const imageType = frame.image.startsWith('data') ? 'dataUri' : 'http'
  const limits = {
    postUrl: 256,
    inputText: 32,
    state: 4_096,
    image: imageType === 'dataUri' ? 256 : 10_485_760,
  }
  const postUrlTooLong = (frame.postUrl?.length ?? 0) > limits.postUrl
  const inputTextTooLong = frame.input?.text
    ? frame.input.text.length > limits.inputText
    : false
  const stateTooLong = (frame.state?.length ?? 0) > limits.state
  const imageTooLarge = imageSize ? imageSize / 1024 > limits.image : false

  let hasState: boolean
  if (!frame.state) hasState = false
  else
    try {
      const decoded = decodeURIComponent(frame.state)
      const parsed = JSON.parse(decoded)
      hasState = Boolean(parsed.previousState)
    } catch {
      hasState = false
    }

  const validations = [
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
      message: `Image is ${formatFileSize(
        imageSize ?? 1024,
      )} and must be ${formatFileSize(limits.image)} or less.`,
    },
    {
      property: 'fc:frame:aspect_ratio',
      value: frame.imageAspectRatio,
      status: 'valid',
    },
    ...(frame.postUrl
      ? [
          {
            property: 'fc:frame:post_url',
            value: frame.postUrl,
            status: postUrlTooLong ? 'invalid' : 'valid',
            message: `Post URL is ${
              frame.postUrl.length ?? 0
            } bytes and must be ${limits.postUrl.toLocaleString()} bytes or less.`,
          },
        ]
      : []),
    ...(hasState
      ? [
          {
            property: 'fc:frame:state',
            value: frame.state,
            status: stateTooLong ? 'invalid' : 'valid',
            message: `State is ${
              frame.state?.length
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
    ...(frame.buttons ?? []).map((button) => ({
      property: `fc:frame:button:${button.index}`,
      value: `${button.title}${
        button.type !== 'post' ? `, ${button.type}` : ''
      }${button.target ? `, ${button.target}` : ''}`,
      status: 'valid',
    })),
  ]

  return (
    <div
      role="grid"
      aria-colcount={validations.length}
      className="bg-background-100 border rounded-md overflow-hidden"
      style={{ height: 'min-content' }}
    >
      <div className="sr-only" role="rowgroup">
        <div role="row">
          <span role="columnheader" aria-colindex={1}>
            Property
          </span>
          <span role="columnheader" aria-colindex={2}>
            Value
          </span>
          <span role="columnheader" aria-colindex={3}>
            Status
          </span>
        </div>
      </div>

      <div role="rowgroup" className="overflow-hidden divide-y">
        {validations.map((row) => (
          <div role="row" className="flex flex-col">
            <div
              className="items-center flex flex-row"
              style={{ fontSize: '0.8125rem' }}
            >
              <div
                className="text-gray-700 p-3 font-medium"
                style={{ minWidth: '10rem' }}
                role="gridcell"
                aria-colindex={1}
              >
                {row.property}
              </div>

              <div
                role="gridcell"
                aria-colindex={2}
                className="bg-transparent text-gray-1000 p-3 text-ellipsis overflow-hidden whitespace-nowrap font-mono text-xs"
                title={row.value}
              >
                {row.value}
              </div>

              <div
                role="gridcell"
                aria-colindex={3}
                className="flex p-3 gap-3"
                style={{
                  justifyContent: 'flex-end',
                  flex: '1',
                  marginBottom: '2px',
                }}
              >
                <span className="sr-only">{row.status}</span>
                {row.status === 'valid' && (
                  <CheckCircledIcon className="text-green-900" />
                )}
                {row.status === 'invalid' && (
                  <CrossCircledIcon className="text-red-900" />
                )}
              </div>
            </div>

            {row.status === 'invalid' && row.message && (
              <div
                className="p-3"
                style={{ paddingTop: '0', paddingLeft: '10.75rem' }}
              >
                <div className="text-red-900 text-xs rounded-lg leading-snug font-mono">
                  <span style={{ textWrap: 'balance' }}>{row.message}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
