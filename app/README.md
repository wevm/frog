# @frictionsets/app

The GitHub App. Files recorded friction as issues, and keeps the files and the issues in sync.

## Why an App rather than an Action

On a `pull_request` from a fork, `GITHUB_TOKEN`'s write permissions are downgraded to read _after_
job-level `permissions:` are resolved, so `issues: write` in a workflow is silently ignored and filing
returns 403. An App authenticates as an installation and is never subject to that clamp.

It is also the only thing that can react to `issues.closed`, which is what deletes an entry once the
friction is resolved. A workflow cannot observe that at all on another repository.

## What each event does

| Event                                        | Behavior                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pull_request` opened, reopened, synchronize | Files the entries the pull request introduces. Posts or updates one comment. Writes nothing to the branch. |
| `push` to the default branch                 | Files anything still pending and commits the `issue:` links.                                               |
| `issues` closed, reopened, edited            | Reconciles the files mirroring that issue, in whichever repository holds them.                             |

The head commit is read from the **base** repository, which GitHub makes it reachable from. That is what
lets a fork's entries be read without the installation having any access to the fork.

Nothing is written to a pull request branch: a commit there would trigger `synchronize` and run the
handler again, and a fork's branch is unreachable anyway. Links land when the work does.

## Cross-repo filing

Filing on another repository needs an installation there. No installation means no token, so the App
cannot file where it has not been installed — consent enforced by GitHub rather than by configuration.

Beyond that it stays opt-in on the sender's side. Add the target to `outbound.allowedRepos`, and set
`outbound.auto` to file without a human:

```jsonc
// .agents/frictionsets/config.json in the reporting repository
{
  "outbound": { "allowedRepos": ["wevm/viem"], "auto": true },
}
```

`auto` is off by default because an entry written in a private repository can carry detail that should
not become a public issue unread. Within one organization that risk does not apply, so `wevm/*` on both
sides gives unattended reporting.

The receiving repository opts in separately:

```jsonc
// .agents/frictionsets/config.json in the receiving repository
{
  "inbound": { "enabled": true, "allowFrom": ["wevm/*"] },
}
```

## Setup

1. **Create the App** from [`app.yml`](./app.yml) at `https://github.com/settings/apps/new`, or an
   organization's equivalent. Set the webhook URL to `https://<deployment>/api/webhook` and generate a
   webhook secret and a private key.
2. **Deploy** this directory to Vercel, with:

   | Variable         | Value                                                 |
   | ---------------- | ----------------------------------------------------- |
   | `APP_ID`         | The App's id.                                         |
   | `PRIVATE_KEY`    | The PEM private key. Newlines may be escaped as `\n`. |
   | `WEBHOOK_SECRET` | The webhook secret.                                   |

3. **Install** it on the repositories that record friction, and on any repository that should receive
   friction from them.
4. **Run `frictionsets init`** in each repository, so the App has a config and a directory to read.

## Redelivery is safe

A handler that throws returns 500, and GitHub redelivers. Every handler is idempotent: filing comments
on the issue already covering a friction rather than opening another, and reconciliation converges, so a
redelivery repeats the work harmlessly.

## Tests

Run from the repository root. The handlers are exercised against a real HTTP server implementing the
GitHub endpoints, including the git object model, so a commit is asserted by reading the branch back.

```sh
pnpm test --run app
```
