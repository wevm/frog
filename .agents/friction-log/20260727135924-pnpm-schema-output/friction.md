---
title: '`pnpm schema` output fights `oxfmt`'
severity: 'minor'
---

## Expected Behavior

`pnpm schema` writes a `schema.json` that is already formatted the way this repo formats everything
else, so the only diff it produces is the schema change you meant to make.

## Current Behavior

The generator emits its own JSON formatting, which disagrees with `oxfmt` on arrays. A single-element
array the formatter keeps inline comes back expanded across three lines:

```diff
-      "default": ["friction"],
+      "default": [
+        "friction"
+      ],
```

So every `pnpm schema` run dirties `schema.json` with churn unrelated to the change, until you
remember to run `pnpm check` afterwards.

## Possible Solution

Have the `schema` script format its own output, either by running the formatter over `schema.json`
at the end of `scripts/schema.ts` or by chaining `vp check --fix` into the `schema` package script.

## Minimal Reproducible Example

On a clean tree:

```sh
pnpm schema && git diff --stat schema.json
```

Expected no diff. Actual: `schema.json` is modified.

## Context

Hit twice while removing config options during a review of the config API. Both times the spurious
formatting churn sat in the middle of the real diff, which made it harder to confirm that the change
was only the field being removed. That confirmation is the whole point of reading the diff when you
are deleting a public option, so noise there costs more than it looks like it should.
