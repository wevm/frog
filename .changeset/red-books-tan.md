---
"frog": minor
---

**Breaking Change**: `postCreateCastActionMessage` from `frog/next` was deleted.
Introduced `frog/web` for client-side related logic in favor of `frog/next`.
For backwards compatibility, all the previous exports are kept, but will be
deprecated in future, except for NextJS related `handle` function.

Added functionality for the Mini-App JSON RPC requests. [See more](https://warpcast.notion.site/Miniapp-Transactions-1216a6c0c10180b7b9f4eec58ec51e55).
Added `createCast`, `sendTransaction`, `contractTransaction` and `signTypedData` to `frog/web`.
