import glob from 'fast-glob'

export async function findEntrypoint() {
  const [entrypoint] = await glob('./(api|src)/index.{js,jsx,ts,tsx}')
  return entrypoint
}
