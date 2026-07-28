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
pnpx frog list    # what is already known
pnpx frog log     # add one
```

`pnpx frog log` writes the sections to fill in. Each id is when the friction was hit plus its title, so
the directory reads oldest-first.

Put anything that reproduces the friction in that entry's `artifacts/` and reference it from the
write-up, so the next reader runs the reproduction instead of rebuilding it.

## For Agents

Add this to `AGENTS.md`:

> Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `pnpx frog log`. Run `pnpx frog list` first to see what is already known.

Managed by [Frog](https://github.com/wevm/frog).
