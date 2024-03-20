import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import {
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
} from 'wagmi'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useRef } from 'react'

import { createPortal } from 'react-dom'
import { useFocusTrap } from '../hooks/useFocusTrap.js'
import { useScrollLock } from '../hooks/useScrollLock.js'
import { config, queryClient } from '../lib/wagmi.js'
import { Spinner } from './Spinner.js'
import { handleTransaction } from '../utils/actions.js'

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
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
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
            className="bg-background-100 relative flex flex-col gap-4 scrollbars p-6 border-gray-alpha-100 border min-w-[330px]"
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

            <Content data={data} />
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>,
    document.body,
  )
}

function Content(props: {
  data: TransactionDialogProps['data']
}) {
  const { data } = props

  const { address } = useAccount()

  if (!address)
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

      <Review address={address} data={data} />
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
  data: TransactionDialogProps['data']
}) {
  const {
    address: fromAddress,
    data: { index, target },
  } = props
  const { disconnect } = useDisconnect()
  const { sendTransaction } = useSendTransaction()

  const { data } = useQuery({
    queryKey: ['tx', { fromAddress, index, target }] as const,
    async queryFn(options) {
      return handleTransaction(options.queryKey[1])
    },
  })

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

      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>

      <button
        type="button"
        className="bg-gray-100 border border-gray-200 p-3 text-gray-1000 font-medium text-sm rounded-xl mt-1 text-center relative flex items-center justify-center"
        onClick={() => {
          if (!data) return
          sendTransaction({
            to: data.params.to,
            data: data.params.data,
            value: data.params.value ? BigInt(data.params.value) : undefined,
          })
        }}
      >
        Continue in wallet
      </button>
    </>
  )
}
