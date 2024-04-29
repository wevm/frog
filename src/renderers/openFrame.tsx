import { type FrameRenderer } from '../types/frame.js'
import { parseIntents } from '../utils/parseIntents.js'

export type OpenFrameRendererOptions = {
  accepts: { protocolIdentifier: string; value: string }[]
}
export function openFrame(options: OpenFrameRendererOptions): FrameRenderer {
  const { accepts } = options
  return (parameters) => {
    const {
      baseUrl,
      context,
      initialBaseUrl,
      intents,
      imageAspectRatio,
      imageUrl,
      nextFrameStateMeta,
      nextFrameStateSearch,
      postUrl,
    } = parameters

    const parsedIntents = parseIntents(intents, {
      initialBaseUrl,
      baseUrl,
      search:
        context.status === 'initial'
          ? nextFrameStateSearch.toString()
          : undefined,
      prefix: 'of',
    })

    const parserProtocolIdentifiers = accepts.map(
      ({ protocolIdentifier, value }) => (
        <meta property={`of:accepts:${protocolIdentifier}`} content={value} />
      ),
    )
    return (
      <>
        <meta property="of:version" content="vNext" />
        <meta property="of:image:aspect_ratio" content={imageAspectRatio} />
        <meta property="of:image" content={imageUrl} />
        <meta
          property="of:post_url"
          content={
            context.status === 'initial'
              ? `${postUrl}?${nextFrameStateSearch.toString()}`
              : postUrl
          }
        />
        {context.status !== 'initial' && (
          <meta property="of:state" content={nextFrameStateMeta} />
        )}
        {parsedIntents}
        {parserProtocolIdentifiers}
      </>
    )
  }
}
