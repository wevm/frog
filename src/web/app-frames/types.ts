import type { EIP1193Provider, Hex } from 'viem'

declare global {
  interface Window {
    farcaster: {
      untrustedUser: {
        fid: number
        username?: string
        displayName?: string
        pfpUrl?: string
      }
      launchContext:
        | {
            type: 'channel_profile'
            channelKey: string
          }
        | {
            type: 'composer_action'
            cast: {
              parent?: string // Cast parent hash
              text?: string // Cast text, can include @mentions
              embeds?: string[] // Embed URLs
            }
          }
        | {
            type: 'cast_action'
            castHash: Hex
          }
        | {
            type: 'direct_cast_frame_embed'
          }
        | {
            type: 'cast_frame_embed'
            castHash: Hex
          }
      ethereumProvider: EIP1193Provider
      requestAuthToken(
        options: Partial<{
          /**
           * When this token should be considered invalid.
           * @default 15 minutes from now
           */
          exp?: number
        }>,
      ): string
      openExternalUrl: (options: {
        url: string
      }) => Promise<void>
      openFarcasterUri: (options: {
        url: string
      }) => Promise<void>
      openCastComposer: (options: {
        text?: string
        embeds?: string[]
        channelKey?: string
        parentCastHash?: string
      }) => Promise<void>
      inviteToChannel: (options: {
        channelKey: string
        inviteCode: string
      }) => Promise<void>
      setPrimaryButton: (
        options: {
          text: string
          enabled?: boolean
          hidden?: boolean
        },
        callback: () => Promise<void>,
      ) => Promise<void>
      close: (options: {
        toast?: {
          message: string
        }
      }) => Promise<void>
      hideSplashScreen: () => Promise<void>
    }
  }
}
