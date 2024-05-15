---
"frog": minor
---

Removed `frog` hub. Use `neynar` along with the `'NEYNAR_FROG_FM'` dev API key instead.

```diff
import { Frog } from 'frog'
- import { frog } from 'frog/hubs'
+ import { neynar } from 'frog/hubs'

export const app = new Frog({
- hub: frog(),
+ hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
})
```
