import { Frog } from 'frog'

export const app = new Frog().action('/', async (c) => {
  console.log(`Cast Action to ${c.actionData.castId} from ${c.actionData.fid}`)
  return c.res({ message: 'Action Succeeded' })
})
