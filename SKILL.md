---
name: frog
description: Records friction the moment it is hit, and reports it where it can be fixed. Use when a tool, dependency, doc, test, or convention cost you time, including when the cause is upstream.
command: frog
---

# Frog

Log friction the moment you hit it. Each entry is a directory in `.agents/friction-log/`, filed where it
can be acted on and deleted once the friction is resolved. So the directory is a live list of what is
still outstanding, including in dependencies.

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

Pipe the entry in, shaped like a commit message: the first line is the title, the rest is the body.

```sh
frog log --publish --severity major <<'EOF'
`pnpm test -- <files>` ignores file filters and runs the whole suite

## Expected Behavior

The filter reaches the runner, as `pnpm test --help` and every other script in the repo imply.

## Current Behavior

`pnpm test -- src/foo.test.ts` ran all 1,200 tests. The `--` is consumed by pnpm, so the filter never
reaches Vitest, and nothing warns.

## Possible Solution

Forward arguments past `--`, or document `pnpm exec vitest run <files>` in the script help.

## Minimal Reproducible Example

`pnpm test -- src/foo.test.ts` in a fresh checkout. See `artifacts/run.sh`.

## Context

Every targeted test run in CI silently became a full run, so a 20 second check took 6 minutes and nobody
noticed until the bill.
EOF
```

Nothing is quoted, so an apostrophe or a backtick in the body cannot end the argument early. `--title` and
`--body` still work if you have short single-line content.

If the MCP server is registered with `frog mcp add`, the commands are also reachable as typed tools:
`search_tools` to find one, `get_tool_details` for its schema, then `call_write_tool` with
`{ name: 'log', arguments: { … } }`. The schema names every option, so there is nothing to guess.

**The title is what dedupes.** Make it specific enough to search for, and include the exact command,
symbol, or error fragment. `Tests are slow` is not a title. ``pnpm test -- <files>` ignores file
filters` is.

**Severity** is `blocker` (could not proceed), `major` (cost real time), or `minor` (a papercut).

`--publish` files the issue immediately, which is the point: the maintainer sees it while you still have
the context to answer questions. Without a token the entry is still written, and gets filed when the
work lands.

## Ship the reproduction

`log` writes the entry to `.agents/friction-log/<timestamp>-<title>/friction.md` and returns that path
along with an `artifacts` one beside it. Anything that reproduces the friction goes in `artifacts/`: a script, a failing
test, the config that triggers it, a minimal project. Then reference it from the write-up.

Keep it as small as it can be while still failing, and make it runnable as it stands. A reproduction that
has to be rebuilt from prose usually is not, and then nothing happens to the entry.

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

A target can also be a repository (`wevm/viem`), which is how you report to a project that is not a
dependency. A target that has not opted in is refused, with the reason.

**Naming a target scaffolds the entry from that project's issue form.** Omit `--body` and the entry is
written with their headings, each one carrying an HTML comment saying what that field wants. Fill those in
rather than replacing them: a project that asks for a version, or a link to a runnable reproduction, will
usually close a report that skips it.

**An upstream entry becomes a public issue on someone else's repository.** Write it for a maintainer who
cannot see your code:

- No internal paths, service names, or repository-specific detail.
- A reproduction that stands alone, ideally against a fresh project.
- Nothing you would not put in a public bug report, artifacts included.

## What a good entry looks like

The test is whether someone else can act on it without asking you a single question.

Vague, and the kind of thing that gets closed unread:

> ## Current Behavior
>
> Tests are flaky with Effect.

Specific, using the headings the template gives you:

> ## Expected Behavior
>
> A layer providing real services keeps real timers.
>
> ## Current Behavior
>
> `@effect/vitest`'s `layer(...)` merges `TestClock` by default, which stalls the real `@effect/sql-pg`
> pool timers. Every test in the group dies with `All fibers interrupted without error`.
>
> ## Possible Solution
>
> Skip `TestClock` when the layer provides real services. Happy to open the PR.
>
> ## Minimal Reproducible Example
>
> `artifacts/pool.test.ts`. Fails under `pnpm vitest run`, passes with `excludeTestServices: true`.
>
> ## Context
>
> Every integration suite against a real database was unrunnable, so we disabled them in CI and shipped
> for two weeks without them.

Three things carry it. The exact error string, so the next person who hits it finds this instead of
starting over. A reproduction that runs as it stands. And a Context saying what it cost, which is what
decides whether anyone picks it up.

## What not to log

- **Your own unfinished work.** A TODO is not friction.
- **A bug you are about to fix.** Fix it.
- **Anything you cannot state concretely.** If there is no error text, no command, and no workaround,
  there is nothing for anyone to act on.
- **A preference with no cost.** "I would rather this were named differently" is friction only if the
  name actually misled you.

Noise is what makes a friction list get ignored, and an ignored list is the same as no list.
