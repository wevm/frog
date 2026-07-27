---
'frog': major
---

Removed the `severityLabels`, `publishOnLog`, and `outbound.auto` options; severity now travels in the issue marker, and the App files cross-repo without waiting for a human.

```diff
  // .agents/friction-log/config.json
  {
-   "severityLabels": { "blocker": "p0", "major": "p1", "minor": "p2" },
-   "publishOnLog": true,
-   "outbound": { "allowedRepos": ["wevm/viem"], "auto": true }
+   "outbound": { "allowedRepos": ["wevm/viem"] }
  }
```

Anything in `outbound.allowedRepos` is now filed automatically. Set `outbound.enabled` to `false` to stop reporting without emptying the list. Issues no longer carry a severity label; add one through `inbound.labels` if you want it back.
