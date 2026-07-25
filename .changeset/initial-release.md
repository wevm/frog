---
'frictionsets': minor
---

Added frictionsets: friction recorded in `.agents/frictionsets` becomes a GitHub issue, and the file then mirrors that issue until it closes.

```sh
frictionsets init
frictionsets log --publish --title '`pnpm test -- <files>` ignores file filters'
```

Friction in an upstream project can be reported there instead, if it has declared that it accepts reports:

```sh
frictionsets targets          # which dependencies accept reports
frictionsets log --target viem --title '`getBalance` rejects a checksummed address'
```
