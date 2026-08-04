import type * as Store from '../src/Store.js'

type Stored = { contents: string; dedupeKey: string; id: string; occurrences: number }

/** Small behavioral Postgres client used by store and contract tests. */
export type FakePostgresClient = Store.postgres.Client & {
  /** SQL statements issued through the client. */
  readonly queries: string[]
  /** Rows persisted by the fake client. */
  readonly rows: Map<string, Stored>
}

/** Creates a behavioral Postgres client for store and contract tests. */
export function fakePostgresClient(): FakePostgresClient {
  const queries: string[] = []
  const rows = new Map<string, Stored>()
  return {
    queries,
    rows,
    async query<T extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values: unknown[] = [],
    ): Promise<{ rowCount: number; rows: T[] }> {
      queries.push(text)
      if (text.startsWith('CREATE ')) return { rowCount: 0, rows: [] }

      const namespace = String(values[0])
      const key = (id: string) => `${namespace}\u0000${id}`
      if (text.includes('ON CONFLICT(namespace, dedupe_key)')) {
        const [, rawId, rawDedupe, rawContents] = values
        const id = String(rawId)
        const dedupeKey = String(rawDedupe)
        const existing = [...rows.entries()].find(
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
        rows.set(key(id), stored)
        return {
          rowCount: 1,
          rows: [
            { contents: stored.contents, created: true, id, occurrence_count: 1 } as unknown as T,
          ],
        }
      }
      if (text.startsWith('INSERT INTO')) {
        const [, rawId, rawDedupe, rawContents, rawTitleDedupe] = values
        const id = String(rawId)
        const previous = rows.get(key(id))
        rows.set(key(id), {
          contents: String(rawContents),
          dedupeKey:
            previous?.dedupeKey.startsWith('title:') && typeof rawTitleDedupe === 'string'
              ? rawTitleDedupe
              : (previous?.dedupeKey ?? String(rawDedupe)),
          id,
          occurrences: previous?.occurrences ?? 1,
        })
        return { rowCount: 1, rows: [] }
      }
      if (text.startsWith('SELECT id, contents')) {
        const selected =
          typeof values[1] === 'string'
            ? [rows.get(key(values[1]))].filter(Boolean)
            : [...rows.entries()]
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
        const selected = [...rows.entries()].filter(([storedKey]) =>
          storedKey.startsWith(`${namespace}\u0000`),
        )
        return {
          rowCount: selected.length,
          rows: selected.map(([, row]) => ({ id: row.id }) as unknown as T),
        }
      }
      if (text.startsWith('DELETE FROM')) {
        const id = String(values[1])
        const removed = rows.delete(key(id))
        return {
          rowCount: removed ? 1 : 0,
          rows: removed ? ([{ id }] as unknown as T[]) : [],
        }
      }
      throw new Error(`Unhandled SQL: ${text}`)
    },
  }
}
