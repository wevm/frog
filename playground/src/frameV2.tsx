import { Frog } from 'frog'

export const app = new Frog({ verify: 'silent', title: 'Signature' }).frameV2(
  '/',
  (c) => {
    return c.res({
      action: {
        name: 'My App',
        url: 'https://google.com',
        splashImageUrl: 'https://google.com',
        splashBackgroundColor: '#000',
      },
      buttonTitle: 'Button!',
      image: 'https://yoink.party/img/start.png',
    })
  },
)
