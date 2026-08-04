import * as Entry from './Entry.js'
import * as Store from './Store.js'

/** A storage-independent friction logger. */
export type Frog = {
  /** Store used for every operation. */
  readonly store: Store.Store
  /** Logs one friction occurrence. */
  readonly log: (
    entry: Entry.serialize.Options,
    options?: Store.LogOptions,
  ) => Promise<Store.LogResult>
  /** Lists canonical friction entries with their occurrence counts. */
  readonly logs: () => Promise<readonly Store.StoredEntry[]>
}

/** Creates a friction logger that prepares its store before the first operation. */
export function create(options: create.Options): Frog {
  const store = options.store
  let migrated: Promise<void> | undefined
  const migrate = () => {
    if (migrated) return migrated
    const current = Promise.resolve().then(() => store.migrate())
    migrated = current.catch((error) => {
      migrated = undefined
      throw error
    })
    return migrated
  }
  return {
    store,
    async log(entry, logOptions = {}) {
      await migrate()
      return log(store, entry, logOptions)
    },
    async logs() {
      await migrate()
      return store.records()
    },
  }
}

export declare namespace create {
  /** Options for {@link create}. */
  type Options = {
    /** Store used for every operation. */
    store: Store.Store
  }
}

async function log(
  store: Store.Store,
  entry: Entry.serialize.Options,
  options: Store.LogOptions,
): Promise<Store.LogResult> {
  if (store.log) return store.log(entry, options)

  if (!options.force) {
    const duplicate = (await store.read()).find(
      (candidate) => Entry.normalizeTitle(candidate.title) === Entry.normalizeTitle(entry.title),
    )
    if (duplicate)
      return {
        created: false,
        entry: duplicate,
        location: store.location(duplicate.id),
        occurrences: 1,
      }
  }

  const written = await store.write(entry)
  return {
    created: true,
    entry: await store.get(written.id),
    location: written.location,
    occurrences: 1,
  }
}
