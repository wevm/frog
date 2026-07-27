<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/logo-light.svg">
  <img alt="Frog" src=".github/logo-light.svg" width="100%" height="140px">
</picture>

<p align="center">
  Automated friction logging for agents.
</p>

<br/>

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
  <a href="#problem">Problem</a> · <a href="#solution">Solution</a> · <a href="#workflow">Workflow</a> · <a href="#quick-prompt">Quick Prompt</a> · <a href="#install">Install</a> · <a href="#usage">Usage</a> · <a href="#license">License</a>
</p>

## Problem

An agent hits friction constantly, and notices all of it. That makes it the best friction logger you have,
and the worst at keeping one: each workaround goes unrecorded, and the next agent starts from nothing.

Nobody who could fix the friction hears about it either. Keeping the log by hand does not work: you stop
noticing what to write, and nothing removes the entries you did write. The list goes stale, and a stale
list goes unread.

## Solution

Frog gives the agent somewhere to put it. Each entry is a directory in `.agents/friction-log/` holding the
write-up and whatever reproduces it, committed with the code and written the moment friction is hit. The
agent reads them before it starts guessing.

Each entry is then filed as an issue, so somebody owns it, and deleted once that issue closes, so the log
only ever holds what is still unresolved. Friction in a dependency can be reported to that project instead,
if it has opted in.

## Workflow

See a demonstration in [wevm/frog-demo](https://github.com/wevm/frog-demo), where an agent adding a
health endpoint hit a config loader that turns a missing environment variable into the string
`"undefined"`, and logged it on the way past.

| Step | What happens                                                      | Example                                                       |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| 1    | Agent hits friction while working and runs `frog log`             | —                                                             |
| 2    | The entry commits alongside the change that provoked it           | [`0de4ab6`](https://github.com/wevm/frog-demo/commit/0de4ab6) |
| 3    | Frog comments on the pull request, naming what it found           | [#1](https://github.com/wevm/frog-demo/pull/1)                |
| 4    | Frog files the issue and writes the `issue:` link onto the branch | [#2](https://github.com/wevm/frog-demo/issues/2)              |
| 5    | You fix the friction and close the issue                          | [#3](https://github.com/wevm/frog-demo/pull/3)                |
| 6    | Frog opens a pull request deleting the resolved entry             | [#4](https://github.com/wevm/frog-demo/pull/4)                |
| 7    | Merging leaves the log holding only what is still unresolved      | [`e4ac13d`](https://github.com/wevm/frog-demo/commit/e4ac13d) |

## Quick Prompt

Prompt your agent:

```txt
Run `npx frog init`, and set up Frog in this project.
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

### Add Logs

Records one friction as an entry: a directory holding the write-up and anything needed to reproduce it.
Prompts for the details in a terminal, or takes them as flags.

`--publish` files it as an issue immediately. Otherwise it stays pending until the next `frog publish`.

```sh
frog log
```

```
.agents/friction-log/20260725143012-pnpm-test-files/
  friction.md     the write-up
  artifacts/      optional, whatever reproduces it
```

### View Logs

Shows every unresolved entry: what it is, whether it has been filed, where it is targeted, and whether it
ships a reproduction. Exits 1 on an entry that fails to parse, so it doubles as a CI check.

```sh
frog list
```

### Skills and MCP

Teaches agents **when** to log, which is the part they cannot infer. The rule is _log when you worked around
something_; see [`SKILL.md`](./SKILL.md) for the full trigger.

`mcp add` exposes each command as a typed tool, so agents call Frog directly rather than composing shell.

```sh
frog skills add
frog mcp add
```

### Logging Upstream

Files friction against another project instead of your own. A target is an npm package or an `owner/repo`,
and it has to have opted in: `targets` lists the ones your dependencies declare.

A package names its repository through the standard `repository` field, and consent is then read from that
repository's own default branch. So nothing a package says can send a report somewhere that has not itself
agreed to receive one.

Naming a target also scaffolds the entry from that project's GitHub issue form, so the report answers the
questions it actually asks rather than Frog's own. A project that names no form keeps Frog's sections.

```sh
frog targets
frog log --target viem
```

### Accept Inbound Logs

Marks this repository as accepting friction from the projects that depend on it, and publishes
`.github/ISSUE_TEMPLATE/friction.yml` so a consumer's report arrives in the shape this project wants.

```sh
frog init --library
```

## CLI Reference

```
frog — Automated friction logging for agents.

Usage: frog <command>

Commands:
  init     Create `.agents/friction-log` and its config.
  list     List entries with their state.
  log      Write a friction entry.
  publish  File pending entries as GitHub issues.
  sync     Reconcile entries against issue state.
  targets  List dependencies that accept friction reports.

Integrations:
  completions  Generate shell completion script
  mcp          Register as MCP server (add, doctor)
  skills       Sync skill files to agents (add, list)

Global Options:
  --filter-output <keys>              Filter output by key paths (e.g. foo,bar.baz,a[0,3])
  --format <toon|json|yaml|md|jsonl>  Output format
  --full-output                       Show full output envelope
  --help                              Show help
  --llms, --llms-full                 Print LLM-readable manifest
  --mcp                               Start as MCP stdio server
  --schema                            Show JSON Schema for command
  --token-count                       Print token count of output (instead of output)
  --token-limit <n>                   Limit output to n tokens
  --token-offset <n>                  Skip first n tokens of output
  --version                           Show version
```

## License

[MIT](./LICENSE)
