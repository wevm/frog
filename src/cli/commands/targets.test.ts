import http from 'node:http'
import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Manifest from '../../Manifest.js'

type Listed = { targets: { kind: string; name: string; repo: string }[] }

/** Declares a dependency, and installs it with the given `frictionsets` field. */
async function install(
  cwd: string,
  name: string,
  options: { frictionsets?: unknown; homepage?: string } = {},
): Promise<void> {
  await helpers.writeFile(
    `node_modules/${name}/package.json`,
    JSON.stringify({
      name,
      ...(options.frictionsets ? { frictionsets: options.frictionsets } : {}),
      ...(options.homepage ? { homepage: options.homepage } : {}),
    }),
    cwd,
  )
}

async function declare(cwd: string, dependencies: Record<string, string>): Promise<void> {
  await helpers.writeFile('package.json', JSON.stringify({ dependencies, name: 'app' }), cwd)
}

test('behavior: lists dependencies that accept reports', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { ox: '^1.0.0', typescript: '^5.0.0', viem: '^2.0.0' })
  await install(cwd, 'viem', { frictionsets: { inbound: true, repo: 'wevm/viem' } })
  await install(cwd, 'ox', { frictionsets: { inbound: true, repo: 'wevm/ox' } })
  await install(cwd, 'typescript')

  expect(await cli.data<Listed>(['targets', '--cwd', cwd])).toMatchInlineSnapshot(`
    {
      "targets": [
        {
          "kind": "npm",
          "name": "ox",
          "repo": "wevm/ox",
        },
        {
          "kind": "npm",
          "name": "viem",
          "repo": "wevm/viem",
        },
      ],
    }
  `)
})

test('behavior: skips a dependency that has opted out', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { viem: '^2.0.0' })
  await install(cwd, 'viem', { frictionsets: { inbound: false, repo: 'wevm/viem' } })

  expect((await cli.data<Listed>(['targets', '--cwd', cwd])).targets).toEqual([])
})

test('behavior: no dependencies lists nothing', async () => {
  expect((await cli.data<Listed>(['targets', '--cwd', await helpers.repo()])).targets).toEqual([])
})

test('behavior: does not touch the network without --probe', async () => {
  const cwd = await helpers.repo()
  await declare(cwd, { viem: '^2.0.0' })
  // An unroutable homepage: reaching for it at all would fail or hang.
  await install(cwd, 'viem', { homepage: 'http://127.0.0.1:1' })

  expect((await cli.data<Listed>(['targets', '--cwd', cwd])).targets).toEqual([])
})

test('behavior: --probe finds a project that only advertises on its site', async () => {
  const cwd = await helpers.repo()

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname !== `/${Manifest.wellKnown}`) {
      response.writeHead(404)
      response.end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ inbound: true, name: 'viem', repo: 'wevm/viem', version: 1 }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Server has no port.')
  const origin = `http://127.0.0.1:${address.port}`

  await declare(cwd, { viem: '^2.0.0' })
  await install(cwd, 'viem', { homepage: `${origin}/docs` })

  const result = await cli.data<Listed>(['targets', '--probe', '--cwd', cwd], {
    XDG_CACHE_HOME: await helpers.tmpdir(),
  })

  expect(result.targets).toEqual([{ kind: 'well-known', name: origin, repo: 'wevm/viem' }])
})
