import { Button, Frog } from 'frog'

export const app = new Frog()

app
  .frame('/jump-to-root', (c) => {
    return c.res({
      action: '@/',
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Press a button to jump back!
        </div>
      ),
      intents: [<Button>Jump Back</Button>],
    })
  })
  .frame('/jump-to-clock', (c) => {
    return c.res({
      action: '@/clock',
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Press a button to jump back!
        </div>
      ),
      intents: [<Button>Jump to Clock</Button>],
    })
  })
  .frame('/jump-to-root-from-button', (c) => {
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          Press a button to jump back!
        </div>
      ),
      intents: [<Button action="@/">Jump to Root</Button>],
    })
  })
  .frame('/:name?', (c) => {
    const name = c.req.param('name')
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          gm, {name ?? 'froggie'}
        </div>
      ),
    })
  })
