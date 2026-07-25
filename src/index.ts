/**
 * Config for a repository: whether it accepts inbound friction, where its own friction is filed,
 * and what automation may do unattended.
 */
export * as Config from './Config.js'

/** The frictionset file format: frontmatter, body, ids, and title normalization. */
export * as Frictionset from './Frictionset.js'

/** Git queries and mutations the CLI needs. The App uses the GitHub API instead. */
export * as Git from './Git.js'

/** Issue rendering, the dedupe marker, and create-or-comment. Transport-agnostic. */
export * as Github from './Github.js'

/** Reading and writing entries under `.agents/frictionsets`. */
export * as Store from './Store.js'
