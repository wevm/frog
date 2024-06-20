import {
  ChevronLeftIcon,
  Cross1Icon,
  ExternalLinkIcon,
  LightningBoltIcon,
  Pencil2Icon,
} from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useCallback, useMemo, useRef, useState } from 'react'
import { formatEther } from 'viem'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useSwitchChain,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'

import { useCopyToClipboard } from '../hooks/useCopyToClipboard.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useNotification, useStore } from '../hooks/useStore.js'
import { store } from '../lib/store.js'
import { config } from '../lib/wagmi.js'
import type { Frame } from '../types/frog.js'
import {
  handlePost,
  handlePostRedirect,
  handleTransaction,
} from '../utils/actions.js'
import { parseChainId } from '../utils/parseChainId.js'
import { LoadingDots } from './LoadingDots.js'
import { QRCode } from './QRCode.js'
import { Spinner } from './Spinner.js'
import { Toast } from './Toast.js'
import { WarpIcon } from './icons.js'
import { CoinbaseWalletIcon, WalletConnectIcon } from './logos.js'

type PreviewProps = {
  frame: Frame
  url: string
}

export function Preview(props: PreviewProps) {
  const { frame, url } = props

  const buttonCount = frame.buttons?.length ?? 0
  const hasIntents = Boolean(frame.input || frame.buttons?.length)
  const domain = new URL(url).host

  const notification = useNotification()

  return (
    <div className="h-full w-full lg:min-h-frame lg:w-frame">
      <div className="relative w-full rounded-md">
        <div className="relative">
          <Img
            aspectRatio={frame.imageAspectRatio}
            hasIntents={hasIntents}
            src={frame.imageUrl}
            title={frame.title}
          />
          {notification && (
            <div className="absolute inset-x-4 bottom-2">
              <Toast {...notification} />
            </div>
          )}
        </div>

        {hasIntents && (
          <div className="flex flex-col gap-2 rounded-br-md rounded-bl-md border border-t-0 bg-background-100 px-4 py-2">
            {frame.input && <Input placeholder={frame.input.text} />}

            {frame.buttons && (
              <div
                className={clsx([
                  'grid',
                  'gap-2.5',
                  buttonCount === 1 && 'grid-cols-1',
                  buttonCount === 2 && 'grid-cols-2',
                  buttonCount === 3 && 'grid-cols-3',
                  buttonCount === 4 && 'grid-cols-4',
                ])}
              >
                {frame.buttons.map((button) => {
                  switch (button.type) {
                    case 'link':
                      return <ButtonLink {...button} />
                    case 'mint':
                      return <ButtonMint {...button} />
                    case 'post':
                      return <ButtonPost {...button} />
                    case 'post_redirect':
                      return <ButtonPostRedirect {...button} />
                    case 'tx':
                      return <ButtonTransaction {...button} domain={domain} />
                  }
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 mb-4 text-right text-xs">
        <a className="font-medium text-gray-700" href={url}>
          {domain}
        </a>
      </div>

      <CondensedFrame
        domain={domain}
        imgSrc={frame.imageUrl}
        title={frame.title}
      />
    </div>
  )
}

type CondensedFrameProps = {
  domain: string
  imgSrc: string
  title: string
}

function CondensedFrame(props: CondensedFrameProps) {
  const { imgSrc, domain, title } = props

  return (
    <div className="relative flex w-full flex-row place-items-center justify-center rounded-lg border bg-background-100 p-3 text-inherit text-sm">
      <div className="flex max-h-[48px] min-h-[48px] min-w-[48px] max-w-[48px] items-center justify-center rounded-lg border border-faint dark:bg-gray-alpha-100">
        <img
          className="max-h-[48px] min-h-[48px] min-w-[48px] max-w-[48px] rounded-lg object-cover"
          src={imgSrc}
          alt={title}
        />
      </div>

      <div className="flex max-h-24 flex-col justify-center overflow-hidden rounded-lg p-2">
        <div className="line-clamp-1 font-semibold">{title}</div>
        <div className="line-clamp-1 font-medium text-gray-700 text-xs">
          {domain}
        </div>
      </div>

      <div className="flex grow">
        <div className="flex grow" />
        <button
          type="button"
          className="rounded-lg bg-gray-alpha-100 px-4 py-2 font-semibold text-sm"
          disabled
        >
          View
        </button>
      </div>
    </div>
  )
}

type ImgProps = {
  aspectRatio: string
  hasIntents: boolean
  src: string
  title: string
}

function Img(props: ImgProps) {
  const { aspectRatio, hasIntents, src, title } = props

  return (
    <img
      className={clsx([
        'bg-background-200',
        'border',
        'border-gray-200',
        'min-h-img',
        'object-cover',
        'rounded-t-lg',
        'text-background-200',
        'w-full',
        !hasIntents && 'rounded-lg',
      ])}
      style={{
        aspectRatio: aspectRatio.replace(':', '/'),
        maxHeight: '532.5px',
      }}
      src={src}
      alt={title ?? 'Farcaster frame'}
    />
  )
}

type InputProps = {
  placeholder: string
}

function Input(props: InputProps) {
  const { placeholder } = props
  const value = useStore((state) => state.inputText)
  return (
    <input
      aria-label={placeholder}
      autoComplete="off"
      className="w-full rounded-md border bg-background-200 px-3 py-2.5 text-sm leading-snug"
      data-1p-ignore
      name="inputText"
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(e) =>
        store.setState((state) => ({ ...state, inputText: e.target.value }))
      }
    />
  )
}

const buttonClass =
  'bg-gray-alpha-100 border-gray-200 flex items-center justify-center flex-row text-sm rounded-lg border cursor-pointer gap-1.5 h-10 py-2 px-4 w-full'
const innerButtonClass =
  'whitespace-nowrap overflow-hidden text-ellipsis text-gray-1000 font-medium'

function ButtonLink(props: {
  target: string
  title: string
}) {
  const { target, title } = props

  const [open, setOpen] = useState(false)
  const [url, _setUrl] = useState(target)

  return (
    <div>
      <button
        className={buttonClass}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className={innerButtonClass}>{title}</span>
        <ExternalLinkIcon
          className="text-gray-900"
          style={{ marginTop: '2px' }}
        />
      </button>

      <LeavingAppPrompt open={open} url={url} close={() => setOpen(false)} />
    </div>
  )
}

function ButtonMint(props: {
  target: string
  title: string
}) {
  const { title } = props
  return (
    <button className={buttonClass} type="button">
      <WarpIcon />
      <span className={innerButtonClass}>{title}</span>
    </button>
  )
}

function ButtonPost(props: {
  index: number
  target?: string | undefined
  title: string
}) {
  const { index, target, title } = props
  return (
    <button
      className={buttonClass}
      type="button"
      onClick={() => handlePost({ index, postUrl: target })}
    >
      <span className={innerButtonClass}>{title}</span>
    </button>
  )
}

function ButtonPostRedirect(props: {
  index: number
  target?: string | undefined
  title: string
}) {
  const { index, target, title } = props

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | undefined>()

  return (
    <div>
      <button
        className={buttonClass}
        type="button"
        onClick={async () => {
          const location = await handlePostRedirect({ index, target })
          if (!location) return
          setUrl(location)
          setOpen(true)
        }}
      >
        <span className={innerButtonClass}>{title}</span>
        <ExternalLinkIcon
          className="text-gray-900"
          style={{ marginTop: '2px' }}
        />
      </button>

      <LeavingAppPrompt open={open} url={url} close={() => setOpen(false)} />
    </div>
  )
}

function ButtonTransaction(props: {
  domain: string
  index: number
  postUrl: string | undefined
  target: string
  title: string
}) {
  const { domain, index, postUrl, target, title } = props

  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        className={buttonClass}
        type="button"
        onClick={() => setOpen(true)}
      >
        <span className={innerButtonClass}>{title}</span>
        <LightningBoltIcon
          className="text-gray-900"
          style={{ marginTop: '2px' }}
        />
      </button>

      <TransactionDialog
        open={open}
        data={{ index, postUrl, target }}
        domain={domain}
        close={() => setOpen(false)}
      />
    </div>
  )
}

function LeavingAppPrompt(props: {
  open: boolean
  url: string | undefined
  close: () => void
}) {
  const { close, open, url } = props

  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate: close,
    ref,
  })

  if (!open || !url) return <></>

  return (
    <div
      className="absolute flex flex-col gap-1.5 rounded-lg border bg-background-100 p-4 text-center"
      style={{
        marginTop: '4px',
        width: '20rem',
        zIndex: '10',
      }}
      ref={ref}
    >
      <h1 className="font-semibold text-base text-gray-1000">
        Leaving Warpcast
      </h1>

      <div className="line-clamp-2 font-mono text-gray-700 text-sm">{url}</div>

      <p className="text-gray-900 text-sm leading-snug">
        If you connect your wallet and the site is malicious, you may lose
        funds.
      </p>

      <div className="mt-1.5 flex gap-1.5">
        <button
          className="w-full rounded-md border bg-background-100 py-2 font-medium text-sm"
          type="button"
          onClick={close}
        >
          Cancel
        </button>

        <button
          className="w-full rounded-md bg-red-400 py-2 font-medium text-bg text-sm hover:bg-red-300"
          type="button"
          onClick={() => {
            close()
            window.open(url, '_blank')
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

type TransactionDialogProps = {
  data: {
    index: number
    postUrl: string | undefined
    target: string
  }
  domain: string
  open: boolean
  close: () => void
}

function TransactionDialog(props: TransactionDialogProps) {
  const { data, domain, close, open } = props

  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onDeactivate: close,
    ref,
  })

  if (!open) return <></>

  return (
    <div
      className="absolute flex flex-col gap-1.5 rounded-lg border bg-background-100 p-4 text-center"
      style={{
        marginTop: '4px',
        width: '20rem',
        zIndex: '10',
      }}
      ref={ref}
    >
      <button
        type="button"
        className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-gray-800 hover:bg-gray-100"
        onClick={close}
      >
        <span className="sr-only">Close</span>
        <Cross1Icon />
      </button>

      <TransactionDialogContent data={data} domain={domain} close={close} />
    </div>
  )
}

function TransactionDialogContent(props: Omit<TransactionDialogProps, 'open'>) {
  const { data, close } = props
  const { index, postUrl, target } = data

  const [qrUri, setQrUri] = useState<string | undefined>()
  const { copied, copy } = useCopyToClipboard({ value: qrUri })

  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false)
  const { address, chainId, connector: activeConnector, status } = useAccount()
  const {
    connect,
    connectors,
    error: connectError,
    isPending: isConnectPending,
    reset: connectReset,
    variables: connectVariables,
  } = useConnect({
    mutation: {
      onMutate(variables) {
        const connector = variables.connector
        if (connector && typeof connector !== 'function') {
          if (connector.id === 'coinbaseWalletSDK')
            connector.emitter.once('message', async (message) => {
              if (message.type === 'connecting') {
                const provider = (await connector.getProvider()) as
                  | { qrUrl?: string | undefined }
                  | undefined
                if (provider?.qrUrl) setQrUri(provider.qrUrl)
              }
            })
          if (connector.id === 'walletConnect')
            connector.emitter.on('message', (message) => {
              if (message.type !== 'display_uri') return
              if (typeof message.data !== 'string') return
              setQrUri(message.data)
            })
        }
      },
      onSuccess() {
        setIsSwitchingAccount(false)
      },
      onSettled() {
        setQrUri(undefined)
      },
    },
  })
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync, isPending: switchChainIsPending } = useSwitchChain()

  const {
    data: transaction,
    error: transactionError,
    isSuccess: isTransactionSuccess,
    refetch,
  } = useQuery({
    queryKey: ['tx', { fromAddress: address, index, target }] as const,
    queryFn(options) {
      return handleTransaction(options.queryKey[1])
    },
    enabled: address !== undefined,
    retry: 0,
  })
  const transactionChain = useMemo(() => {
    if (!transaction || transaction.status === 'error') return
    const { reference } = parseChainId(transaction.data.chainId)
    return config.chains.find((chain) => chain.id === reference)
  }, [transaction])
  const transactionChainId = transactionChain?.id

  const {
    sendTransaction,
    error: sendTransactionError,
    isPending: sendTransactionIsPending,
    reset: sendTransactionReset,
  } = useSendTransaction({
    mutation: {
      onMutate() {
        return transactionChain
      },
      async onSuccess(data, _variables, context) {
        close()

        const action = {
          label: 'View',
          onClick() {
            const blockExplorer = context.blockExplorers.default
            const blockExplorerUrl = `${blockExplorer.url}/tx/${data}`
            window.open(blockExplorerUrl, '_blank')
          },
        }
        store.setState((state) => ({
          ...state,
          notification: {
            type: 'loading',
            title: 'Transaction Pending',
            action,
          },
          transactionMap: {
            ...state.transactionMap,
            [data]: { chainId: context.id },
          },
        }))

        await handlePost({ index, postUrl, transactionId: data })

        try {
          await waitForTransactionReceipt(config, {
            chainId: context.id,
            hash: data,
            onReplaced(replacement) {
              console.log(replacement)
            },
          })
          store.setState((state) => ({
            ...state,
            notification: {
              key: state.dataKey,
              type: 'success',
              title: 'Transaction Confirmed',
              dismissable: true,
              action,
            },
          }))
        } catch (error) {
          // TODO: Decode errors using `params.abi`
          store.setState((state) => ({
            ...state,
            notification: {
              type: 'error',
              title: 'Transaction Error',
              dismissable: true,
              action,
            },
          }))
        }
      },
    },
  })

  const handleSend = useCallback(async () => {
    if (!transaction || transaction.status === 'error') return
    if (!transactionChainId) return

    const { method, params } = transaction.data
    if (method !== 'eth_sendTransaction') return

    try {
      sendTransactionReset()
      if (chainId !== transactionChainId)
        await switchChainAsync({ chainId: transactionChainId })
      sendTransaction({
        chainId: transactionChainId,
        to: params.to,
        gas: params.gas ? BigInt(params.gas) : undefined,
        data: params.data,
        value: params.value ? BigInt(params.value) : undefined,
      })
    } catch (error) {
      // TODO: Error handling
    }
  }, [
    chainId,
    transaction,
    transactionChainId,
    sendTransactionReset,
    sendTransaction,
    switchChainAsync,
  ])

  const abiFunction = useMemo(() => {
    if (!transaction || transaction.status === 'error') return
    const filtered = transaction.data.params.abi?.find(
      (item) => item.type === 'function',
    )
    if (filtered?.type === 'function') return filtered
  }, [transaction])

  if (status === 'connected' && !isSwitchingAccount) {
    if (transactionError)
      return (
        <>
          <h1 className="font-semibold text-base text-gray-1000">
            Transaction Data Error
          </h1>

          <div className="mb-4 flex flex-col gap-1 text-gray-900 text-sm leading-snug">
            <p> Error loading transaction data:</p>
            <code className="font-mono text-xs">
              {transactionError.message}
            </code>
          </div>

          <button
            type="button"
            className="relative mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-3 text-center font-medium text-gray-1000 text-sm"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </>
      )

    if (transaction?.status === 'error')
      return (
        <>
          <h1 className="font-semibold text-base text-gray-1000">
            Unable to load
          </h1>

          <div className="mb-4 flex flex-col gap-1 text-gray-900 text-sm leading-snug">
            <p>{transaction.message}</p>
          </div>
        </>
      )

    const blockExplorer = transactionChain?.blockExplorers?.default

    return (
      <>
        <h1 className="font-semibold text-base text-gray-1000">
          Review Transaction
        </h1>

        <p className="mb-4 text-balance text-gray-900 text-sm leading-snug">
          Review the following transaction before confirming in your wallet.
        </p>

        <div className="mb-4 divide-y rounded-lg border text-xs">
          <div className="flex justify-between px-3 py-2">
            <div className="font-medium text-gray-700">Address</div>
            <div className="flex gap-1">
              <div title={address} className="text-gray-1000">
                {address.slice(0, 4)}…{address.slice(-4)}
              </div>
              <button
                className="text-gray-700"
                onClick={() => setIsSwitchingAccount(true)}
                type="button"
              >
                <div className="sr-only">Change</div>
                <Pencil2Icon />
              </button>
            </div>
          </div>

          {/* <div className="flex justify-between py-2 px-3"> */}
          {/*   <div className="font-medium text-gray-700">Domain</div> */}
          {/*   <div className="text-gray-1000">{domain}</div> */}
          {/* </div> */}

          <div className="flex justify-between px-3 py-2">
            <div className="font-medium text-gray-700">Chain</div>
            {!isTransactionSuccess ? (
              <div className="self-center">
                <LoadingDots />
              </div>
            ) : (
              <div className="text-gray-1000">{transactionChain?.name}</div>
            )}
          </div>
          <div className="flex justify-between px-3 py-2">
            <div className="font-medium text-gray-700">
              {abiFunction ? 'Contract' : 'To'}
            </div>
            {!isTransactionSuccess ? (
              <div className="self-center">
                <LoadingDots />
              </div>
            ) : (
              <div className="flex gap-1">
                <div
                  title={transaction.data.params.to}
                  className="text-gray-1000"
                >
                  {transaction.data.params.to.slice(0, 4)}...
                  {transaction.data.params.to.slice(-4)}
                </div>
                {blockExplorer && (
                  <a
                    href={`${blockExplorer?.url}/address/${transaction.data.params.to}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-gray-700"
                  >
                    <span className="sr-only">Open in block explorer</span>
                    <ExternalLinkIcon />
                  </a>
                )}
              </div>
            )}
          </div>
          {abiFunction && (
            <div className="flex justify-between px-3 py-2">
              <div className="font-medium text-gray-700">Function</div>
              {!isTransactionSuccess ? (
                <div className="self-center">
                  <LoadingDots />
                </div>
              ) : (
                <div className="text-gray-1000">{abiFunction.name}</div>
              )}
            </div>
          )}

          {transaction?.data?.params.value && (
            <div className="flex justify-between px-3 py-2">
              <div className="font-medium text-gray-700">Value</div>
              <div className="text-gray-1000">
                {transaction.data.method.includes('eth') && (
                  <span className="mr-1 select-none text-gray-700">Ξ</span>
                )}
                {formatEther(BigInt(transaction.data.params.value))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="relative mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-3 text-center font-medium text-gray-1000 text-sm"
          disabled={
            !isTransactionSuccess ||
            switchChainIsPending ||
            sendTransactionIsPending
          }
          onClick={handleSend}
        >
          {switchChainIsPending || sendTransactionIsPending ? (
            <>
              <span className="text-gray-700">Check Wallet</span>

              <div className="absolute right-2">
                <Spinner />
              </div>
            </>
          ) : (
            'Send Transaction'
          )}
        </button>

        {sendTransactionError && (
          <div className="mt-1 text-red-900 text-xs">
            {'shortMessage' in sendTransactionError
              ? sendTransactionError.shortMessage
              : sendTransactionError.message}
          </div>
        )}
      </>
    )
  }

  if (qrUri)
    return (
      <>
        <button
          type="button"
          className="absolute top-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-gray-800 hover:bg-gray-100"
          onClick={() => {
            connectReset()
            setQrUri(undefined)
          }}
        >
          <span className="sr-only">Back</span>
          <ChevronLeftIcon />
        </button>

        <h1 className="font-semibold text-base text-gray-1000">
          Scan with Phone
        </h1>

        <p className="mb-2 text-balance text-gray-900 text-sm leading-snug">
          Scan with your phone's camera to connect your wallet.
        </p>

        <QRCode
          url={qrUri}
          icon={
            qrUri.includes('walletlink') ? (
              <div style={{ backgroundColor: '#0052FF' }}>
                <CoinbaseWalletIcon />
              </div>
            ) : (
              <div style={{ backgroundColor: '#3B99FC' }}>
                <WalletConnectIcon />
              </div>
            )
          }
        />

        <button
          type="button"
          className="relative mt-2 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-3 text-center font-medium text-gray-1000 text-sm"
          onClick={copy}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </>
    )

  return (
    <>
      {isSwitchingAccount && (
        <button
          type="button"
          className="absolute top-2.5 left-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-gray-800 hover:bg-gray-100"
          onClick={() => setIsSwitchingAccount(false)}
        >
          <span className="sr-only">Back</span>
          <ChevronLeftIcon />
        </button>
      )}

      <h1 className="font-semibold text-base text-gray-1000">Connect Wallet</h1>

      <p className="mb-4 text-balance text-gray-900 text-sm leading-snug">
        Connect your wallet to continue with the frame transaction.
      </p>

      <div className="flex flex-col gap-2">
        {connectors.toReversed().map((connector) => (
          <button
            key={connector.uid}
            onClick={async () => {
              if (activeConnector?.uid === connector.uid) {
                await disconnectAsync().catch(() => {})
                setIsSwitchingAccount(false)
              }
              connect({ chainId: transactionChainId, connector })
            }}
            type="button"
            className="relative mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-3 text-center font-medium text-gray-1000 text-sm"
          >
            {connector.name}

            {isConnectPending &&
              typeof connectVariables.connector === 'object' &&
              connector.uid === connectVariables.connector.uid && (
                <div className="absolute right-2">
                  <Spinner />
                </div>
              )}
          </button>
        ))}
      </div>

      {connectError && (
        <div className="mt-1 text-red-900 text-xs">
          {'shortMessage' in connectError
            ? connectError.shortMessage
            : connectError.message}
        </div>
      )}
    </>
  )
}
