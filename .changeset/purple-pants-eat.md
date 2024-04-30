---
"frog": minor
---

Implemented multi-step cast actions. [See more](https://warpcast.notion.site/Frames-Multi-step-actions-f469054de8fb4ffc8b8e2649a41b6ad9?pvs=74).

Breaking changes have affected `.castAction` handler definition and its response:
- `.castAction` handler response now requires a `"type": "message" | "frame"` to be specified. Shorthands `c.message(...)` and `c.frame(...)` were added for the ease of use.
