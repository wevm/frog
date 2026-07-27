---
'frog': minor
---

A closed or reopened issue now reconciles through one accumulating pull request rather than committing to the default branch, so a protected branch no longer breaks sync.

```diff
- the App commits the deletion to the default branch
+ the App keeps one pull request open, and you merge it
```

Set `pullRequest: false` to commit directly as before, or `{ branch }` to name the branch.
