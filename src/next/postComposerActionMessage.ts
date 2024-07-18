export type ComposerActionMessage = {
  type: 'createCast'
  data: {
    cast: {
      channelKey?: string | undefined
      embeds: string[]
      parent?: string | undefined
      text: string
    }
  }
}

/**
 * Posts Composer Action Message to `window.parent`.
 */
export function postComposerActionMessage(message: ComposerActionMessage) {
  if (typeof window === 'undefined')
    throw new Error(
      '`postComposerActionMessage` must be called in the Client Component.',
    )

  window.parent.postMessage(message, '*')
}

/**
 * Posts Composer Create Cast Action Message to `window.parent`.
 *
 * This is a convinience method and it calls `postComposerActionMessage` under the hood.
 */
export function postComposerCreateCastActionMessage(
  message: ComposerActionMessage['data']['cast'],
) {
  return postComposerActionMessage({
    type: 'createCast',
    data: {
      cast: message,
    },
  })
}
