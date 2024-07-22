import type { Context as Context_hono, Input } from 'hono'
import type {
  CastActionData,
  CastActionFrameResponseFn,
  CastActionMessageResponseFn,
  CastActionResponseFn,
} from './castAction.js'
import type {
  ComposerActionData,
  ComposerActionResponseFn,
} from './composerAction.js'
import type { Env } from './env.js'
import type { FrameButtonValue, FrameData, FrameResponseFn } from './frame.js'
import type { ImageResponseFn } from './image.js'
import type { BaseErrorResponseFn } from './response.js'
import type {
  SignTypedDataResponseFn,
  SignatureParameters,
  SignatureResponseFn,
} from './signature.js'
import type {
  ContractTransactionResponseFn,
  SendTransactionParameters,
  TransactionParameters,
  TransactionResponseFn,
} from './transaction.js'
import type { Pretty } from './utils.js'

export type CastActionContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  /**
   * Data from the action that was passed via the POST body.
   * The {@link Context`verified`} flag indicates whether the data is trusted or not.
   */
  actionData: Pretty<CastActionData>
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.castAction('/', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */
  env: Context_hono<env, path>['env']
  /** Error response that includes message and statusCode. */
  error: BaseErrorResponseFn
  /**
   * Frame response for building ephemeral frames.
   *
   * @see https://warpcast.notion.site/Frames-Multi-step-actions-f469054de8fb4ffc8b8e2649a41b6ad9?pvs=74
   */
  frame: CastActionFrameResponseFn
  /**
   * Message response for building single-step cast actions.
   *
   * @see https://warpcast.notion.site/Frames-Cast-Actions-v1-84d5a85d479a43139ea883f6823d8caa
   */
  message: CastActionMessageResponseFn
  /**
   * Hono request object.
   *
   * @see https://hono.dev/api/context#req
   */
  req: Context_hono<env, path, input>['req']
  /**
   * Raw action response that includes action properties such as: message, statusCode.
   *
   * @see https://warpcast.notion.site/Spec-Farcaster-Actions-84d5a85d479a43139ea883f6823d8caa
   * */
  res: CastActionResponseFn
  /**
   * Extract a context value that was previously set via `set` in [Middleware](/concepts/middleware).
   *
   * @see https://hono.dev/api/context#var
   */
  var: Context_hono<env, path, input>['var']
  /**
   * Whether or not the {@link Context`actionData`} was verified by the Farcaster Hub API.
   */
  verified: boolean
}

