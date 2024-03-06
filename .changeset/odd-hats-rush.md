---
"frog": patch
---

**Type Change:** The `state` generic in the `Frog` constructor type is now named.

```diff
type State = { count: number }

- const frog = new Frog<State>({
+ const frog = new Frog<{ State: State }>({
  initialState: { count: 0 }
})
```
