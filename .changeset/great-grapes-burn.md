---
"frog": minor
---

This version of Frog removes the concept of "Render Cycles". All frames now facilitate a single cycle.

There are a couple of small **deprecations**:

1. Deprecated `cycle` from context – you can now omit the conditionals completely.

```diff
app.frame('/', c => {
-  if (c.cycle === 'main') console.log('hello world')
+  console.log('hello world')
})
```

2. Deprecated `fonts` property in `c.res` in favor of `fonts` on frame route options:

```diff
app.frame('/', c => {
  return c.res({
    imageOptions: {
-     fonts: // ...
    }
  })
}, {
+  fonts: // ...
})
```