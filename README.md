# frictionsets

Changesets, but for friction logs.

Agents and humans drop atomic friction entries into `.agents/frictionsets/` while building. Each entry
becomes a GitHub issue, and the file then mirrors that issue's state until it closes.

```sh
frictionsets log --publish --title 'pnpm test ignores file filters'
```

## Why

A friction log has no terminus. A changeset gets consumed: `changeset version` writes the changelog,
deletes the file, and the release is the artifact. A friction log entry has no consumer, so it rots in
place. Every hand-rolled friction log we have has either accumulated into a graveyard or been abandoned
with zero entries written.

frictionsets gives friction a terminus (a GitHub issue) and keeps the two in lockstep:

- **The issue is the artifact.** No index file to desync.
- **The file mirrors the issue.** It appears when you log, links when it's filed, and is deleted
  automatically when the issue closes.
- **So `.agents/frictionsets/` is a live, greppable, offline list** of every known-unresolved friction
  affecting this repo, including friction in its dependencies. Read it before choosing an approach.

## Lifecycle

```
(no file) ──log──► PENDING ──publish──► OPEN ──issue closed──► (no file)
                  no issue:            issue: o/r#N            resolved
```

## Report Friction Upstream

Most friction is not in your own code, it is in the libraries, docs, and services you are integrating.
A project can advertise that it accepts friction reports, and then your agent can file where it can
actually be fixed.

```sh
frictionsets targets                              # which of my dependencies accept reports
frictionsets log --publish --target viem           # file it on wevm/viem
```

Consent is checked mechanically, never by convention. See [Discovery](#discovery).

## Discovery

A project declares itself a target in two places, both derived from one config file:

1. `package.json#frictionsets`, which ships in every npm tarball, so consumers check consent with a
   filesystem read. Offline, no rate limit, works in CI.
2. `/.well-known/frictionsets.json`, which covers docs sites, HTTP APIs, services, and non-npm
   ecosystems, where there is no `node_modules` entry to inspect.

```sh
frictionsets init --library     # become a friction target
frictionsets manifest           # print the well-known document to serve
```

A well-known document may only claim a repo that independently confirms consent. A host cannot
unilaterally name where issues get filed.

## Commands

| Command    | Purpose                                                              |
| ---------- | -------------------------------------------------------------------- |
| `init`     | Set up `.agents/frictionsets/`. `--library` makes the repo a target. |
| `log`      | Write an entry. `--publish` files the issue immediately.             |
| `list`     | Pending, open, and stale entries. Exits 1 on a malformed entry.      |
| `targets`  | Which dependencies accept friction reports.                          |
| `manifest` | Print the well-known document.                                       |
| `publish`  | File pending entries as issues.                                      |
| `sync`     | Reconcile local files against issue state.                           |

## License

[MIT](./LICENSE)
