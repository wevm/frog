import * as Entry from './Entry.js'

const context = {
  attempts: 2,
  flags: [true, false, null],
  source: { kind: 'agent' },
} as const satisfies Entry.Context

expectTypeOf(context).toMatchTypeOf<Entry.Context>()

// @ts-expect-error Dates do not preserve their value through entry serialization.
const invalidContext: Entry.Context = { collectedAt: new Date() }

expectTypeOf(invalidContext).toEqualTypeOf<Entry.Context>()
