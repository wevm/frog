import * as store from './store.js'

test('behavior: the file store remains the zero-configuration default', async () => {
  expect(store.configuration({})).toEqual({ kind: 'file' })
  expect(store.configuration({ DATABASE_URL: 'postgres://localhost/example' })).toEqual({
    kind: 'file',
  })
})

test('behavior: FROG_DATABASE_URL selects Postgres with an overridable namespace', () => {
  expect(store.configuration({ FROG_DATABASE_URL: 'postgres://localhost/example' })).toEqual({
    connectionString: 'postgres://localhost/example',
    kind: 'postgres',
    namespace: 'default',
  })
  expect(
    store.configuration({
      FROG_DATABASE_URL: 'postgres://localhost/example',
      FROG_NAMESPACE: 'agent',
      FROG_SCHEMA: 'private',
    }),
  ).toEqual({
    connectionString: 'postgres://localhost/example',
    kind: 'postgres',
    namespace: 'agent',
    schema: 'private',
  })
})
