---
"frog": patch
---

Fixed an issue with local devtools with nextjs template that sets `x-forwarded-host` header to `localhost` which previously deleted the port and ended up creating incorrect link.
