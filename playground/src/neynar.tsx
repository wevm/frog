import { Button, Frog } from 'frog'
import { createNeynar } from 'frog/middlewares'

export const neynar = createNeynar({ apiKey: 'NEYNAR_FROG_FM' })

export const app = new Frog({ hub: neynar.hub(), title: 'Neynar' })

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
  .frame(
    '/guess',
    neynar.middleware({ features: ['cast', 'interactor'] }),
    (c) => {
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
    },
  )
