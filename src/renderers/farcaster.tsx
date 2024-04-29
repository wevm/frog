import { type FrameRenderer } from '../types/frame.js'
import { parseIntents } from '../utils/parseIntents.js'

export function farcaster(): FrameRenderer {
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
    })
    return (
      <>
        <meta property="fc:frame" content="vNext" />
        <meta
          property="fc:frame:image:aspect_ratio"
          content={imageAspectRatio}
        />
        <meta property="fc:frame:image" content={imageUrl} />
        <meta
          property="fc:frame:post_url"
          content={
            context.status === 'initial'
              ? `${postUrl}?${nextFrameStateSearch.toString()}`
              : postUrl
          }
        />
        {context.status !== 'initial' && (
          <meta property="fc:frame:state" content={nextFrameStateMeta} />
        )}
        {parsedIntents}
      </>
    )
  }
}