export type ComposerActionContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
> = {
  /**
   * Data from the action that was passed via the POST body.
   * The {@link Context`verified`} flag indicates whether the data is trusted or not.
   */
  actionData: Pretty<ComposerActionData>
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.castAction('/', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */
  env: Context_hono<env, path>['env']
  /** Error response that includes message and statusCode. */
  error: BaseErrorResponseFn
  /**
   * Hono request object.
   *
   * @see https://hono.dev/api/context#req
   */
  req: Context_hono<env, path, input>['req']
  /**
   * Composer action response.
   *
   * @see https://warpcast.notion.site/Spec-Farcaster-Actions-84d5a85d479a43139ea883f6823d8caa
   * */
  res: ComposerActionResponseFn
  /**
   * Extract a context value that was previously set via `set` in [Middleware](/concepts/middleware).
   *
   * @see https://hono.dev/api/context#var
   */
  var: Context_hono<env, path, input>['var']
  /**
   * Whether or not the {@link Context`actionData`} was verified by the Farcaster Hub API.
   */
  verified: boolean
}

export type Context<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  /**
   * Index of the button that was interacted with on the previous frame.
   */
  buttonIndex?: FrameData['buttonIndex']
  /**
   * Value of the button that was interacted with on the previous frame.
   */
  buttonValue?: string | undefined
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.frame('/', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */
  env: Context_hono<env, path>['env']
  /**
   * Data from the frame that was passed via the POST body.
   * The {@link Context`verified`} flag indicates whether the data is trusted or not.
   */
  frameData?: Pretty<FrameData>
  /**
   * Initial path of the frame set.
   */
  initialPath: string
  /**
   * Input text from the previous frame.
   */
  inputText?: string | undefined
  /**
   * Button values from the previous frame.
   */
  previousButtonValues?: FrameButtonValue[] | undefined
  /**
   * State from the previous frame.
   */
  previousState: _state
  /**
   * Hono request object.
   *
   * @see https://hono.dev/api/context#req
   */
  req: Context_hono<env, path, input>['req']
  /**
   * Status of the frame in the frame lifecycle.
   * - `initial` - The frame has not yet been interacted with.
   * - `redirect` - The frame interaction is a redirect (button of type `'post_redirect'`).
   * - `response` - The frame has been interacted with (user presses button).
   */
  status: 'initial' | 'redirect' | 'response'
  /**
   * Extract a context value that was previously set via `set` in [Middleware](/concepts/middleware).
   *
   * @see https://hono.dev/api/context#var
   */
  var: Context_hono<env, path, input>['var']
  /**
   * Whether or not the {@link Context`frameData`} was verified by the Farcaster Hub API.
   */
  verified: boolean
  /**
   * Current URL.
   */
  url: Context_hono['req']['url']
}

export type FrameContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Context<env, path, input, _state> & {
  /**
   * @deprecated As of `v0.5.0`, this property is redundant (there is now only one render cycle) and will be removed in a future version.
   *
   * Current render cycle of the frame.
   *
   * - `main` - Render cycle for the main frame route.
   * - `image` - Render cycle for the OG image route.
   */
  cycle: 'main' | 'image'
  /**
   * Function to derive the frame's state based off the state from the
   * previous frame.
   */
  deriveState: <
    deriveFn extends (previousState: _state) => void | Promise<void>,
  >(
    fn?: deriveFn,
  ) => ReturnType<deriveFn> extends Promise<void> ? Promise<_state> : _state
  /** Error response that includes message and statusCode. */
  error: BaseErrorResponseFn
  /** Frame response that includes frame properties such as: image, intents, action, etc */
  res: FrameResponseFn
  /**
   * Transaction ID of the executed transaction (if any). Maps to:
   * - Ethereum: a transaction hash
   */
  transactionId?: FrameData['transactionId'] | undefined
}

export type TransactionContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Context<env, path, input, _state> & {
  /**
   * Address of the account that is executing a transaction (if any). Maps to:
   * - Ethereum: 20-byte address string.
   */
  address: string
  /**
   * Data from the frame that was passed via the POST body.
   * The {@link Context`verified`} flag indicates whether the data is trusted or not.
   */
  frameData?: Pretty<FrameData>
  /**
   * Contract transaction request.
   *
   * This is a convenience method for "eth_sendTransaction" requests for contracts as defined in the [Transaction Spec](https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869),
   * with a type-safe interface to infer types based on a provided `abi`.
   */
  contract: ContractTransactionResponseFn
  /** Error response that includes message and statusCode. */
  error: BaseErrorResponseFn
  /**
   * Raw transaction request.
   *
   * @see https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869
   */
  res: TransactionResponseFn<TransactionParameters>
  /**
   * Send transaction request.
   *
   * This is a convenience method for "eth_sendTransaction" requests as defined in the [Transaction Spec](https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869).
   */
  send: TransactionResponseFn<SendTransactionParameters>
}

export type ImageContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = {
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.castAction('/', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   * @see https://hono.dev/api/context#env
   */
  env: Context_hono<env, path>['env']
  /**
   * Button values from the previous frame.
   */
  previousButtonValues?: FrameButtonValue[] | undefined
  /**
   * State from the previous frame.
   */
  previousState: _state
  /**
   * Hono request object.
   *
   * @see https://hono.dev/api/context#req
   */
  req: Context_hono<env, path, input>['req']
  /**
   * Raw response with the image and imageOptions.
   * */
  res: ImageResponseFn
  /**
   * Extract a context value that was previously set via `set` in [Middleware](/concepts/middleware).
   *
   * @see https://hono.dev/api/context#var
   */
  var: Context_hono<env, path, input>['var']
}

export type SignatureContext<
  env extends Env = Env,
  path extends string = string,
  input extends Input = {},
  //
  _state = env['State'],
> = Context<env, path, input, _state> & {
  /**
   * Address of the account that is signing a message (if any). Maps to:
   * - Ethereum: 20-byte address string.
   */
  address: string
  /**
   * Data from the frame that was passed via the POST body.
   * The {@link Context`verified`} flag indicates whether the data is trusted or not.
   */
  frameData?: Pretty<FrameData>
  /** Error response that includes message and statusCode. */
  error: BaseErrorResponseFn
  /**
   * Raw signature request.
   *
   * @see https://warpcast.notion.site/Frames-Wallet-Signatures-debe97a82e2643d094d4088f1badd791
   */
  res: SignatureResponseFn<SignatureParameters>
  /**
   * Signs typed data.
   *
   * This is a convenience method for "eth_signTypedData_v4" requests as defined in the [Wallet Signatures Spec](https://warpcast.notion.site/Frames-Wallet-Signatures-debe97a82e2643d094d4088f1badd791)
).
   */
  signTypedData: SignTypedDataResponseFn
}
