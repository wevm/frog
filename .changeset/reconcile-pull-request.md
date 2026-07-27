---
'frog': minor
---

Added `pullRequest`, which reconciles a closed or reopened issue through one accumulating pull request instead of committing to the default branch.

```jsonc
// .agents/friction-log/config.json
{
  "pullRequest": true,
  // or { "branch": "chore/friction" }
}
```
