# Friction log

Friction hit while working in this repository, one directory per item:

```
<id>/
  friction.md   the write-up
  artifacts/    optional, whatever reproduces it
```

Filing an entry gives it an owner. The write-up then carries an `issue:` link, mirrors what happens to
it, and the whole directory is deleted once the friction is resolved. So this is a live list of friction
that is still outstanding, including friction in dependencies.

Do not maintain an index here. This directory is the index, and it is kept true without anyone
remembering to.

## Logging Friction

```sh
frog list    # what is already known
frog log     # add one
```

Follow [`TEMPLATE.md`](./TEMPLATE.md). Ids are when the friction was hit plus its title, so this
directory reads oldest-first and shows at a glance how long something has gone unresolved.

Put anything that reproduces the friction in that entry's `artifacts/` and reference it from the
write-up, so the next reader runs the reproduction instead of rebuilding it.

## For Agents

Add this to `AGENTS.md`:

> Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `frog log`. Run `frog list` first to see what is already known.

Managed by [frog](https://github.com/wevm/frog).
