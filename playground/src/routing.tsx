import { Frog } from 'frog'

export const app = new Frog()

app.frame('/:name', (context) => {
  const name = context.request.param('name')
  return {
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        gm, {name}
      </div>
    ),
  }
})
