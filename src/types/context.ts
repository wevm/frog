import type { Context as Context_hono, Env } from 'hono'
import type { FrameButtonValue, FrameData, FrameResponseFn } from './frame.js'
import type {
  ContractTransactionResponseFn,
  SendTransactionParameters,
  TransactionParameters,
  TransactionResponseFn,
} from './transaction.js'
import type { Pretty } from './utils.js'

export type Context<state = unknown> = {
  /**
   * Index of the button that was interacted with on the previous frame.
   */
  buttonIndex?: FrameData['buttonIndex']
  /**
   * Value of the button that was interacted with on the previous frame.
   */
  buttonValue?: string | undefined
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
  previousState: state
  /**
   * Status of the frame in the frame lifecycle.
   * - `initial` - The frame has not yet been interacted with.
   * - `redirect` - The frame interaction is a redirect (button of type `'post_redirect'`).
   * - `response` - The frame has been interacted with (user presses button).
   */
  status: 'initial' | 'redirect' | 'response'
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
  path extends string = string,
  state = unknown,
> = Context<state> & {
  /**
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
  deriveState: (fn?: (previousState: state) => void) => state
  getState: () => state
  /** Frame request object. */
  req: Context_hono<Env, path>['req']
  /** Frame response that includes frame properties such as: image, intents, action, etc */
  res: FrameResponseFn
  /**
   * Transaction ID of the executed transaction (if any). Maps to:
   * - Ethereum: a transaction hash
   */
  transactionId?: FrameData['transactionId'] | undefined
}

export type TransactionContext<
  path extends string = string,
  state = unknown,
> = Context<state> & {
  /**
   * Contract transaction request.
   *
   * This is a convenience method for "eth_sendTransaction" requests for contracts as defined in the [Transaction Spec](https://www.notion.so/warpcast/Frame-Transactions-Public-Draft-v2-9d9f9f4f527249519a41bd8d16165f73?pvs=4#1b69c268f0684c978fbdf4d331ab8869),
   * with a type-safe interface to infer types based on a provided `abi`.
   */
  contract: ContractTransactionResponseFn
  /** Frame request object. */
  req: Context_hono<Env, path>['req']
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
