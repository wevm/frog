import * as Store from './Store.js'

declare const client: Store.postgres.Client
declare const value: Store.from.Value

expectTypeOf(Store.from(value)).toEqualTypeOf<Store.Store>()
expectTypeOf(Store.file({ root: '/repo' })).toEqualTypeOf<Store.Store>()
expectTypeOf(Store.postgres(client, { namespace: 'agent' })).toEqualTypeOf<Store.Store>()
