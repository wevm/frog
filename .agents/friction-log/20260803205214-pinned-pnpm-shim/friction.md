---
title: 'Pinned pnpm shim points to a missing binary'
severity: 'minor'
---

## Expected Behavior

Running pnpm check uses the packageManager-pinned pnpm version.

## Current Behavior

The user-level pnpm shim exits with ENOENT because its .tools binary is missing, while corepack pnpm works.

## Possible Solution

Make the shim repair itself or document corepack pnpm as the reliable repository entrypoint.

## Minimal Reproducible Example

From the repository root, run pnpm check.

## Context

This interrupted the standard verification workflow and required switching runners.
