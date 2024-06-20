---
"frog": minor
---

**Breaking change.** Added `title` as a required parameter to `Frog` constructor.

```diff
- const app = new Frog()
+ const app = new Frog({ title: 'My Title' })
```
