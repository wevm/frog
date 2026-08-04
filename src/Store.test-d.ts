import * as Store from './Store.js'

declare const client: Store.postgres.Client
declare const value: Store.from.Value

expectTypeOf(Store.from(value)).toEqualTypeOf<Store.Store>()
expectTypeOf(Store.file({ root: '/repo' })).toEqualTypeOf<Store.Store>()
expectTypeOf(Store.postgres({ client, namespace: 'agent' })).toEqualTypeOf<Store.Store>()
// @ts-expect-error Postgres configuration is supplied through one options object.
Store.postgres(client, { namespace: 'agent' })
