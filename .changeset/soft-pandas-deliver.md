---
"frog": patch
---

Fixed an issue with `.image` handler not recieving correct `__context` which is normally injected in `parseImage` function that wasn't previously used in Image rendering. As a consequence, https://github.com/wevm/frog/commit/c2f4d563b4633b0ef87a3132db571659700ce84d as an attempt to fix `__context` not being passed to components is no longer relevant, thus reverted.
