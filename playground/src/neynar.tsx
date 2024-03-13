import { Button, Frog } from 'frog'
import { neynar } from 'frog/middlewares'

export const neynarMiddleware = neynar({
  apiKey: 'NEYNAR_FROG_FM',
  features: ['interactor', 'cast'],
})

export const app = new Frog()
  .frame('/', (c) => {
    return c.res({
      action: '/guess',
      image: (
        <div
          style={{
            alignItems: 'center',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            fontSize: 48,
            height: '100%',
            width: '100%',
          }}
        >
          I can guess your name and follower count.
        </div>
      ),
      intents: [<Button>Go on</Button>],
    })
  })
  .frame('/guess', neynarMiddleware, (c) => {
    const { displayName, followerCount } = c.var.interactor || {}
    console.log('interactor: ', c.var.interactor)
    console.log('cast: ', c.var.cast)
    return c.res({
      image: (
        <div
          style={{
            alignItems: 'center',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            fontSize: 48,
            height: '100%',
            width: '100%',
          }}
        >
          Greetings {displayName}, you have {followerCount} followers.
        </div>
      ),
    })
  })
