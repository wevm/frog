---
"frog": minor
---

This version of Frog removes the concept of "Render Cycles". All frames now facilitate a single cycle.

There are a couple of small **breaking changes**:

1. Removed `cycle` from context – you can now omit the conditionals completely.

```diff
app.frame('/', c => {
-  if (c.cycle === 'main') console.log('hello world')
+  console.log('hello world')
})
```

2. Moved `fonts` property in `c.res` to frame route options:

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