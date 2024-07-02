---
"frog": patch
---

Fixed an issue where Fragment (`<>...</>`) was handled as a separate node. Now it simply unwraps children.
