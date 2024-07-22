---
"frog": patch
---

Changed default value for `verify` to be `process.env.NODE_ENV === 'production'` as many newcomers have been hitting issues with that, and in fact nobody wants to pay warps for frame tests.
