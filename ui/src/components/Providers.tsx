import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PropsWithChildren } from 'react'
import { WagmiProvider, deserialize, serialize } from 'wagmi'

import { config, queryClient } from '../lib/wagmi'

const persister = createSyncStoragePersister({
  key: 'frog.cache',
  serialize,
  storage: window.localStorage,
  deserialize,
})

export function Providers(props: PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        {props.children}
      </PersistQueryClientProvider>
    </WagmiProvider>
  )
}
