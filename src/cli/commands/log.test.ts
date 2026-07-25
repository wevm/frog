import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Store from '../../Store.js'

const title = '`pnpm test -- <files>` ignores file filters'
const body = '## Description\n\nThe filter was swallowed.'

type Logged = { file: string; id: string; title: string }

test('behavior: writes an entry', async () => {
  const cwd = await helpers.repo()
  const result = await cli.data<Logged>(['log', title, '--body', body, '--cwd', cwd])

  expect(result.title).toBe(title)
  expect(result.file).toBe(`.agents/frictionsets/${result.id}.md`)

  expect(await Store.get(result.id, { root: cwd })).toMatchObject({
    body,
    severity: 'minor',
    title,
  })
})

test('behavior: records severity, target, and labels', async () => {
  const cwd = await helpers.repo()
  const { id } = await cli.data<Logged>([
    'log',
    title,
    '--body',
    body,
    '--severity',
    'blocker',
    '--target',
    'viem',
    '--label',
    'tooling',
    '--label',
    'tests',
    '--cwd',
    cwd,
  ])

  expect(await Store.get(id, { root: cwd })).toMatchObject({
    labels: ['tooling', 'tests'],
    severity: 'blocker',
    target: 'viem',
  })
})

test('error: a title is required', async () => {
  const cwd = await helpers.repo()
  expect(await cli.error(['log', '--body', body, '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "code": "MISSING_TITLE",
      "message": "A title is required.",
    }
  `)
})

test('error: a body is required when not interactive', async () => {
  const cwd = await helpers.repo()
  expect(await cli.error(['log', title, '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "code": "MISSING_BODY",
      "message": "A body is required. An entry with no detail is not actionable.",
    }
  `)
})

test('error: an unknown severity is rejected before anything is written', async () => {
  const cwd = await helpers.repo()
  const result = await cli.error([
    'log',
    title,
    '--body',
    body,
    '--severity',
    'catastrophic',
    '--cwd',
    cwd,
  ])

  expect(result.code).toBe('VALIDATION_ERROR')
  expect(await Store.list({ root: cwd })).toEqual([])
})

describe('duplicates', () => {
  // The failure this exists to prevent: a flat friction log recorded the same Docker subnet
  // exhaustion five times, because nothing checked.
  test('error: refuses a differently-punctuated repeat', async () => {
    const cwd = await helpers.repo()
    const { id } = await cli.data<Logged>([
      'log',
      'pnpm test ignores filters',
      '--body',
      body,
      '--cwd',
      cwd,
    ])

    const result = await cli.error([
      'log',
      '  PNPM   test ignores filters!  ',
      '--body',
      body,
      '--cwd',
      cwd,
    ])

    expect(result.code).toBe('DUPLICATE_FRICTION')
    expect(result.message).toBe(`\`${id}\` already records this.`)
    expect(await Store.list({ root: cwd })).toEqual([id])
  })

  test('behavior: --force logs it anyway', async () => {
    const cwd = await helpers.repo()
    await cli.data(['log', title, '--body', body, '--cwd', cwd])
    await cli.data(['log', title, '--body', body, '--force', '--cwd', cwd])

    expect(await Store.list({ root: cwd })).toHaveLength(2)
  })

  test('behavior: a genuinely different title is allowed', async () => {
    const cwd = await helpers.repo()
    await cli.data(['log', 'pnpm test ignores filters', '--body', body, '--cwd', cwd])
    await cli.data(['log', 'pnpm build ignores filters', '--body', body, '--cwd', cwd])

    expect(await Store.list({ root: cwd })).toHaveLength(2)
  })
})
