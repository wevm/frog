---
"frog": patch
---

Fixed a regression in local environments with templates other than `next` used where port was deleted when `X-Forwarded-Host` was not present that resulted in a malformed `postUrl` and `image` url values in the rendered frame meta tags. 
