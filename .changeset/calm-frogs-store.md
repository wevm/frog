---
'frog': minor
---

Added pluggable friction stores, a Postgres factory, and the `Frog.create` logging API.

```ts
import { Frog, Store } from 'frog'
import { Pool } from 'pg'

const client = new Pool({ connectionString: process.env.DATABASE_URL })
const store = Store.postgres(client, { namespace: 'support-agent' })
await store.migrate()
const frog = Frog.create({ store })
await frog.log({
  body: 'The workaround used.',
  severity: 'minor',
  title: 'Tool required a workaround',
})
const logs = await frog.logs()
```
