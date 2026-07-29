# frog

## 1.0.12

### Patch Changes

- d10576b: Updated package.

## 1.0.11

### Patch Changes

- ecd5969: Updated setup documentation and generated agent guidance to prefer standalone installation while retaining project package-manager commands.

## 1.0.10

### Patch Changes

- cbe013a: Added standalone executables with verified installers, short install URLs, and in-place updates.

## 1.0.9

### Patch Changes

- 5f8dc73: Used the project package manager for generated Frog commands when declared.

## 1.0.8

### Patch Changes

- 1aa72b2: Removed the bundled skill and used package-manager runners in installation and generated repository guidance.

## 1.0.7

### Patch Changes

- 78b0c57: Enabled inbound logs by default in `frog init`, replacing `--library` with `--no-inbound` for opting out.
- 4571e72: Fixed App reconciliation and pull-request comments, and moved major Action tags with compatible releases.

## 1.0.6

### Patch Changes

- 3bb2b8b: Added least-privilege GitHub App reconciliation, enabled receiver-gated outbound reporting by default, and hardened issue matching, branch validation, and artifact deletion.
- ae294c1: Removed automation setup guidance from generated friction log READMEs.

## 1.0.5

### Patch Changes

- 425454f: Added a default friction issue form to every `frog init` scaffold.

## 1.0.4

### Patch Changes

- 74df03e: Added action-only automation and setup guidance, idempotent occurrence tracking, git identity preflights, coded deferrals, resilient reconciliation, and richer CLI outputs for same-repository friction.
- 2cb0be3: Directed agents to install the GitHub App and update `AGENTS.md` after `init`.

## 1.0.3

### Patch Changes

- f674db4: Updated `incur` to 0.4.20.

## 1.0.2

### Patch Changes

- 13dfe8f: Pointed `init` at the GitHub App installation, in its call to action and in the friction log it scaffolds.

## 1.0.1

### Patch Changes

- a782daf: Updated config.

## 1.0.0

### Major Changes

- 1dee793: Initial release
