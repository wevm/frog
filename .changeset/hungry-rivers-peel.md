---
"frog": patch
---

Fixed an issue where port is appended to a reverse-proxied server. Now when `x-forwarded-host` is found, port is deleted.
