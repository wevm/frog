/** @jsx jsx */
/** @jsxImportSource hono/jsx */
/** @jsxFrag */

import { Button, Framework, TextInput } from 'farc'

const app = new Framework()

app.frame('/', ({ status }) => {
  return {
    image: (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(to right, #432889, #17101F)',
          backgroundSize: '100% 100%',
          display: 'flex',
          flexDirection: 'column',
          flexWrap: 'nowrap',
          height: '100%',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            lineHeight: 1.4,
            marginTop: 30,
            padding: '0 120px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {status === 'response' ? 'Nice choice.' : 'Welcome!'}
        </div>
      </div>
    ),
    intents: (
      <>
        <Button>Apples</Button>
        <Button>Oranges</Button>
        <TextInput placeholder="Enter custom fruit..." />
      </>
    ),
  }
})

app.frame('/no-intents', () => {
  return {
    image: (
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        foo
      </div>
    ),
  }
})

export default {
  port: 3001,
  fetch: app.fetch,
}
