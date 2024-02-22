import { Frog } from 'frog'

export const app = new Frog({
  hubApiUrl: 'https://api.hub.wevm.dev',
})

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
