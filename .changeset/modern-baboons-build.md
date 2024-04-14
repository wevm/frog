---
"frog": patch
---

A regression came in e38c898 that fixed the local devtools with NextJS,but ultimately didn't check if `X-Forwarded-Host` was even present. Fixed it by checking if the header has a value.
