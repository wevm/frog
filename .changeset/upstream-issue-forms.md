---
'frog': minor
---

Added issue form scaffolding: `log --target` now writes the entry against the target project's GitHub issue form, and `init --library` publishes one.

```sh
# viem asks for a version and a reproduction link, so the entry does too
frog log --target viem '`getBalance` rejects a checksummed address'
```

A target names its form with `inbound.template`, or frog looks for `.github/ISSUE_TEMPLATE/friction.yml` and then the project's only form.
