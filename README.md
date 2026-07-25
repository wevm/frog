# frog

Automated friction logs.

Agents and humans drop atomic entries into `.agents/friction-log/` as they hit friction. Each one is
filed where it can be acted on, and the file is deleted once the friction is resolved.

```sh
frog log --publish --title 'pnpm test ignores file filters'
```

## Why

A friction log has no terminus. Nothing consumes an entry, nobody owns any single one, and no step ever
removes it, so the list either fills up until it is ignored or is abandoned before anything is written.
Every hand-rolled friction log we have has done one or the other.

frog gives friction a terminus, and keeps the log and the terminus in lockstep:

- **Filing gives each entry an owner.** The issue becomes the record, and closing it retires the entry.
- **The file mirrors what happened to it.** It appears when you log, links when it is filed, and is
  deleted once the friction is resolved.
- **So `.agents/friction-log/` is a live, greppable, offline list** of every known-unresolved friction
  affecting this repo, including friction in its dependencies. Read it before choosing an approach.

Publishing means GitHub issues today. Nothing about the log format assumes that.

## Agents

Install the skill and register the MCP server once per repository:

```sh
frog skills add
frog mcp add
```

The skill carries the part that decides whether any of this happens: **when** to log. The short version
is _log when you worked around something_ — a workaround is the sharpest evidence of friction. See
[`SKILL.md`](./SKILL.md) for the whole trigger.

Then add one line to `AGENTS.md`, so it is in context even without the skill loaded:

```md
Record friction as you hit it: run `frog log --publish --title '<what broke>' --body '<detail>'`.
Read `frog list` first, and `frog targets` to report upstream instead.
```

Every command returns a structured envelope and takes flags rather than prompts, so an agent never has
to interpret prose or answer a question it cannot see.

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
frog targets                              # which of my dependencies accept reports
frog log --publish --target viem           # file it on wevm/viem
```

Consent is checked mechanically, never by convention. See [Discovery](#discovery).

## Discovery

A project declares itself a target in two places, both derived from one config file:

1. `package.json#frog`, which ships in every npm tarball, so consumers check consent with a
   filesystem read. Offline, no rate limit, works in CI.
2. `/.well-known/frog.json`, which covers docs sites, HTTP APIs, services, and non-npm
   ecosystems, where there is no `node_modules` entry to inspect.

```sh
frog init --library     # become a friction target
frog manifest           # print the well-known document to serve
```

A well-known document may only claim a repo that independently confirms consent. A host cannot
unilaterally name where issues get filed.

## Commands

| Command    | Purpose                                                              |
| ---------- | -------------------------------------------------------------------- |
| `init`     | Set up `.agents/friction-log/`. `--library` makes the repo a target. |
| `log`      | Write an entry. `--publish` files the issue immediately.             |
| `list`     | Pending, open, and stale entries. Exits 1 on a malformed entry.      |
| `targets`  | Which dependencies accept friction reports.                          |
| `manifest` | Print the well-known document.                                       |
| `publish`  | File pending entries as issues.                                      |
| `sync`     | Reconcile local files against issue state.                           |

## License

[MIT](./LICENSE)
