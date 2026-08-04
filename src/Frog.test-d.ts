import * as Frog from './Frog.js'
import * as Store from './Store.js'

declare const store: Store.Store

const frog = Frog.create({ store })

expectTypeOf(frog).toEqualTypeOf<Frog.Frog>()
expectTypeOf(frog.log).returns.resolves.toEqualTypeOf<Store.LogResult>()
expectTypeOf(frog.logs).returns.resolves.toEqualTypeOf<readonly Store.StoredEntry[]>()
