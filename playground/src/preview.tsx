import { Button, Frog } from 'frog'

export const app = new Frog().frame(
  '/',
  (c) => {
    return c.res({
      action: '/not-preview',
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
          DC Frame
        </div>
      ),
      intents: [<Button>Yoink</Button>],
    })
  },
  {
    preview: {
      action: '/not-preview',
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
          DC Preview
        </div>
      ),
      icon: 'eye',
    },
  },
)
