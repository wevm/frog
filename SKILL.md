---
name: frog
description: Records friction the moment it is hit, and reports it where it can be fixed. Use when a tool, dependency, doc, test, or convention cost you time, including when the cause is upstream.
command: frog
---

# frog

Log friction the moment you hit it. Each entry is a file in `.agents/friction-log/`; publishing gets it
in front of whoever can fix it, and the file mirrors that until the friction is resolved. So the
directory is a live list of what is still outstanding, including in dependencies.

## When to log

**Log when you worked around something.** A workaround is the sharpest evidence of friction: you wanted
one thing, the tool did another, and you found a way through. Concretely:

- A command that did not do what its name, help text, or docs said.
- An error that did not say what was actually wrong.
- A dependency whose types, docs, and behavior disagreed with each other.
- A test that failed for a reason unrelated to the code under test.
- Setup that needed more steps, or more undocumented knowledge, than it should have.
- A convention you had to be told, that nothing checked.

**Log it when you hit it, not at the end of the task.** By the end you have stopped noticing, and the
exact error text is gone from your context. This is the whole reason the command exists rather than a
checklist item.

One entry per friction. Two problems in one entry cannot be closed separately.

## Before logging, read what is known

```sh
frog list
```

Everything unresolved is there, including friction in dependencies. If yours is already recorded, add
detail to that entry rather than opening a second one. `log` refuses an exact repeat, but a
differently-worded duplicate still gets through, and duplicates are what killed every friction log that
came before this one.

## Logging

```sh
frog log --publish --severity major \
  --title '`pnpm test -- <files>` ignores file filters and runs the whole suite' \
  --body '## Description

`pnpm test -- src/foo.test.ts` ran all 1,200 tests. The `--` is consumed by pnpm, so the filter never
reaches Vitest.

## Workaround

`pnpm exec vitest run src/foo.test.ts`

## Suggested fix

Document the targeted-test syntax in the script help, or forward arguments past `--`.'
```

**Prefer the MCP server for anything with an awkward body.** Registered with `frog mcp add`, the
commands are reachable as typed tools: `search_tools` to find one, `get_tool_details` for its schema,
then `call_write_tool` with `{ name: 'log', arguments: { … } }`. The schema names every option, so there
is no flag to guess and no shell quoting to get wrong. A body containing an apostrophe will break the
single-quoted form above.

**The title is what dedupes.** Make it specific enough to search for, and include the exact command,
symbol, or error fragment. `Tests are slow` is not a title. ``pnpm test -- <files>` ignores file
filters` is.

**Severity** is `blocker` (could not proceed), `major` (cost real time), or `minor` (a papercut).

`--publish` files the issue immediately, which is the point: the maintainer sees it while you still have
the context to answer questions. Without a token the entry is still written, and gets filed when the
work lands.

## Reporting upstream

Most friction is not in the code you are editing. It is in the libraries, docs, and services you are
integrating, and it can be reported where it can actually be fixed:

```sh
frog targets
```

That lists the dependencies that have declared they accept reports. Then name one:

```sh
frog log --target viem --title '`getBalance` rejects a checksummed address'
```

A target can also be a repository (`wevm/viem`) or a host (`viem.sh`), which is how a docs site or an
HTTP API is reported. A target that has not opted in is refused, with the reason.

**An upstream entry becomes a public issue on someone else's repository.** Write it for a maintainer who
cannot see your code:

- No internal paths, service names, or repository-specific detail.
- A reproduction that stands alone, ideally against a fresh project.
- Nothing you would not put in a public bug report.

## What a good entry looks like

Name the exact failure, so it is searchable. Say what you did instead. Suggest the smallest durable fix.

> `@effect/vitest`'s `layer(...)` merges `TestClock` by default, which stalls the real `@effect/sql-pg`
> pool timers, so every test dies with "All fibers interrupted without error".
>
> **Workaround:** `layer(l, { excludeTestServices: true })` for integration groups against real services.
>
> **Suggested fix:** skip `TestClock` when the layer provides real services.

The error string is what makes that useful: the next person hits it and finds this.

## What not to log

- **Your own unfinished work.** A TODO is not friction.
- **A bug you are about to fix.** Fix it.
- **Anything you cannot state concretely.** If there is no error text, no command, and no workaround,
  there is nothing for anyone to act on.
- **A preference with no cost.** "I would rather this were named differently" is friction only if the
  name actually misled you.

Noise is what makes a friction list get ignored, and an ignored list is the same as no list.
