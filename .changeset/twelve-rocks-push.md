---
"frog": patch
---

Implemented a feature where `initialState` can be a callback receiving Hono's `Context`.

This is particularly useful when dealing with path parameters to dynamically initiate state.
This state will also be accessible in `c.previousState` in the Image Handler.
