import { QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { WagmiProvider } from 'wagmi'

import { config, queryClient } from '../lib/wagmi'

export function Providers(props: PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
