import { Frog } from 'frog'

export const app = new Frog()

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
