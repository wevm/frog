import { Frog } from 'frog'

export const app = new Frog({
  hubApiUrl: 'https://api.hub.wevm.dev',
})

app.frame('/:name', (c) => {
  const name = c.req.param('name')
  return c.res({
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        gm, {name}
      </div>
    ),
  })
})
