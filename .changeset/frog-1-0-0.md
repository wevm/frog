---
'frog': major
---

Turned `frog` into a friction logger: friction recorded in `.agents/friction-log` becomes a GitHub issue, and the file then mirrors that issue until it closes.

The name previously belonged to the Farcaster Frames framework, now archived at [wevm/frog-archived](https://github.com/wevm/frog-archived). There is no upgrade path between the two, and nothing below `1.0.0` is affected: a `^0.18` range never resolves to this release.

```diff
- import { Frog } from 'frog'   // 0.x, Farcaster Frames
+ npx frog log --publish --title '`pnpm test -- <files>` ignores file filters'
```

Friction in an upstream project can be reported there instead, when that project has committed a
`.agents/friction-log/config.json` accepting inbound reports:

```sh
frog targets          # dependencies that accept reports
frog log --target viem --title '`getBalance` rejects a checksummed address'
```
