import type { Context as Context_hono, Input } from 'hono'
import type { Env } from './env.js'
import type { FrameButtonValue, FrameData, FrameResponseFn } from './frame.js'
import type {
  ContractTransactionResponseFn,
  SendTransactionParameters,
  TransactionParameters,
  TransactionResponseFn,
} from './transaction.js'
import type { Pretty } from './utils.js'

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
