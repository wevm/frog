---
"frog": minor
---

**Breaking change** Frog UI `icon` property requires an icon map imported from the `'frog/ui/icons'` entrypoint. This also makes it easier for you to supply your own custom icons.

```diff
+ import { lucide } from 'frog/ui/icons'

export const system = createSystem({
- icons: 'lucide',
+ icons: lucide,
})
```

In addition, the following separate entrypoints were added for resource constrained environments.

- `frog/ui/icons/heroicons`
- `frog/ui/icons/lucide`
- `frog/ui/icons/radix-icons`
