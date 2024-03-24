# frog

## 0.7.7

### Patch Changes

- [#184](https://github.com/wevm/frog/pull/184) [`378ab0f`](https://github.com/wevm/frog/commit/378ab0fe03f7593e3ba89ad5768fb7fe0268d5d5) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed optional path parameter parsing that resulted in making the path parameter to be required.
  Fixed the `/image` route to be prioritized over optional parameter (`/:param?`).

## 0.7.6

### Patch Changes

- [`a670972`](https://github.com/wevm/frog/commit/a6709727d229695517c1bd291e0369e0439572ff) Thanks [@jxom](https://github.com/jxom)! - Fixed issue where protocol via a reverse proxy would register as `http`.

## 0.7.4

### Patch Changes

- [`8323000`](https://github.com/wevm/frog/commit/8323000abd4a6e7b57f95314c37736000f6e896d) Thanks [@tmm](https://github.com/tmm)! - Added devtools style tweaks.

## 0.7.3

### Patch Changes

- [#173](https://github.com/wevm/frog/pull/173) [`fd33c56`](https://github.com/wevm/frog/commit/fd33c5644cfb42fe463c08379dadd64ac364d62b) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed dark background set on devtools which resulted in bad UI for browsers with ligh-mode scheme preference.

## 0.7.2

### Patch Changes

- [`6598c53`](https://github.com/wevm/frog/commit/6598c5364fcdf3f89fcca05b0d89aafc16fa1f7a) Thanks [@tmm](https://github.com/tmm)! - Fixed dev command printed URL formatting

## 0.7.1

### Patch Changes

- [#167](https://github.com/wevm/frog/pull/167) [`8fc49f5`](https://github.com/wevm/frog/commit/8fc49f5be89f074c31233adbbb2ade829ca7f41c) Thanks [@tmm](https://github.com/tmm)! - Fixed devtools edge deployment

- [#167](https://github.com/wevm/frog/pull/167) [`8fc49f5`](https://github.com/wevm/frog/commit/8fc49f5be89f074c31233adbbb2ade829ca7f41c) Thanks [@tmm](https://github.com/tmm)! - Fixed optional frame `post_url` handling

## 0.7.0

### Minor Changes

- [#156](https://github.com/wevm/frog/pull/156) [`7691858`](https://github.com/wevm/frog/commit/76918583ec32823cfb8b709f1bcdf58b3540e30c) Thanks [@tmm](https://github.com/tmm)! - Added offline support to Frog Devtools.

  Previously, the devtools loaded client-side JS via the JSDelivr secure CDN. Now the devtools have all the require client-side assets bundled into Frog's package distribution.

  As a result, to use the devtools, you need to explicitly configure them for your app. This isn't as convenient as them being automatically injected before, but it enables offline support and a future standalone devtools for use with non-Frog frames.

  In most cases, configuring the devtools should only take a few minutes. All you need to do is import the `devtools` helper, import/use a `serveStatic` adapter or `assetsPath`, and call the `devtools` helper after your frames are set up. For example:

  ```diff
  // Node.js Frog App
  import { Frog } from 'frog'
  + import { devtools } from 'frog/dev'
  + import { serveStatic } from 'frog/serve-static'

  export const app = new Frog({
  +  dev: {
  +    enabled: true,
  +  },
  })

  app.frame('/', (c) => { ... })

  + devtools(app, { serveStatic })
  ```

  #### Node.js/Next.js

  ```diff
  import { Frog } from 'frog'
  + import { devtools } from 'frog/dev'
  + import { serveStatic } from 'frog/serve-static'

  export const app = new Frog()

  app.frame('/', (c) => { ... })

  + devtools(app, { serveStatic })
  ```

  #### Bun

  ```diff
  import { Frog } from 'frog'
  + import { devtools } from 'frog/dev'
  + import { serveStatic } from 'frog/serve-static'

  const app = new Frog()

  app.frame('/', (c) => { ... })

  + devtools(app, { serveStatic })
  ```

  #### Cloudflare Workers

  Add `serveStatic` and attach `manifest` and `root`.

  ```diff
  import { Frog } from 'frog'
  + import { devtools } from 'frog/dev'
  + import { serveStatic } from 'frog/serve-static'

  const app = new Frog()

  app.frame('/', (c) => { ... })

  + devtools(app, {
  +  serveStatic,
  +  serveStaticOptions: {
  +    assetsPath: '/frog',
  +    manifest: await import('__STATIC_CONTENT_MANIFEST'),
  +    root: './',
  +  },
  + })
  ```

  You also will want to add the following script to your `package.json` to copy over Frog Devtools' static assets to your Cloudflare Workers' bucket. For example, if your bucket uses the `'./public'` directory.

  ```diff
  {
    "scripts": {
  +    "wrangler:static": "cp -r ./node_modules/frog/_lib/ui/.frog ./public/frog"
    }
  }
  ```

  This script is best run before running `wrangler dev` and `wrangler deploy` to make sure you app has the static files for the devtools.

  #### Vercel Edge/Serverless Functions

  Running `frog vercel-build` will automatically copy Frog Devtools' static assets over to your functions' public directory so no need for `serveStatic` this time. Instead, you can use `assetsPath` or simply omit `devtools` second parameters

  ```diff
  import { Frog } from 'frog'
  + import { devtools } from 'frog/dev'

  export const app = new Frog()

  app.frame('/', (c) => { ... })

  + devtools(app, { assetsPath: '/.frog' })
  ```

- [#156](https://github.com/wevm/frog/pull/156) [`7691858`](https://github.com/wevm/frog/commit/76918583ec32823cfb8b709f1bcdf58b3540e30c) Thanks [@tmm](https://github.com/tmm)! - Removed experimental proxy flag from `frog dev` command. If you want to use a proxy, like ngrok or cloudflared, you should run it separately.

### Patch Changes

- [#165](https://github.com/wevm/frog/pull/165) [`ccfbe65`](https://github.com/wevm/frog/commit/ccfbe6563c865de20203be8d775d1e00228c61e6) Thanks [@tmm](https://github.com/tmm)! - Added support for standalone devtools.

## 0.6.5

### Patch Changes

- [#155](https://github.com/wevm/frog/pull/155) [`9fc365b`](https://github.com/wevm/frog/commit/9fc365b8a94f24b9f8b285bcdce411cf6b3acd17) Thanks [@christopherwxyz](https://github.com/christopherwxyz)! - Added support for Base Sepolia transactions

## 0.6.4

### Patch Changes

- [`e453a04`](https://github.com/wevm/frog/commit/e453a045c861bf319adb5b52159185c12fe95cee) Thanks [@jxom](https://github.com/jxom)! - Updated hono-og

## 0.6.3

### Patch Changes

- [`189d5cb`](https://github.com/wevm/frog/commit/189d5cb6d53c0eb16285ff2d5687e6063793f8eb) Thanks [@jxom](https://github.com/jxom)! - Added support for dynamic google fonts.

## 0.6.2

### Patch Changes

- [`9e27725`](https://github.com/wevm/frog/commit/9e277258c869ca949faad6f99320188793d83b0e) Thanks [@jxom](https://github.com/jxom)! - Exported `loadGoogleFont` utility for fetching font buffers.

- [`615deaf`](https://github.com/wevm/frog/commit/615deaf2b02d1279c83aadd888aec413f1980852) Thanks [@jxom](https://github.com/jxom)! - Fixed missing `origin`.

## 0.6.1

### Patch Changes

- [`aa1496e`](https://github.com/wevm/frog/commit/aa1496e3c582d41af95fa3fe746bdc18fc55d603) Thanks [@jxom](https://github.com/jxom)! - Fixed JSX composition bug.

## 0.6.0

### Minor Changes

- [#140](https://github.com/wevm/frog/pull/140) [`c8d03fa`](https://github.com/wevm/frog/commit/c8d03fa4081b94f7a93431d48b9e5e221da9f1df) Thanks [@jxom](https://github.com/jxom)! - Added route-level middleware. [See more.](https://frog.fm/concepts/middleware#route-level)

## 0.5.9

### Patch Changes

- [`1f379f4`](https://github.com/wevm/frog/commit/1f379f417560362dbe1878e85f88bb84a9b0072b) Thanks [@jxom](https://github.com/jxom)! - Added `origin` property to `Frog` instance.

## 0.5.8

### Patch Changes

- [#138](https://github.com/wevm/frog/pull/138) [`d555b1c`](https://github.com/wevm/frog/commit/d555b1c05962ff1549f8ffa8b99a6ecc9404de24) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `address` to `FrameData`. Read more at https://warpcast.com/horsefacts.eth/0xb98e17d8.

- [`a0bc957`](https://github.com/wevm/frog/commit/a0bc9572b27d67b550bc556f91996d57579380b4) Thanks [@jxom](https://github.com/jxom)! - Updated `hono-og`.

## 0.5.7

### Patch Changes

- [`0bb6768`](https://github.com/wevm/frog/commit/0bb6768e004ba846c919383e633f683a2e08b55e) Thanks [@jxom](https://github.com/jxom)! - Added `ogImage` property to frame response.

## 0.5.6

### Patch Changes

- [`9d77208`](https://github.com/wevm/frog/commit/9d7720896ac981f5857990a22650975598b32a3d) Thanks [@jxom](https://github.com/jxom)! - Added ability for `fonts` on route options to be an async function.

- [`b6069c1`](https://github.com/wevm/frog/commit/b6069c1f942a6b45f78fbc7bd283f3b4f6069568) Thanks [@jxom](https://github.com/jxom)! - Support `data:` image URIs.

- [`0c040f0`](https://github.com/wevm/frog/commit/0c040f0deedb3c65a4b98cb01e7b85dfe22577ad) Thanks [@jxom](https://github.com/jxom)! - Support external url actions on \`Button\`.

- [#126](https://github.com/wevm/frog/pull/126) [`5d32a99`](https://github.com/wevm/frog/commit/5d32a990438e26de1ea99c3e71fbae922014c21d) Thanks [@tmm](https://github.com/tmm)! - Updated devtools deps

- [`b6069c1`](https://github.com/wevm/frog/commit/b6069c1f942a6b45f78fbc7bd283f3b4f6069568) Thanks [@jxom](https://github.com/jxom)! - Exported `FrameIntent` type.

## 0.5.5

### Patch Changes

- [`808be3d`](https://github.com/wevm/frog/commit/808be3d68f214927c0e4a02e1c9e3a55e2bcf5b6) Thanks [@jxom](https://github.com/jxom)! - Fixed type.

## 0.5.4

### Patch Changes

- [`d0ce9cc`](https://github.com/wevm/frog/commit/d0ce9cc81cdccb0734c7348a7caec4adb4c5ce60) Thanks [@jxom](https://github.com/jxom)! - Fixed `imageOptions` propagation when passed to `Frog`.

## 0.5.3

### Patch Changes

- [`a18f5e5`](https://github.com/wevm/frog/commit/a18f5e507dcd90566a9f1de05ae91dc4e6aa9462) Thanks [@jxom](https://github.com/jxom)! - Added `transactionId` to `messageToFrameData`.

## 0.5.2

### Patch Changes

- [`3b2d353`](https://github.com/wevm/frog/commit/3b2d3533098a5c2d54bd9584feed0fd7a50000f7) Thanks [@jxom](https://github.com/jxom)! - Unwrap JSX elements before passing them as parameters.

## 0.5.1

### Patch Changes

- [`51610c2`](https://github.com/wevm/frog/commit/51610c2614597e29088b6a1618f5cdf7e79db19b) Thanks [@jxom](https://github.com/jxom)! - Added `action` prop to `Button.Transaction`.

## 0.5.0

### Minor Changes

- [#109](https://github.com/wevm/frog/pull/109) [`e5296d8`](https://github.com/wevm/frog/commit/e5296d8be88efba603aa7b56290a2063fcf27154) Thanks [@jxom](https://github.com/jxom)! - This version of Frog removes the concept of "Render Cycles". All frames now facilitate a single cycle.

  There are a couple of small **deprecations**:

  1. Deprecated `cycle` from context – you can now omit the conditionals completely.

  ```diff
  app.frame('/', c => {
  -  if (c.cycle === 'main') console.log('hello world')
  +  console.log('hello world')
  })
  ```

  2. Deprecated `fonts` property in `c.res` in favor of `fonts` on frame route options:

  ```diff
  app.frame('/', c => {
    return c.res({
      imageOptions: {
  -     fonts: // ...
      }
    })
  }, {
  +  fonts: // ...
  })
  ```

## 0.4.8

### Patch Changes

- [`12bff46`](https://github.com/wevm/frog/commit/12bff468a37ffd622aae74791205b76f5f94dba7) Thanks [@jxom](https://github.com/jxom)! - Fixed Base chain ID.

## 0.4.7

### Patch Changes

- [`efe1f6a`](https://github.com/wevm/frog/commit/efe1f6a9b9d809cbc9ec714676189e5c87bb3062) Thanks [@jxom](https://github.com/jxom)! - Strengthened `chainId` type for transactions.

## 0.4.6

### Patch Changes

- [`9d2bf3f`](https://github.com/wevm/frog/commit/9d2bf3fd06bb78bc00d7b09bcaea71043418ee60) Thanks [@jxom](https://github.com/jxom)! - Updated `hono-og`.

## 0.4.5

### Patch Changes

- [`f150fe9`](https://github.com/wevm/frog/commit/f150fe98dd999c35aa8dc9769bcce9d5f2721c46) Thanks [@jxom](https://github.com/jxom)! - Updated `hono-og`.

## 0.4.4

### Patch Changes

- [`2f7c148`](https://github.com/wevm/frog/commit/2f7c148bea730624596b84e7f091c6400a336298) Thanks [@jxom](https://github.com/jxom)! - Fixed `HandlerResponse` type.

## 0.4.3

### Patch Changes

- [`0d379e4`](https://github.com/wevm/frog/commit/0d379e48548ce72bd43501bd4bfb93eef4ec01a6) Thanks [@tmm](https://github.com/tmm)! - Added transaction buttons

- [#95](https://github.com/wevm/frog/pull/95) [`84caa33`](https://github.com/wevm/frog/commit/84caa337b700cc22ac0e3ddf468631e7d679e545) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed typing of `c.req.param()` in `.transaction` route.

- [`3683778`](https://github.com/wevm/frog/commit/3683778151bf1179a1bf674108986e024da7287c) Thanks [@jxom](https://github.com/jxom)! - Added support for [Hono's `.env`](https://hono.dev/api/context#env).

## 0.4.2

### Patch Changes

- [#92](https://github.com/wevm/frog/pull/92) [`d6b8bbb`](https://github.com/wevm/frog/commit/d6b8bbb8c5c08d60f094bacc260a1d7af7338c47) Thanks [@jxom](https://github.com/jxom)! - Added support for asynchronous `deriveState`.

## 0.4.1

### Patch Changes

- [`f72026f`](https://github.com/wevm/frog/commit/f72026fc14987c2cfe1216834f6a41268e8c3462) Thanks [@jxom](https://github.com/jxom)! - Fixed `handle` generics.

## 0.4.0

### Minor Changes

- [#87](https://github.com/wevm/frog/pull/87) [`b7031ff`](https://github.com/wevm/frog/commit/b7031ff4f045a9539fb1a20899b35b41eb26515b) Thanks [@jxom](https://github.com/jxom)! - Added built-in middleware for Neynar. [Read more.](https://frog.fm/concepts/middleware#neynar)

### Patch Changes

- [#80](https://github.com/wevm/frog/pull/80) [`c377528`](https://github.com/wevm/frog/commit/c3775288bc8683d532d9c6ca2cd05e6f2f1bd69d) Thanks [@jxom](https://github.com/jxom)! - **Type Change:** The `state` generic in the `Frog` constructor type is now named.

  ```diff
  type State = { count: number }

  - const frog = new Frog<State>({
  + const frog = new Frog<{ State: State }>({
    initialState: { count: 0 }
  })
  ```

- [#80](https://github.com/wevm/frog/pull/80) [`c377528`](https://github.com/wevm/frog/commit/c3775288bc8683d532d9c6ca2cd05e6f2f1bd69d) Thanks [@jxom](https://github.com/jxom)! - Added a `var` property to context to extract variables that were previously set via `set` in Middleware. [Read more.](https://frog.fm/reference/frog-frame-context#var)

## 0.3.3

### Patch Changes

- [`142040e`](https://github.com/wevm/frog/commit/142040e1a73ccd9d5f82c7b6578173c65c3dc3c6) Thanks [@jxom](https://github.com/jxom)! - Fixed URL comparison for frame verification.

## 0.3.2

### Patch Changes

- [`f800940`](https://github.com/wevm/frog/commit/f800940eb89ffe41d46b724336765988a4a0b3df) Thanks [@jxom](https://github.com/jxom)! - Added `pinata` hub.

## 0.3.1

### Patch Changes

- [`00725e7`](https://github.com/wevm/frog/commit/00725e7be52727d2203e86d5855f824f6e1a96e9) Thanks [@jxom](https://github.com/jxom)! - Widened handler return types to allow [`Response` objects](https://developer.mozilla.org/en-US/docs/Web/API/Response).

## 0.3.0

### Minor Changes

- [`af6828a`](https://github.com/wevm/frog/commit/af6828a87e4f08e5b9ff76d5a7337ba18e42d773) Thanks [@jxom](https://github.com/jxom)! - Added Transaction support. [Read more.](https://frog.fm/concepts/transactions)

## 0.2.14

### Patch Changes

- [`885347e`](https://github.com/wevm/frog/commit/885347e6f88c20238c58ac69591be54eec15a1f8) Thanks [@jxom](https://github.com/jxom)! - Fixed Next.js circular dependency on `getFrameMetadata`.

## 0.2.13

### Patch Changes

- [#67](https://github.com/wevm/frog/pull/67) [`769bd30`](https://github.com/wevm/frog/commit/769bd3081b4d69249f519a3aad881b3f30aaef6e) Thanks [@jxom](https://github.com/jxom)! - Fixed issue where `deriveState` would trigger twice.

## 0.2.12

### Patch Changes

- [#65](https://github.com/wevm/frog/pull/65) [`02fb038`](https://github.com/wevm/frog/commit/02fb0387431c83b7d9333ee8f9ec1541f0570b87) Thanks [@jxom](https://github.com/jxom)! - Deprecated `frogApiUrl` in favor of a more flexible `hub` constructor parameter.

## 0.2.11

### Patch Changes

- [`573ed8a`](https://github.com/wevm/frog/commit/573ed8a9c15308ad31fb40cd0386031a252f3b1e) Thanks [@jxom](https://github.com/jxom)! - Fixed issue where `getFrameMetadata` wouldn't pick up whitespace in meta content.

- [`f126947`](https://github.com/wevm/frog/commit/f12694769273a652aebc71eb72dc198831b54d49) Thanks [@jxom](https://github.com/jxom)! - Exported `getFrameMetadata` utility.

## 0.2.10

### Patch Changes

- [#61](https://github.com/wevm/frog/pull/61) [`cee4729`](https://github.com/wevm/frog/commit/cee47297b619a0be3f1fe1c4962a92d0387950e5) Thanks [@jxom](https://github.com/jxom)! - Added ability for `imageOptions` to return an asynchronous function in the `Frog` constructor.

- [#61](https://github.com/wevm/frog/pull/61) [`cee4729`](https://github.com/wevm/frog/commit/cee47297b619a0be3f1fe1c4962a92d0387950e5) Thanks [@jxom](https://github.com/jxom)! - Added `imageAspectRatio` parameter to `Frog` constructor.

## 0.2.9

### Patch Changes

- [`143fa03`](https://github.com/wevm/frog/commit/143fa03678bad645d92124ec47367bfba71bc01d) Thanks [@jxom](https://github.com/jxom)! - Added `cycle` property to context.

## 0.2.8

### Patch Changes

- [`26f4ba8`](https://github.com/wevm/frog/commit/26f4ba88b562696abe49182ee9d67c5527420043) Thanks [@jxom](https://github.com/jxom)! - Implemented functionality for sub-apps to inherit properties from the root Frog app when using `.route`.

## 0.2.7

### Patch Changes

- [`bf6140d`](https://github.com/wevm/frog/commit/bf6140d971f9cfae9d09f86e6aec7c5044377e2e) Thanks [@jxom](https://github.com/jxom)! - Added `--staticDir` parameter to `frog dev` CLI command.

- [#49](https://github.com/wevm/frog/pull/49) [`79bb79d`](https://github.com/wevm/frog/commit/79bb79d9644851009c2c9700f7c42b26649f5fbd) Thanks [@tmm](https://github.com/tmm)! - Fixed Button.Redirect behavior

- [`15de099`](https://github.com/wevm/frog/commit/15de099ad936f3e1a336696a8ae084690aab7150) Thanks [@jxom](https://github.com/jxom)! - Updated `hono-og` & added `bun` export property.

## 0.2.6

### Patch Changes

- [`0f742eb`](https://github.com/wevm/frog/commit/0f742eb6e85d30dc0e5b6d3848aeac941737adac) Thanks [@tmm](https://github.com/tmm)! - Fixed Button.Link rendering in devtools

## 0.2.5

### Patch Changes

- [`0a85bfc`](https://github.com/wevm/frog/commit/0a85bfcc0ac7528eadbc5a3dc1c6eddd1269f50a) Thanks [@tmm](https://github.com/tmm)! - Added proxy support to `frog dev` command

## 0.2.4

### Patch Changes

- [`4887cb2`](https://github.com/wevm/frog/commit/4887cb2075398d1166311dbd0cebd1d54cb66696) Thanks [@jxom](https://github.com/jxom)! - Tightened frame verification by utilizing protobuf modules to decode trusted data.

## 0.2.3

### Patch Changes

- [`5bc1c56`](https://github.com/wevm/frog/commit/5bc1c5626aa044857b959c42a9067280f1863a89) Thanks [@jxom](https://github.com/jxom)! - Fixed commas rendering in `Button` children.

## 0.2.2

### Patch Changes

- [#31](https://github.com/wevm/frog/pull/31) [`76d69ca`](https://github.com/wevm/frog/commit/76d69ca4c0b7c46cb7da65f46521ec4b75abac03) Thanks [@jxom](https://github.com/jxom)! - Added a `getFrameMetadata` to `frog/next` entrypoint. [See more](https://frog.fm/platforms/next#bonus-page--frame-co-location)

## 0.2.1

### Patch Changes

- [`a0442ba`](https://github.com/wevm/frog/commit/a0442ba394a369ecbc958994d91ce815897a2b86) Thanks [@jxom](https://github.com/jxom)! - Added `frog:version` meta tag.

- [`b5b0606`](https://github.com/wevm/frog/commit/b5b0606b6db0f016653b072571116227456313da) Thanks [@jxom](https://github.com/jxom)! - Propagated `header` value onto OG Image endpoint.

## 0.2.0

### Minor Changes

- 4ff249b: Initial release.
