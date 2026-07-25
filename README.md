# frog

<p align="center">
  <a href="https://www.npmjs.com/package/frog">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/frog?colorA=21262d&colorB=21262d&style=flat">
      <img src="https://img.shields.io/npm/v/frog?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="Version">
    </picture>
  </a>
  <a href="https://github.com/wevm/frog/blob/main/LICENSE">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/l/frog?colorA=21262d&colorB=21262d&style=flat">
      <img src="https://img.shields.io/npm/l/frog?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="MIT License">
    </picture>
  </a>
</p>

<p align="center">
  <a href="#features">Features</a> · <a href="#quickprompt">Quickprompt</a> · <a href="#install">Install</a> · <a href="#usage">Usage</a> · <a href="#walkthrough">Walkthrough</a> · <a href="#license">License</a>
</p>

Automated friction logs. Agents and humans drop atomic entries into `.agents/friction-log/` as they hit
friction. Each one is filed where it can be acted on, and the file is deleted once the friction is
resolved.

## Features

- [**Automated lifecycle**](#lifecycle): an entry is written, filed, and deleted without anyone remembering to
- [**Agent-first**](#agents): a skill that says _when_ to log, an MCP server, and flags rather than prompts
- [**No index to maintain**](#no-index): the directory is the index, and it cannot drift from reality
- [**Deduplication**](#deduplication): the same friction reported twice lands on one issue, however it was worded
- [**Upstream reporting**](#report-friction-upstream): report friction in a dependency where it can actually be fixed
- [**Consent, checked mechanically**](#discovery): a project opts in, and a host cannot name a repository that does not confirm it
- [**Fork-safe**](#the-github-app): a GitHub App, so contributions from forks work where an Action is clamped to read
- [**Offline by default**](#discovery): consent for an installed package is a filesystem read, with no API call

## Quickprompt

Prompt your agent:

**Skills (recommended, lighter on tokens)**

```txt
Run `npx frog skills add`, then log the friction you just hit.
```

**MCP**

```txt
Run `npx frog mcp add`, then log the friction you just hit.
```

## Install

```bash
npm i -D frog
```

```bash
pnpm i -D frog
```

```bash
bun i -D frog
```

Then, once per repository:

```bash
frog init
```

## Usage

### Log Friction

```sh
frog log --publish --severity major \
  --title '`pnpm test -- <files>` ignores file filters and runs the whole suite' \
  --body '## Description

The `--` is consumed by pnpm, so the filter never reaches Vitest.

## Workaround

`pnpm exec vitest run src/foo.test.ts`'
```

`--publish` files it immediately, so the maintainer sees it while you still have the context to answer
questions. Without a token the entry is still written, and gets filed when the work lands.

### See What Is Known

```sh
frog list
```

Everything unresolved, including friction in dependencies. Read it before choosing an approach, and
before logging: a differently-worded duplicate is still a duplicate.

### Report Friction Upstream

Most friction is not in your own code, it is in the libraries, docs, and services you are integrating.

```sh
frog targets                     # which dependencies accept reports
frog log --target viem --title '`getBalance` rejects a checksummed address'
```

A target can be a package, a repository (`wevm/viem`), or a host (`viem.sh`), which is how a docs site or
an HTTP API gets reported. A target that has not opted in is refused, with the reason.

### Become a Target

```sh
frog init --library     # accept friction from consumers
frog manifest           # print the well-known document to serve
```

## Walkthrough

### Why a Friction Log Rots

Nothing consumes an entry, nobody owns any single one, and no step ever removes it. So the list either
fills up until it is ignored or is abandoned before anything is written. Every hand-rolled friction log
we have has done one or the other.

frog gives friction a terminus, and keeps the log and the terminus in lockstep.

### Lifecycle

```
(no file) ──log──► PENDING ──publish──► OPEN ──issue closed──► (no file)
                  no issue:            issue: o/r#N            resolved
```

Filing gives each entry an owner. The file then carries an `issue:` link, mirrors what happens to it, and
is deleted once the friction is resolved. Reopening rebuilds it, because the issue body _is_ the entry
body plus a footer.

Publishing means GitHub issues today. Nothing about the log format assumes that.

### No Index

There is no index file, and adding one would be a mistake. Every hand-rolled friction log that kept an
index desynced from it, usually immediately. The directory itself is the list, and reconciliation keeps it
true without anyone maintaining it.

### Deduplication

Every issue carries a hidden marker holding a hash of the normalized title, so `Filters ignored` and
`  FILTERS   ignored!  ` are the same friction. A second report comments on the existing issue rather than
opening another, which is what makes publishing safe to run repeatedly.

### Agents

```sh
frog skills add
frog mcp add
```

The skill carries the part that decides whether any of this happens: **when** to log. The short version
is _log when you worked around something_ — a workaround is the sharpest evidence of friction. See
[`SKILL.md`](./SKILL.md) for the whole trigger, and for what not to log.

Then add one line to `AGENTS.md`, so it is in context even without the skill loaded:

```md
Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `frog log`.
Run `frog list` first to see what is already known.
```

Every command returns a structured envelope and takes flags rather than prompts, so an agent never has to
interpret prose or answer a question it cannot see.

### Discovery

A project declares itself a target in two places, both derived from one config file:

1. `package.json#frog`, which ships in every npm tarball, so a consumer checks consent with a filesystem
   read. Offline, no rate limit, works in CI.
2. `/.well-known/frog.json`, which covers docs sites, HTTP APIs, services, and non-npm ecosystems, where
   there is no `node_modules` entry to inspect.

Consent is never taken on trust. A well-known document may only claim a repository that independently
confirms it, either by committing a config that accepts inbound friction or through a package pointing
back at the same repository. Otherwise a compromised site could aim every consumer at somebody else's
issue tracker.

The sender opts in too, by listing the target in `outbound.allowedRepos`, read from the default branch so
a pull request cannot name its own destination.

### The GitHub App

On a `pull_request` from a fork, `GITHUB_TOKEN`'s write permissions are downgraded to read _after_
job-level `permissions:` resolve, so `issues: write` in a workflow is silently ignored. An App
authenticates as an installation and is never subject to that clamp. It is also the only thing that can
react to an issue closing, which is what deletes a resolved entry.

| Event                    | Behavior                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| `pull_request`           | Files what the pull request introduces. One comment, updated in place. |
| `push` to default branch | Files anything still pending, and commits the `issue:` links.          |
| `issues`                 | Reconciles the files mirroring that issue, wherever they live.         |

See [`app/README.md`](./app/README.md) for setup.

### Commands

| Command    | Purpose                                                              |
| ---------- | -------------------------------------------------------------------- |
| `init`     | Set up `.agents/friction-log/`. `--library` makes the repo a target. |
| `log`      | Write an entry. `--publish` files it immediately.                    |
| `list`     | Pending, open, and stale entries. Exits 1 on a malformed entry.      |
| `targets`  | Which dependencies accept friction reports.                          |
| `manifest` | Print the well-known document.                                       |
| `publish`  | File pending entries.                                                |
| `sync`     | Reconcile local files against issue state.                           |

## License

[MIT](./LICENSE)
