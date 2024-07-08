---
"frog": minor
---

Removed `chainId` property from the `.signature` handler response. [See more](https://warpcast.notion.site/Frames-Wallet-Signatures-debe97a82e2643d094d4088f1badd791).
```diff
app.signature('/sign', (c) =>
  c.signTypedData({
-   chainId: 'eip155:8543',
    /**/
  })
```
