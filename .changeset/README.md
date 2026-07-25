# Changesets

This directory holds [changesets](https://github.com/changesets/changesets): a file per change that
affects the published package, describing it in the words a consumer would want to read.

Add one with `pnpm changeset`. `privatePackages` is off, so `@frog/app` is never versioned or
published from here.

Not to be confused with `.agents/friction-log`, which records friction rather than releases. The two
work the same way on purpose: a file per item, consumed by a step that turns it into something durable.
