---
'frog': minor
---

Added pluggable friction stores, a Postgres.js-backed `Store.postgres({ connectionString })` factory, and the `Frog.create` logging API.

```ts
import { Frog, Store } from 'frog'

const store = Store.postgres({ connectionString: process.env.DATABASE_URL! })
const frog = Frog.create({ store })
await frog.log({
  body: 'The workaround used.',
  severity: 'minor',
  title: 'Tool required a workaround',
})
const logs = await frog.logs()
await store.close()
```
