---
"frog": patch
---

Fixed an issue where other `Frog` instances routed via `.route` constructed an incorrect image URL due to the absence of `basePath`.
