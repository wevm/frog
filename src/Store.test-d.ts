import * as Store from './Store.js'

declare const value: Store.from.Value

expectTypeOf(Store.from(value)).toEqualTypeOf<Store.Store>()
expectTypeOf(Store.file({ root: '/repo' })).toEqualTypeOf<Store.Store>()
expectTypeOf(
  Store.postgres({ connectionString: 'postgres://localhost/frog' }),
).toEqualTypeOf<Store.Store>()
expectTypeOf(
  Store.postgres({
    connectionString: 'postgres://localhost/frog',
    namespace: 'agent',
    schema: 'frog',
  }),
).toEqualTypeOf<Store.Store>()
// @ts-expect-error Postgres requires a connection string.
Store.postgres({ namespace: 'agent' })
