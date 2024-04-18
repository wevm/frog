---
"frog": patch
---

Fixed an issue with `wrangler` deployments where intial frame image was not
retriavable due to the disability of the worker to fetch within itself by
introducing a new `initialImageMasking` flag to control whether `frog:image` masking
should be enabled or not. [See more](https://community.cloudflare.com/t/get-error-code-1042-when-fetching-within-worker/288031/2).
