---
'frog': minor
---

The App now writes the `issue:` link onto the pull request that introduced an entry, no longer announces that entry again when the pull request merges, and takes its commit messages from config.

```ts
// .agents/friction-log/config.json
{
  "commit": {
    "link": "chore: link friction",
    "sync": "chore: sync friction log"
  }
}
```
