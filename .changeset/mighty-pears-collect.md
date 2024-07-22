---
"frog": minor
---

**Breaking Change**. Composer Action Handlers now require a third argument to define metadata.

```diff
export const app = new Frog({
  title: 'Composer Action',
}).composerAction(
  '/',
  async (c) => {
    if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })
    return c.res({
      title: 'Some Composer Action',
      url: 'https://example.com',
    })
  },
+ {
+   name: 'Some Composer Action',
+   description: 'Cool Composer Action',
+   icon: 'image',
+   imageUrl: 'https://frog.fm/logo-light.svg',
+ },
)
```
