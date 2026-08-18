---
title: 'Focused CLI tests require a container runtime'
severity: 'minor'
---

## Expected Behavior

Focused CLI tests run without unrelated database infrastructure.

## Current Behavior

`pnpm test src/cli/commands/log.test.ts` starts Testcontainers during module setup and fails before collecting any CLI tests when no container runtime is available.

## Possible Solution

Initialize the Postgres helper only for durable-store tests, or isolate those cases in a database-specific suite.

## Minimal Reproducible Example

Run `pnpm test src/cli/commands/log.test.ts` without Docker or another compatible container runtime.

## Context

This blocked focused validation of a local `frog log` CLI change; typechecking and non-container checks remain available.
