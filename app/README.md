# @frog/app

The GitHub App. Files recorded friction as issues, and keeps the files and the issues in sync.

## Why an App rather than an Action

On a `pull_request` from a fork, `GITHUB_TOKEN`'s write permissions are downgraded to read _after_
job-level `permissions:` are resolved, so `issues: write` in a workflow is silently ignored and filing
returns 403. An App authenticates as an installation and is never subject to that clamp.

It is also the only thing that can react to `issues.closed`, which is what deletes an entry once the
friction is resolved. A workflow cannot observe that at all on another repository.

## What each event does

| Event                                        | Behavior                                                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pull_request` opened, reopened, synchronize | Files the entries the pull request adds or edits, comparing its head against its base. Posts or updates one comment, and none at all when it changes no entry. Writes nothing to the branch. |
| `push` to the default branch                 | Files anything still pending and commits the `issue:` links.                                                                                                                                 |
| `issues` closed, reopened, edited            | Reconciles the files mirroring that issue, in whichever repository holds them. Commits to the default branch, or opens one accumulating pull request when `pullRequest` is set.              |

The head commit is read from the **base** repository, which GitHub makes it reachable from. That is what
lets a fork's entries be read without the installation having any access to the fork.

Nothing is written to a pull request branch: a commit there would trigger `synchronize` and run the
handler again, and a fork's branch is unreachable anyway. Links land when the work does.

## A protected default branch

Committing straight to the default branch would keep the log true the moment an issue closes, but a
protected branch refuses that push and the deletion simply fails.

So it does not. The App commits to one long-lived branch and keeps a single pull request open against it,
accumulating: close three issues and there is one review to merge, not three.

```jsonc
// .agents/friction-log/config.json
{
  // name the branch, rather than the default `frog/sync`
  "pullRequest": { "branch": "chore/friction" },
  // or commit straight to the default branch, where nothing protects it
  "pullRequest": false,
}
```

Merging is what keeps the log true, so an unmerged pull request means the log still lists friction that is
already resolved.

## Cross-repo filing

Filing on another repository needs an installation there. No installation means no token, so the App
cannot file where it has not been installed: consent enforced by GitHub rather than by configuration.

Beyond that it stays opt-in on the sender's side. Add the target to `outbound.allowedRepos`, and set
`outbound.auto` to file without a human:

```jsonc
// .agents/friction-log/config.json in the reporting repository
{
  "outbound": { "allowedRepos": ["wevm/viem"], "auto": true },
}
```

`auto` is off by default because an entry written in a private repository can carry detail that should
not become a public issue unread. Within one organization that risk does not apply, so `wevm/*` on both
sides gives unattended reporting.

The receiving repository opts in separately:

```jsonc
// .agents/friction-log/config.json in the receiving repository
{
  "inbound": { "enabled": true, "allowFrom": ["wevm/*"] },
}
```

## Setup

Deployed as a Cloudflare Worker by the `Main` workflow, which creates the queues, deploys, and syncs the
secrets on every push to `main`. What is left is the part only a person can do.

1. **Create the App** from [`app.yml`](./app.yml) at `https://github.com/settings/apps/new`, or an
   organization's equivalent. Generate a webhook secret and a private key. The webhook URL is filled in
   after the first deploy.

2. **Add the repository secrets** the workflow reads:

   | Secret                  | What it is                                                                 |
   | ----------------------- | -------------------------------------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`  | A token with Workers Scripts edit and Queues edit                          |
   | `CLOUDFLARE_ACCOUNT_ID` | The account to deploy into                                                 |
   | `FROG_APP_ID`           | The App id                                                                 |
   | `FROG_PRIVATE_KEY`      | The PEM private key. Real newlines are fine; escaped `\n` is also accepted |
   | `FROG_WEBHOOK_SECRET`   | The webhook secret generated in step 1                                     |

3. **Push to `main`**, and point the App's webhook URL at the resulting
   `https://<worker>.workers.dev/`.

4. **Install** the App on the repositories that record friction, and on any repository that should
   receive friction from them.

5. **Run `frog init`** in each repository, so the App has a config and a directory to read.

Deploying by hand still works, and is what `pnpm deploy` does. It needs the queues to exist first:

```sh
pnpm exec wrangler queues create frog-webhooks
pnpm exec wrangler queues create frog-webhooks-dlq
```

`nodejs_compat` is enabled because the title hash uses `node:crypto`, and the package layer imports
`node:fs` for the disk reads the App never takes. The bundle is around 200 KiB gzipped.

Run it locally against a real workerd with `pnpm dev`.

## Delivery and retries

The endpoint verifies the exact signed bytes, projects only the fields Frog reads, and awaits a durable
Queue write before returning `202`. Issue events carry only their repository and number; the consumer
fetches current issue state after claiming the delivery, so a delayed close cannot undo a later reopen.

Queue retries each failed message independently with bounded backoff. A Durable Object remembers
completed GitHub delivery ids and serializes repository mutations, while occurrence markers make an
ambiguous issue or comment write replay-safe. After 20 retries, Queue moves a poison message to
`frog-webhooks-dlq`, which deliberately has no consumer. Inspect and re-send its messages from the
Cloudflare dashboard before retention expires: 24 hours on Free, or four days by default on Paid.

If the initial Queue write itself fails, the endpoint returns `503`. GitHub does not automatically retry
failed webhook deliveries; redeliver one from the App's **Recent deliveries** page after resolving the
outage. The same manual redelivery also recovers a dead-lettered event when its GitHub delivery is still
available.

## Tests

Run from the repository root. The handlers are exercised against a real HTTP server implementing the
GitHub endpoints, including the git object model, so a commit is asserted by reading the branch back.

```sh
pnpm test --run app
```
