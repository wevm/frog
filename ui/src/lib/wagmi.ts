import { QueryClient } from '@tanstack/react-query'
import { http, createConfig, createStorage } from 'wagmi'
import { base, baseSepolia, optimism, zora } from 'wagmi/chains'

export const config = createConfig({
  chains: [base, baseSepolia, optimism, zora],
  storage: createStorage({ storage: localStorage, key: 'frog' }),
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [optimism.id]: http(),
    [zora.id]: http(),
  },
})

export const queryClient = new QueryClient()
