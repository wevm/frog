export type TransactionResponseMessage = {
  type: 'transactionResponse'
  data: TransactionSuccessBody | TransactionFailureBody
}

export type TransactionSuccessBody = {
  requestId: string
  success: true
  receipt: {
    address: string
    transactionId: string
  }
}

export type TransactionFailureBody = {
  requestId: string
  success: false
  message: string
}

export function listenForTransactionResponseMessage(
  handler: (message: TransactionResponseMessage) => unknown,
) {
  if (typeof window === 'undefined')
    throw new Error(
      '`listenForTransactionResponseMessage` must be called in the Client Component.',
    )

  const listener = (event: MessageEvent<TransactionResponseMessage>) => {
    // In case if there are other event listeners for `message` event,
    // we need to check that the message satisfies the expected `TransactionResponseMessage` data.
    if (event.data.type !== 'transactionResponse') return

    handler(event.data)
  }

  window.parent.addEventListener('message', listener)

  return () => window.parent.removeEventListener('message', listener)
}
