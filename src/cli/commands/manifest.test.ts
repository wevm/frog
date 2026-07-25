import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Config from '../../Config.js'
import * as Manifest from '../../Manifest.js'

const repo = 'wevm/viem'
const remote = `git@github.com:${repo}.git`

test('behavior: renders a document a consumer would accept', async () => {
  const cwd = await helpers.repo({ remote })
  await helpers.writeFile('package.json', JSON.stringify({ name: 'viem' }), cwd)

  const document = await cli.data<Manifest.Document>(['manifest', '--cwd', cwd])

  expect(document).toMatchInlineSnapshot(`
    {
      "inbound": true,
      "name": "viem",
      "packages": [
        "viem",
      ],
      "repo": "wevm/viem",
      "version": 1,
    }
  `)
  // The round trip that matters: what a project serves is what a consumer resolves.
  expect(Manifest.from(document)).toMatchObject({ inbound: { enabled: true }, repo })
})

test('behavior: speaks for several packages', async () => {
  const cwd = await helpers.repo({ remote })
  await helpers.writeFile('package.json', JSON.stringify({ name: 'viem' }), cwd)

  const document = await cli.data<Manifest.Document>([
    'manifest',
    '--package',
    'viem',
    '--package',
    'ox',
    '--cwd',
    cwd,
  ])

  expect(document.packages).toEqual(['viem', 'ox'])
})

test('behavior: carries the labels and site from config', async () => {
  const cwd = await helpers.repo({ remote })
  await helpers.writeFile(
    Config.file,
    JSON.stringify({
      inbound: { enabled: true, labels: ['friction', 'dx'] },
      site: 'https://viem.sh',
    }),
    cwd,
  )

  const document = await cli.data<Manifest.Document>(['manifest', '--cwd', cwd])

  expect(document).toMatchObject({ docs: 'https://viem.sh', labels: ['friction', 'dx'] })
})

test('error: no repository to file on', async () => {
  const cwd = await helpers.repo()
  expect((await cli.error(['manifest', '--cwd', cwd])).code).toBe('NO_REPO')
})

describe('init --library', () => {
  test('behavior: opts the repository in and prints the field to declare', async () => {
    const cwd = await helpers.repo({ remote })

    const result = await cli.data<{ declare?: string }>(['init', '--library', '--cwd', cwd])

    expect((await Config.resolve({ root: cwd })).inbound.enabled).toBe(true)
    expect(result.declare).toMatchInlineSnapshot(`
      "{
        "frog": {
          "inbound": true,
          "repo": "wevm/viem"
        }
      }"
    `)
  })

  test('behavior: the printed field is one a consumer resolves', async () => {
    const cwd = await helpers.repo({ remote })
    const result = await cli.data<{ declare: string }>(['init', '--library', '--cwd', cwd])

    const field = (JSON.parse(result.declare) as { frog: unknown }).frog
    expect(Manifest.from(field)).toMatchObject({ inbound: { enabled: true }, repo })
  })

  test('behavior: without --library the repository does not accept reports', async () => {
    const cwd = await helpers.repo({ remote })
    await cli.data(['init', '--cwd', cwd])

    expect((await Config.resolve({ root: cwd })).inbound.enabled).toBe(false)
  })
})
