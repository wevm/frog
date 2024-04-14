---
"frog": patch
---

Fixed a regression in local environment where port was deleted from the generated metadata `postUrl` and `image` tags that resulted in incorrect links when `X-Forwarded-Host` header value is `localhost`. 
