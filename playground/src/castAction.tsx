import { Frog } from 'frog'
import { Button } from 'frog'

export const app = new Frog()
  .frame('/', (c) =>
    c.res({
      image: (
        <div
          tw="flex"
          style={{
            alignItems: 'center',
            background: 'linear-gradient(to right, #432889, #17101F)',
            backgroundSize: '100% 100%',
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
            Add Cast Action
          </div>
        </div>
      ),
      intents: [
        <Button.AddAction action="/action" name="Log This!" icon="log">
          Add
        </Button.AddAction>,
      ],
    }),
  )
  .action('/action', async (c) => {
    console.log(
      `Cast Action to ${JSON.stringify(c.actionData.castId)} from ${
        c.actionData.fid
      }`,
    )
    return c.res({ message: 'Action Succeeded' })
  })
