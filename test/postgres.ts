import type * as PostgresStore from '../src/PostgresStore.js'

type Stored = { contents: string; dedupeKey: string; id: string; occurrences: number }

/** Small behavioral Postgres client used by adapter and contract tests. */
export class FakePostgresClient implements PostgresStore.Client {
  readonly queries: string[] = []
  readonly rows = new Map<string, Stored>()

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rowCount: number; rows: T[] }> {
    this.queries.push(text)
    if (text.startsWith('CREATE ')) return { rowCount: 0, rows: [] }

    const namespace = String(values[0])
    const key = (id: string) => `${namespace}\u0000${id}`
    if (text.includes('ON CONFLICT(namespace, dedupe_key)')) {
      const [, rawId, rawDedupe, rawContents] = values
      const id = String(rawId)
      const dedupeKey = String(rawDedupe)
      const existing = [...this.rows.entries()].find(
        ([storedKey, row]) =>
          storedKey.startsWith(`${namespace}\u0000`) && row.dedupeKey === dedupeKey,
      )?.[1]
      if (existing) {
        existing.occurrences += 1
        return {
          rowCount: 1,
          rows: [
            {
              contents: existing.contents,
              created: false,
              id: existing.id,
              occurrence_count: existing.occurrences,
            } as unknown as T,
          ],
        }
      }
      const stored = { contents: String(rawContents), dedupeKey, id, occurrences: 1 }
      this.rows.set(key(id), stored)
      return {
        rowCount: 1,
        rows: [
          { contents: stored.contents, created: true, id, occurrence_count: 1 } as unknown as T,
        ],
      }
    }
    if (text.startsWith('INSERT INTO')) {
      const [, rawId, rawDedupe, rawContents] = values
      const id = String(rawId)
      const previous = this.rows.get(key(id))
      this.rows.set(key(id), {
        contents: String(rawContents),
        dedupeKey: String(rawDedupe),
        id,
        occurrences: previous?.occurrences ?? 1,
      })
      return { rowCount: 1, rows: [] }
    }
    if (text.startsWith('SELECT id, contents')) {
      const selected =
        typeof values[1] === 'string'
          ? [this.rows.get(key(values[1]))].filter(Boolean)
          : [...this.rows.entries()]
              .filter(([storedKey]) => storedKey.startsWith(`${namespace}\u0000`))
              .map(([, row]) => row)
      return {
        rowCount: selected.length,
        rows: selected.map(
          (row) =>
            ({
              contents: row!.contents,
              id: row!.id,
              occurrence_count: row!.occurrences,
            }) as unknown as T,
        ),
      }
    }
    if (text.startsWith('SELECT id FROM')) {
      const selected = [...this.rows.entries()].filter(([storedKey]) =>
        storedKey.startsWith(`${namespace}\u0000`),
      )
      return {
        rowCount: selected.length,
        rows: selected.map(([, row]) => ({ id: row.id }) as unknown as T),
      }
    }
    if (text.startsWith('DELETE FROM')) {
      const removed = this.rows.delete(key(String(values[1])))
      return { rowCount: removed ? 1 : 0, rows: [] }
    }
    throw new Error(`Unhandled SQL: ${text}`)
  }
}
