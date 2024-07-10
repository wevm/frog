---
"frog": minor
---

**Breaking Change**. Added `chainId` back as a parameter to `.signature` handler.

```diff
app.signature('/sign', (c) =>
  c.signTypedData({
+   chainId: 'eip155:8543',
    /**/
  })
```
