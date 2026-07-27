/** Caching for network lookups, injected so the CLI and the App can store it differently. */
export * as Cache from './Cache.js'

/**
 * Config for a repository: whether it accepts inbound friction, where its own friction is filed,
 * and what automation may do unattended.
 */
export * as Config from './Config.js'

/** The entry format: frontmatter, body, ids, and title normalization. */
export * as Entry from './Entry.js'

/** Parses a project's GitHub issue form and renders the entry scaffold it implies. */
export * as IssueForm from './IssueForm.js'

/** Git queries and mutations the CLI needs. The App uses the GitHub API instead. */
export * as Git from './Git.js'

/** Issue rendering, the dedupe marker, and create-or-comment. Transport-agnostic. */
export * as Github from './Github.js'

/** Recovery records for entries removed when their mirrored issues close. */
export * as Mirrors from './Mirrors.js'

/** Reading and writing entries under `.agents/friction-log`. */
export * as Store from './Store.js'

/** Reconciling local entries against issue state, as a pure plan both adapters can apply. */
export * as Sync from './Sync.js'

/** Resolving where an entry's issue belongs, and every consent gate on the way. */
export * as Target from './Target.js'
