import { Frog } from 'frog'

export const app = new Frog({
  imageOptions: {
    fonts: [
      {
        name: 'Open Sans',
        weight: 400,
        source: 'google',
      },
      {
        name: 'Open Sans',
        weight: 700,
        source: 'google',
      },
      {
        name: 'Madimi One',
        source: 'google',
      },
    ],
  },
}).frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            color: 'white',
            fontFamily: 'Open Sans',
            display: 'flex',
            fontWeight: 400,
            fontSize: 60,
          }}
        >
          Open Sans (normal)
        </div>
        <div
          style={{
            color: 'white',
            fontFamily: 'Open Sans',
            display: 'flex',
            fontWeight: 700,
            fontSize: 60,
          }}
        >
          Open Sans (bold)
        </div>
        <div
          style={{
            color: 'white',
            fontFamily: 'Madimi One',
            display: 'flex',
            fontSize: 60,
          }}
        >
          Madimi One
        </div>
      </div>
    ),
  })
})
