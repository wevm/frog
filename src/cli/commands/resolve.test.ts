import * as cli from '../../../test/cli.js'
import * as helpers from '../../../test/helpers.js'
import * as Store from '../../Store.js'

test('behavior: removes one resolved entry', async () => {
  const cwd = await helpers.repo()
  await Store.write(
    { body: 'The workaround is no longer needed.', severity: 'minor', title: 'Resolved' },
    { id: 'resolved', root: cwd },
  )

  await expect(cli.data(['resolve', 'resolved', '--cwd', cwd])).resolves.toEqual({
    id: 'resolved',
    removed: true,
  })
  await expect(Store.list({ root: cwd })).resolves.toEqual([])
  await expect(cli.data(['resolve', 'resolved', '--cwd', cwd])).resolves.toEqual({
    id: 'resolved',
    removed: false,
  })
})
