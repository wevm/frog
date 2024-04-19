---
"frog": patch
---

Dropped `frog:image` meta tag in favor of having the image handler to render the initial frame image itself. Fixed wrangler/edge deployment issues that were caused by requesting for `frog:image` tag at the frame handler from image handler where it is limited by wrangler/edge api.
