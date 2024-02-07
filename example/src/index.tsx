/** @jsx jsx */
/** @jsxImportSource hono/jsx */
/** @jsxFrag */

import { Button, Framework } from '@wevm/framework'

const app = new Framework()

app.frame('/', ({ untrustedData }) => {
  const { buttonIndex } = untrustedData || {}
  console.log('buttonIndex', buttonIndex)
  return {
    image: (
      <div
        style={{
          backgroundColor: 'black',
          backgroundSize: '150px 150px',
          height: '100%',
          width: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexWrap: 'nowrap',
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontStyle: 'normal',
            letterSpacing: '-0.025em',
            color: 'white',
            marginTop: 30,
            padding: '0 120px',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {typeof buttonIndex === 'number'
            ? `Button Index: ${buttonIndex}`
            : 'Welcome!'}
        </div>
      </div>
    ),
    intents: (
      <>
        <Button>Apples</Button>
        <Button>Oranges</Button>
        <Button>{`Last index: ${
          buttonIndex ? buttonIndex.toString() : 'none'
        }`}</Button>
      </>
    ),
  }
})

export default {
  port: 3001,
  fetch: app.fetch,
}
