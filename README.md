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
  <a href="#problem">Problem</a> · <a href="#solution">Solution</a> · <a href="#install">Install</a> · <a href="#usage">Usage</a> · <a href="#license">License</a>
</p>

Automated friction logging for agents.

## Problem

An agent hits friction constantly, and notices all of it. That makes it the best friction logger you have,
and the worst at keeping one: each workaround goes unrecorded, and the next agent starts from nothing.

Nobody who could fix the friction hears about it either. Keeping the log by hand does not work: you stop
noticing what to write, and nothing removes the entries you did write. The list goes stale, and a stale
list goes unread.

## Solution

frog gives the agent somewhere to put it. Entries are markdown files in `.agents/friction-log/`, committed
with the code and written the moment friction is hit. The agent reads them before it starts guessing.

Each entry is then filed as an issue, so somebody owns it, and deleted once that issue closes, so the log
only ever holds what is still unresolved. Friction in a dependency can be reported to that project instead,
if it has opted in.

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
  --body 'The `--` is consumed by pnpm, so the filter never reaches Vitest.

Workaround: `pnpm exec vitest run src/foo.test.ts`'
```

`--publish` files it immediately, so the maintainer sees it while you still have the context to answer
questions. Without a token the entry is still written, and gets filed when the work lands.

Every issue carries a hidden marker holding a hash of the normalized title, so `Filters ignored` and
`  FILTERS   ignored!  ` are the same friction. A repeat comments on the existing issue instead of opening
another, which makes publishing safe to run as often as you like.

### Read What Is Known

```sh
frog list
```

Everything still unresolved, including friction in dependencies. It is a plain directory of markdown, so an
agent can grep it, and there is no index file to fall out of step with what is actually there.

### Lifecycle

```
(no file) ──log──► PENDING ──publish──► OPEN ──issue closed──► (no file)
                  no issue:            issue: o/r#N            resolved
```

The file carries an `issue:` link once it is filed, mirrors what happens to that issue, and is deleted once
the friction is resolved. Reopening rebuilds it, because the issue body _is_ the entry body plus a footer.

Publishing means GitHub issues today. Nothing about the log format assumes that.

### Teach Agents When To Log

```sh
frog skills add
frog mcp add
```

The skill carries the part that decides whether any of this happens: **when** to log. The short version is
_log when you worked around something_. A workaround is the sharpest evidence of friction, and the moment
you hit it is the only time the exact error text is still in context. See [`SKILL.md`](./SKILL.md) for the
whole trigger, and for what not to log.

Every command takes flags rather than prompts and returns a structured envelope, so an agent never has to
interpret prose or answer a question it cannot see.

### Report Friction Upstream

Most friction is not in your own code. It is in the libraries, docs, and services you are integrating, and
it can be reported where it can actually be fixed.

```sh
frog targets                     # which dependencies accept reports
frog log --target viem --title '`getBalance` rejects a checksummed address'
```

A project declares itself a target in two places, both derived from one config file: `package.json#frog`,
which ships in every npm tarball so consent is a filesystem read with no API call, and
`/.well-known/frog.json`, which covers docs sites, HTTP APIs, and non-npm ecosystems where there is no
`node_modules` entry to inspect.

Consent is never taken on trust. A well-known document may only claim a repository that independently
confirms it, or a compromised site could aim every consumer at somebody else's issue tracker. The sender
opts in too, from its default branch, so a pull request cannot name its own destination.

### Become A Target

```sh
frog init --library     # accept friction from consumers
frog manifest           # print the well-known document to serve
```

### Automate With The GitHub App

On a `pull_request` from a fork, `GITHUB_TOKEN`'s write permissions are downgraded to read _after_
job-level `permissions:` resolve, so `issues: write` in a workflow is silently ignored. frog ships a GitHub
App instead, which authenticates as an installation and is never subject to that clamp. It is also the only
thing that can react to an issue closing, which is what deletes a resolved entry.

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
