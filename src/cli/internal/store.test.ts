import * as store from './store.js'

test('behavior: the file store remains the zero-configuration default', async () => {
  await expect(store.resolve({})).resolves.toBeUndefined()
  await expect(store.resolve({ FROG_STORE: 'file' })).resolves.toBeUndefined()
})

test('error: Postgres selection requires an explicit namespace and database URL', async () => {
  await expect(store.resolve({ FROG_STORE: 'redis' })).rejects.toThrow('Use `file` or `postgres`')
  await expect(store.resolve({ FROG_STORE: 'postgres' })).rejects.toThrow(
    'requires FROG_DATABASE_URL or DATABASE_URL',
  )
  await expect(
    store.resolve({ DATABASE_URL: 'postgres://localhost/example', FROG_STORE: 'postgres' }),
  ).rejects.toThrow('requires FROG_NAMESPACE')
})
