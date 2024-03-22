import { Cross1Icon } from '@radix-ui/react-icons'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useSwitchChain,
} from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'

import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { config } from '../lib/wagmi.js'
import { handlePost, handleTransaction } from '../utils/actions.js'
import { parseChainId } from '../utils/parseChainId.js'
import { Spinner } from './Spinner.js'

type TransactionDialogProps = {
  close: () => void
  data: {
    index: number
    target?: string | undefined
  }
  open: boolean
}

export function TransactionDialog(props: TransactionDialogProps) {
  const { close, data, open } = props

  const { lock, unlock } = useScrollLock({ widthReflow: false })
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap({
    active: open,
    clickOutsideDeactivates: true,
    onActivate() {
      lock()
    },
    onDeactivate() {
      unlock()
      close()
    },
    ref,
  })

  if (!open) return <></>

  return createPortal(
    <div
      className="flex items-center justify-center p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        inset: '0',
        isolation: 'isolate',
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      <div
        className="bg-background-100 relative flex flex-col gap-4 p-6 border-gray-alpha-100 border min-w-[330px]"
        style={{ borderRadius: '1.5rem' }}
        ref={ref}
      >
        <button
          type="button"
          className="bg-transparent text-gray-800 rounded-full flex items-center justify-center absolute hover:bg-gray-100"
          style={{
            height: '2rem',
            width: '2rem',
            top: '1.25rem',
            right: '1rem',
          }}
          onClick={close}
        >
          <span className="sr-only">Close</span>
          <Cross1Icon />
        </button>

        <Content data={data} close={close} />
      </div>
    </div>,
    document.body,
  )
}

function Content(props: {
  close: () => void
  data: TransactionDialogProps['data']
}) {
  const { data, close } = props

  const { address, chainId, status } = useAccount()

  if (
    status === 'disconnected' ||
    status === 'connecting' ||
    status === 'reconnecting'
  )
    return (
      <>
        <h1 className="text-base font-bold text-gray-1000 text-center">
          Connect Wallet
        </h1>

        <p
          className="text-sm text-gray-700 leading-snug text-center mx-auto"
          style={{ maxWidth: '17rem' }}
        >
          Connect your wallet to continue with the frame transaction.
        </p>

        <ConnectWallet />
      </>
    )

  return (
    <>
      <h1 className="text-base font-bold text-gray-1000 text-center">
        Preview
      </h1>

      <Review address={address} chainId={chainId} data={data} close={close} />
    </>
  )
}

function ConnectWallet() {
  const { connect, connectors, isPending, variables } = useConnect()
  return (
    <div className="flex flex-col gap-2.5">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          type="button"
          className="bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1 text-center relative flex items-center justify-center"
        >
          {connector.name}

          {isPending &&
            typeof variables.connector === 'object' &&
            connector.uid === variables.connector.uid && (
              <div className="absolute right-2">
                <Spinner />
              </div>
            )}
        </button>
      ))}
    </div>
  )
}

function Review(props: {
  address: `0x${string}`
  chainId: number
  close: () => void
  data: TransactionDialogProps['data']
}) {
  const {
    address: fromAddress,
    chainId,
    data: { index, target },
    close,
  } = props

  const { data: transactionData } = useQuery({
    queryKey: ['tx', { fromAddress, index, target }] as const,
    queryFn(options) {
      return handleTransaction(options.queryKey[1])
    },
  })

  const { disconnect } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()
  const { sendTransaction, reset } = useSendTransaction({
    mutation: {
      onMutate(variables) {
        const chain = config.chains.find(
          (chain) => chain.id === variables.chainId,
        )!
        return { chain }
      },
      async onSuccess(data, _variables, context) {
        close()
        // TOOD: Post url for button
        await handlePost({ index, target: undefined, transactionId: data })

        try {
          const action = {
            label: 'View',
            onClick() {
              const blockExplorer = context.chain.blockExplorers.default
              const blockExplorerUrl = `${blockExplorer.url}/tx/${data}`
              window.open(blockExplorerUrl, '_blank')
            },
          }
          const toastId = toast.loading('Transaction Pending', { action })
          const transactionReceipt = await waitForTransactionReceipt(config, {
            chainId: context.chain.id,
            hash: data,
            onReplaced(replacement) {
              console.log(replacement)
            },
          })
          toast.success('Transaction Confirmed', { action, id: toastId })
          console.log(transactionReceipt)
          // TODO: Add transaction receipt to tabs
        } catch (error) {
          // TODO: Decode errors using `params.abi`
        }
      },
    },
  })

  const handleSend = useCallback(async () => {
    reset()

    if (!transactionData) return

    const { method, params } = transactionData
    if (method !== 'eth_sendTransaction') return

    const { namespace, reference } = parseChainId(transactionData.chainId)
    if (!namespace || !reference) return

    try {
      if (chainId !== reference) await switchChainAsync({ chainId: reference })
      sendTransaction({
        chainId: reference,
        to: params.to,
        data: params.data,
        value: params.value ? BigInt(params.value) : undefined,
      })
    } catch (error) {
      // TODO: Error handling
    }
  }, [chainId, transactionData, reset, sendTransaction, switchChainAsync])

  return (
    <>
      <div>
        <div title={fromAddress}>
          {fromAddress.slice(0, 4)}…{fromAddress.slice(-4)}
        </div>
        <button onClick={() => disconnect()} type="button">
          Change
        </button>
      </div>

      <pre className="text-xs">{JSON.stringify(transactionData, null, 2)}</pre>

      <button
        type="button"
        className="bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1 text-center relative flex items-center justify-center"
        disabled={!transactionData}
        onClick={handleSend}
      >
        Continue in wallet
      </button>
    </>
  )
}
