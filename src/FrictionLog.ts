import * as Entry from './Entry.js'
import * as Store from './Store.js'

/** One canonical entry and the number of times it has been observed. */
export type StoredEntry = Store.StoredEntry

/** Result of recording one friction occurrence. */
export type RecordResult = StoredEntry & {
  /** Whether this call created a new entry. */
  created: boolean
}

export type Adapter = Store.Adapter & {
  /** Optional atomic deduplication supplied by durable adapters. */
  record?(
    entry: Entry.serialize.Options,
    options?: { force?: boolean | undefined },
  ): Promise<RecordResult>
}

/** A storage-independent friction log for applications, CLIs, and agents. */
export class FrictionLog {
  readonly store: Adapter

  constructor(options: { root?: string | undefined; store?: Adapter | undefined } = {}) {
    this.store = options.store ?? Store.adapter({ root: options.root ?? process.cwd() })
  }

  list(): Promise<readonly Entry.Entry[]> {
    return this.store.read()
  }

  /** Lists canonical entries with occurrence counts when the store tracks them. */
  async records(): Promise<readonly StoredEntry[]> {
    if (this.store.records) return this.store.records()
    return (await this.store.read()).map((entry) => ({ entry, occurrences: 1 }))
  }

  get(id: string): Promise<Entry.Entry> {
    return this.store.get(id)
  }

  async record(
    entry: Entry.serialize.Options,
    options: { force?: boolean | undefined } = {},
  ): Promise<RecordResult> {
    if (this.store.record) return this.store.record(entry, options)

    if (!options.force) {
      const duplicate = (await this.store.read()).find(
        (candidate) => Entry.normalizeTitle(candidate.title) === Entry.normalizeTitle(entry.title),
      )
      if (duplicate) return { created: false, entry: duplicate, occurrences: 1 }
    }

    const written = await this.store.write(entry)
    return { created: true, entry: await this.store.get(written.id), occurrences: 1 }
  }

  async update(id: string, entry: Entry.serialize.Options): Promise<Entry.Entry> {
    await this.store.write(entry, { id })
    return this.store.get(id)
  }

  remove(id: string): Promise<boolean> {
    return this.store.remove(id)
  }
}
