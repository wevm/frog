import { QueryClient } from '@tanstack/react-query'
import { http, createConfig, createStorage } from 'wagmi'
import { base, baseSepolia, optimism, zora } from 'wagmi/chains'
import { coinbaseWallet, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia, optimism, zora],
  connectors: [
    coinbaseWallet({ appName: 'Frog Devtools', headlessMode: true }),
    walletConnect({
      projectId: '3fbb6bba6f1de962d911bb5b5c9dba88',
      showQrModal: false,
    }),
  ],
  storage: createStorage({ storage: localStorage, key: 'frog' }),
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [optimism.id]: http(),
    [zora.id]: http(),
  },
})

export const queryClient = new QueryClient()

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
