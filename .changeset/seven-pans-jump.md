---
"frog": patch
---

Made an improvement to `vercel-build` script to not create functions out of files that don't have `export const GET/POST` as those are invalid functions.
