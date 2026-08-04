---
'frog': minor
---

Add a public friction-store contract, a storage-independent `FrictionLog` API, and an optional
Postgres adapter while preserving the repository file store as the default. `DATABASE_URL`
automatically selects Postgres for CLI commands, and `frog migrate` prepares the selected store.
