# @frog/app

The GitHub App reports friction as issues, comments on pull requests, and tracks issue state. It never
writes repository contents: each repository owns those writes through its Frog workflow and
`GITHUB_TOKEN`.

## Security boundary

The App requests only these repository permissions:

| Permission    | Access | Purpose                                       |
| ------------- | ------ | --------------------------------------------- |
| Contents      | Read   | Read config and friction reports              |
| Issues        | Write  | Report friction and post coordination signals |
| Metadata      | Read   | Resolve repositories and default branches     |
| Pull requests | Read   | Inspect pull-request reports                  |

GitHub's Contents permission covers each selected repository, not only `.agents/friction-log`. Use
Action-only when that repository-wide read grant is not acceptable.

Source reconciliation runs in `.github/workflows/friction-log.yml`. The workflow grants
`contents: write`, `pull-requests: write`, and `id-token: write` to
`wevm/frog/reconcile@v1`; it grants no issue access.

The Action exchanges GitHub's OIDC token for a content-free snapshot. The Worker verifies the
repository id, repository name, default-branch ref, workflow, event, and exact commit before returning
only opaque occurrence hashes and issue state. Report bodies, paths, patches, commands, and GitHub
credentials never cross that boundary. The Action derives every change from its own exact checkout,
validates the resulting diff, and updates `frog/sync` with the repository's token.

Users who do not want to grant the App access can instead run `wevm/frog/action@v1`. Action-only reports
after merge with the repository's token and handles same-repository friction only.

## Why the App is richer

On a `pull_request` from a fork, `GITHUB_TOKEN` write permissions are downgraded to read after job-level
`permissions:` are resolved. An installation token is not subject to that clamp, so the App can still
report the fork's friction and comment on its pull request.

The App can also observe an issue closing in another installed repository. It wakes the source
repository's workflow, which removes the corresponding report through `frog/sync`. A same-repository
Action-only workflow cannot observe that event across the repository boundary.

## What each event does

| Trigger                                      | Behavior                                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pull_request` opened, reopened, synchronize | The App reports added or edited friction and posts or updates one App-owned comment. It writes nothing to the pull-request branch or source repository.        |
| Frog-owned report issue closes or reopens    | The App verifies a committed source binding, then creates or updates one App-owned coordination comment in the source repository.                              |
| Source `push`                                | The repository workflow checks the exact default-branch commit, asks the App to report pending friction, and reconciles returned issue state into `frog/sync`. |
| Coordination `issue_comment`                 | The repository workflow checks the exact App-owned control issue and signal comment, then fetches authoritative state through OIDC.                            |
| Manual or daily run                          | The repository workflow catches missed signals and reconciles the exact default-branch commit.                                                                 |

The pull-request head commit is read from the base repository, which GitHub makes reachable. That lets
the App read a fork's reports without installation access to the fork. Links land later through the
source repository's workflow.

Coordination comments are wakeup signals only. Their bodies do not select reports, repositories,
paths, or mutations.

Recovery records created before repository-owned snapshots cannot restore a reopened report without
accepting issue content from the App. Frog leaves those records deferred and asks the repository owner
to recreate the report manually from its issue.

## Cross-repo reporting

Reporting to another repository needs an installation there. No installation means no token, so the
App cannot report where it has not been installed.

Outbound reporting is enabled by default, but the receiving repository must opt in. A sender can
restrict its destinations with `outbound.allowedRepos`:

```jsonc
// .agents/friction-log/config.json in the reporting repository
{
  "outbound": { "allowedRepos": ["wevm/viem"] },
}
```

Without `allowedRepos`, every repository that accepts the sender is eligible. Set `outbound.enabled` to
`false` to switch outbound reporting off.

The receiving repository opts in separately:

```jsonc
// .agents/friction-log/config.json in the receiving repository
{
  "inbound": { "enabled": true, "allowFrom": ["wevm/*"] },
}
```

## Setup

The `Main` workflow creates the queues, deploys the Worker, and syncs its secrets on every push to
`main`. The remaining steps require a person:

1. **Create the App** from [`app.yml`](./app.yml) at `https://github.com/settings/apps/new`, or an
   organization's equivalent. Generate a webhook secret and private key.

   Updating this manifest does not change an existing App. In its GitHub settings, set Contents and
   Pull requests to read, Issues to write, Metadata to read, subscribe to Pull request and Issues
   events, and remove the Push event.

2. **Add the repository secrets** used by the deployment workflow:

   | Secret                  | Purpose                                                     |
   | ----------------------- | ----------------------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`  | Token with Workers Scripts edit and Queues edit             |
   | `CLOUDFLARE_ACCOUNT_ID` | Account to deploy into                                      |
   | `FROG_APP_ID`           | App id                                                      |
   | `FROG_PRIVATE_KEY`      | PEM private key; real newlines or escaped `\n` are accepted |
   | `FROG_WEBHOOK_SECRET`   | Webhook secret generated in step 1                          |

3. **Push to `main`**, then set the App webhook URL to `https://frog.wevm.dev/github`.

4. **Install the App** on repositories that record friction and repositories that receive
   cross-repository reports.

5. **Run `frog init`** in each source repository and add the GitHub App workflow from the root
   [`README.md`](../README.md). Enable Actions-created pull requests in the repository settings.

Deploying manually still works through `pnpm deploy`. Create the queues first:

```sh
pnpm exec wrangler queues create frog-webhooks
pnpm exec wrangler queues create frog-webhooks-dlq
```

`nodejs_compat` is enabled because Octokit uses Node built-ins and the package layer imports `node:fs`
for disk reads the App never takes. Run locally against workerd with `pnpm dev`.

## Delivery and retries

The webhook endpoint verifies the exact signed bytes, projects only fields Frog reads, and durably
enqueues each delivery before returning `202`. Issue events carry only their repository and number; the
consumer fetches current issue state after claiming the delivery, so a delayed close cannot undo a
later reopen.

The source wakeup uses one closed, App-owned coordination issue and one App-owned comment. The comment
contains only a digest of the delivery id. Repeated deliveries update the same resources.

The reconcile endpoint independently verifies GitHub OIDC and confirms the workflow commit is still the
default-branch head. A mismatch returns `409`, causing a later run to reconcile newer state.

Queue retries each failed webhook independently with bounded backoff. A Durable Object remembers
completed GitHub delivery ids and serializes App issue mutations. After 20 retries, Queue moves a poison
message to `frog-webhooks-dlq`, which deliberately has no consumer. Inspect and re-send its messages
from the Cloudflare dashboard before retention expires.

If the initial Queue write fails, the endpoint returns `503`. GitHub does not automatically retry failed
webhook deliveries; redeliver one from the App's **Recent deliveries** page after resolving the outage.

## Tests

Run from the repository root:

```sh
pnpm test --run app
```

Handlers run against a real HTTP server implementing the GitHub endpoints. Tests cover installation
boundaries, bot ownership, OIDC validation, webhook durability, and content-free reconciliation.
