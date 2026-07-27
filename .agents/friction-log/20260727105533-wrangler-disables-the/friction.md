---
title: 'Wrangler disables the workers.dev URL when a route is added'
severity: 'minor'
---

## Description

Adding a `routes` entry to `wrangler.jsonc` silently disabled the `workers.dev` URL, which 404ed with no warning at the call site.

## Expectation

The route is additive, or the docs say plainly that it is not.

## Steps to reproduce

Add a `routes` entry without `workers_dev`, deploy, request the workers.dev URL.

## Suggestion

Set `workers_dev` explicitly in the config so the intent is visible.
