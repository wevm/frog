# frog

## 0.15.9

### Patch Changes

- [#457](https://github.com/wevm/frog/pull/457) [`56f4be4`](https://github.com/wevm/frog/commit/56f4be4350922498b7f86e8ad8478be504129fc2) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `verifyOrigin` constructor parameter was not populated in some of the handlers.

## 0.15.8

### Patch Changes

- [#455](https://github.com/wevm/frog/pull/455) [`e1c8689`](https://github.com/wevm/frog/commit/e1c86893802e6c5391702770ef508f5ceb64269c) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `basePath` was not provided to the callback used in `initialState` parameter.

## 0.15.7

### Patch Changes

- [#449](https://github.com/wevm/frog/pull/449) [`0fb3dee`](https://github.com/wevm/frog/commit/0fb3deed620068d5d0b4e0b0734d832bd6957e00) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `initialState` as a fallback to `c.previousState` in handlers that depend on the state but cannot retrieve one.

## 0.15.6

### Patch Changes

- [#450](https://github.com/wevm/frog/pull/450) [`368a2a9`](https://github.com/wevm/frog/commit/368a2a92f82713fe0dd109b2543fcd952eb195d5) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where using `Button.Reset` would lead to "Cannot destructure property 'property' of 'intent.props' as it is undefined." error.

## 0.15.5

### Patch Changes

- [#447](https://github.com/wevm/frog/pull/447) [`e5437a4`](https://github.com/wevm/frog/commit/e5437a4dc132a21c4c954b036356012b974d7f32) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixes an issue with rendering of `TextInput` intent and reverts changes from https://github.com/wevm/frog/commit/90544316bf2d752bf324bc43662cd31b3b2c78db and https://github.com/wevm/frog/commit/6114139cb7b56ca5bc95ae2af7722f9ba0ec7f80 as those are no longer needed.

## 0.15.4

### Patch Changes

- [#445](https://github.com/wevm/frog/pull/445) [`b52f5d2`](https://github.com/wevm/frog/commit/b52f5d2bf8155d1a2777c99dae6754fece5111b6) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with Vercel/Next.JS deployments where "property" could not be read from intent as the "props" was missing.

## 0.15.3

### Patch Changes

- [#442](https://github.com/wevm/frog/pull/442) [`a6c1438`](https://github.com/wevm/frog/commit/a6c14383b6c4b89da677e903b0a6dab5621c62de) Thanks [@dalechyn](https://github.com/dalechyn)! - Added support for Polygon in Frame Transactions.

## 0.15.2

### Patch Changes

- [#436](https://github.com/wevm/frog/pull/436) [`6ff12c3`](https://github.com/wevm/frog/commit/6ff12c37fff90a0c122401c9cae74b79aeed6143) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `verifyOrigin` flag to `Frog` constructor.

- [#435](https://github.com/wevm/frog/pull/435) [`43f4205`](https://github.com/wevm/frog/commit/43f4205df9c5962c816d6779e9ea8c196c82810b) Thanks [@dalechyn](https://github.com/dalechyn)! - Implemented a feature where `initialState` can be a callback receiving Hono's `Context`.

  This is particularly useful when dealing with path parameters to dynamically initiate state.
  This state will also be accessible in `c.previousState` in the Image Handler.

## 0.15.1

### Patch Changes

- [#433](https://github.com/wevm/frog/pull/433) [`2d6a951`](https://github.com/wevm/frog/commit/2d6a95191702cf6fbdb438d4d8319a96172f69b4) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with missing `"type": "composer"` in Composer Action Metadata Response that resulted in incorrect behaviour.

## 0.15.0

### Minor Changes

- [#431](https://github.com/wevm/frog/pull/431) [`c1f5be4`](https://github.com/wevm/frog/commit/c1f5be456b8e8f74622df1b07bf578170f1f2b94) Thanks [@dalechyn](https://github.com/dalechyn)! - **Breaking Change**. Composer Action Handlers now require a third argument to define metadata.

  ```diff
  export const app = new Frog({
    title: 'Composer Action',
  }).composerAction(
    '/',
    async (c) => {
      if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })
      return c.res({
        title: 'Some Composer Action',
        url: 'https://example.com',
      })
    },
  + {
  +   name: 'Some Composer Action',
  +   description: 'Cool Composer Action',
  +   icon: 'image',
  +   imageUrl: 'https://frog.fm/logo-light.svg',
  + },
  )
  ```

## 0.14.5

### Patch Changes

- [#430](https://github.com/wevm/frog/pull/430) [`0016cc2`](https://github.com/wevm/frog/commit/0016cc2bac752350b7538f21b67032776ef90a88) Thanks [@dalechyn](https://github.com/dalechyn)! - Changed default value for `verify` to be `process.env.NODE_ENV === 'production'` as many newcomers have been hitting issues with that, and in fact nobody wants to pay warps for frame tests.

- [#427](https://github.com/wevm/frog/pull/427) [`ae57791`](https://github.com/wevm/frog/commit/ae57791dc15260f11746916ebb568450f1ef0a83) Thanks [@dalechyn](https://github.com/dalechyn)! - Added access to `previousState` and `previousButtonValues` in Image Handler.

- [#396](https://github.com/wevm/frog/pull/396) [`d763d1a`](https://github.com/wevm/frog/commit/d763d1a8289790447c5e26813c25a3a87eb9be8a) Thanks [@dalechyn](https://github.com/dalechyn)! - Added support for Composer Actions. [See More](https://warpcast.notion.site/Draft-Composer-Actions-7f2b8739ee8447cc8a6b518c234b1eeb).

## 0.14.4

### Patch Changes

- [#420](https://github.com/wevm/frog/pull/420) [`6114139`](https://github.com/wevm/frog/commit/6114139cb7b56ca5bc95ae2af7722f9ba0ec7f80) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `TextInput` component was unnecessarily unwrapped causing an issue with getting button values.

## 0.14.3

### Patch Changes

- [#414](https://github.com/wevm/frog/pull/414) [`51f5678`](https://github.com/wevm/frog/commit/51f567877c8b8c6775e91d8e4ec5c066056830b7) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `Box` props weren't accessible in `HStack` and `VStack` components.

- [#417](https://github.com/wevm/frog/pull/417) [`24e7fd0`](https://github.com/wevm/frog/commit/24e7fd04a3fda767442f0b43e2fd1fd16d5f28c1) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `verify` value would be the same as the parent's Frog instance even if `false` is passed.

## 0.14.2

### Patch Changes

- [#412](https://github.com/wevm/frog/pull/412) [`10e522d`](https://github.com/wevm/frog/commit/10e522d1a0b5bf05090a5f829993f44495412afc) Thanks [@dalechyn](https://github.com/dalechyn)! - Reverted the changes introduced in 0.14.1.

## 0.14.1

### Patch Changes

- [#409](https://github.com/wevm/frog/pull/409) [`9304567`](https://github.com/wevm/frog/commit/930456770370cd0f553d78e05071a07149cebda4) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where `c.deriveState` would not modify state in initial frame handler.

## 0.14.0

### Minor Changes

- [#407](https://github.com/wevm/frog/pull/407) [`902f03d`](https://github.com/wevm/frog/commit/902f03dbcfa77afa027b94c90d755f09cb2380e4) Thanks [@dalechyn](https://github.com/dalechyn)! - **Breaking Change**. Added `chainId` back as a parameter to `.signature` handler's `c.signTypedData` response.

  ```diff
  app.signature('/sign', (c) =>
    c.signTypedData({
  +   chainId: 'eip155:8543',
      /**/
    })
  ```

## 0.13.1

### Patch Changes

- [#401](https://github.com/wevm/frog/pull/401) [`5cd9839`](https://github.com/wevm/frog/commit/5cd9839c65165eb5ef793612f08ea856c9f15fa9) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with serializing typed data messages that have `bigint` fields.

## 0.13.0

### Minor Changes

- [#398](https://github.com/wevm/frog/pull/398) [`88b5361`](https://github.com/wevm/frog/commit/88b5361dc0b11b7130f527d69ce3c3045189a7c8) Thanks [@dalechyn](https://github.com/dalechyn)! - Removed `chainId` property from the `.signature` handler response. [See more](https://warpcast.notion.site/Frames-Wallet-Signatures-debe97a82e2643d094d4088f1badd791).
  ```diff
  app.signature('/sign', (c) =>
    c.signTypedData({
  -   chainId: 'eip155:8543',
      /**/
    })
  ```

### Patch Changes

- [#398](https://github.com/wevm/frog/pull/398) [`88b5361`](https://github.com/wevm/frog/commit/88b5361dc0b11b7130f527d69ce3c3045189a7c8) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed a bug where `Button.Signature` would not set a correct `post_url`.

## 0.12.3

### Patch Changes

- [#388](https://github.com/wevm/frog/pull/388) [`120449f`](https://github.com/wevm/frog/commit/120449f5953d75351015ba8e2c199877c80416a6) Thanks [@dalechyn](https://github.com/dalechyn)! - Added support for Wallet Signatures. [See more](https://warpcast.notion.site/Frames-Wallet-Signatures-debe97a82e2643d094d4088f1badd791).

## 0.12.2

### Patch Changes

- [#389](https://github.com/wevm/frog/pull/389) [`c1abdbd`](https://github.com/wevm/frog/commit/c1abdbd7a53a6d3436d145294a4d72d977821b3c) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where Fragment (`<>...</>`) was handled as a separate node. Now it simply unwraps children.

## 0.12.1

### Patch Changes

- [#380](https://github.com/wevm/frog/pull/380) [`6ab441b`](https://github.com/wevm/frog/commit/6ab441b2b2d9c19756755d7d4273c7e811f19926) Thanks [@crebsy](https://github.com/crebsy)! - Fixed an issue with session logouts by reading `frog_user` cookie.

- [#383](https://github.com/wevm/frog/pull/383) [`dac1d21`](https://github.com/wevm/frog/commit/dac1d211e6da969511e398b363d48df35b3fee36) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed incorrectly unescaped HTML entities in Frame Preview Buttons leading to incorrect UI shown.

- [#385](https://github.com/wevm/frog/pull/385) [`38a1d45`](https://github.com/wevm/frog/commit/38a1d45ddf7834da4bae640b13a8789004c01a9c) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where a Component returning `null` would crash the image rendering process.

## 0.12.0

### Minor Changes

- [#376](https://github.com/wevm/frog/pull/376) [`3a67a9e`](https://github.com/wevm/frog/commit/3a67a9e539a507a81cb77721e0391175b0a7bcdb) Thanks [@dalechyn](https://github.com/dalechyn)! - **Breaking change.** Added `title` as a required parameter to `Frog` constructor.

  ```diff
  - const app = new Frog()
  + const app = new Frog({ title: 'My Title' })
  ```

### Patch Changes

- [#376](https://github.com/wevm/frog/pull/376) [`3a67a9e`](https://github.com/wevm/frog/commit/3a67a9e539a507a81cb77721e0391175b0a7bcdb) Thanks [@dalechyn](https://github.com/dalechyn)! - Added condensed frame preview to Devtools.

## 0.11.10

### Patch Changes

- [#374](https://github.com/wevm/frog/pull/374) [`b5d43d8`](https://github.com/wevm/frog/commit/b5d43d8e7fa9d3c3f0c1ed59419a68666fb97f7a) Thanks [@dalechyn](https://github.com/dalechyn)! - Added previously missed type exports for `CastActionContext`, `CastActionHandler`, `CastActionResponse`, `ImageContext`, `ImageResponse` and `ImageHandler`

- [#366](https://github.com/wevm/frog/pull/366) [`bbe3e09`](https://github.com/wevm/frog/commit/bbe3e09d9208222f8f47b209f146c52ff21c34bd) Thanks [@dalechyn](https://github.com/dalechyn)! - Added support of `c.error` responses in `.frame` and `.transaction` handlers in DevTools.

## 0.11.9

### Patch Changes

- [#364](https://github.com/wevm/frog/pull/364) [`fb1f847`](https://github.com/wevm/frog/commit/fb1f8474ac25cdd26e8100ddb3a22456f42c22e4) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with `.image` handler not recieving correct `__context` which is normally injected in `parseImage` function that wasn't previously used in Image rendering. As a consequence, https://github.com/wevm/frog/commit/c2f4d563b4633b0ef87a3132db571659700ce84d as an attempt to fix `__context` not being passed to components is no longer relevant, thus reverted.

## 0.11.8

### Patch Changes

- [#360](https://github.com/wevm/frog/pull/360) [`42f143d`](https://github.com/wevm/frog/commit/42f143d22802fb7764eb043ca18fffecacca1eb4) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with `valibot` having an incorrect schema on parsing POST request.

## 0.11.7

### Patch Changes

- [#355](https://github.com/wevm/frog/pull/355) [`7d75e97`](https://github.com/wevm/frog/commit/7d75e9745f31f8dfe0ac34b38274ceb7cbe07b07) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed a bug where properties on UI elements having `0` value were not being set, such as `left="0"` and etc.

- [#354](https://github.com/wevm/frog/pull/354) [`e1d5597`](https://github.com/wevm/frog/commit/e1d5597fb98b2c4613d00b74ed7f3c11262d7591) Thanks [@dalechyn](https://github.com/dalechyn)! - Bumped `hono` and related packages versions.

- [#356](https://github.com/wevm/frog/pull/356) [`7ab81f0`](https://github.com/wevm/frog/commit/7ab81f05681af368892d6a45ef83ebab9224f2de) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where other `Frog` instances routed via `.route` constructed an incorrect image URL due to the absence of `basePath`.

- [#348](https://github.com/wevm/frog/pull/348) [`8286f21`](https://github.com/wevm/frog/commit/8286f217959707f21926a17142122789ade6d2f5) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed a type issue where `margin*` and `letterSpacing` props in `Box` accepted only negative values.

## 0.11.6

### Patch Changes

- [#342](https://github.com/wevm/frog/pull/342) [`904cfbf`](https://github.com/wevm/frog/commit/904cfbfa5b6a27ecbce20d094dbea9eb1e904294) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed incorrect internal image route matching that previously was only working when `assetsUrl` and `baseUrl` were the same.

- [#341](https://github.com/wevm/frog/pull/341) [`f6033d3`](https://github.com/wevm/frog/commit/f6033d315b24205e976485d15a1c9954751aecfe) Thanks [@dalechyn](https://github.com/dalechyn)! - Added support of custom `handler` for Cast Actions if one wants to rely on the `Context` to give out a response for `GET` method. I.e. having the Action name to be derived from the path parameter.

- [#347](https://github.com/wevm/frog/pull/347) [`a14da7b`](https://github.com/wevm/frog/commit/a14da7bc953891e0d6989a46d7b3c4e5cb0a9157) Thanks [@dalechyn](https://github.com/dalechyn)! - Added Sepolia, Arbitrum Sepolia and Optimism Sepolia support. [See more](https://warpcast.com/horsefacts.eth/0x0a22c0f0).

- [#345](https://github.com/wevm/frog/pull/345) [`c2f4d56`](https://github.com/wevm/frog/commit/c2f4d563b4633b0ef87a3132db571659700ce84d) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where user defined vars were not passed to `Text`, `Spacer`, `Divider` and `Image` components.

## 0.11.5

### Patch Changes

- [#335](https://github.com/wevm/frog/pull/335) [`913b0cb`](https://github.com/wevm/frog/commit/913b0cb6da5de738118d35d767d0168295bc5b2d) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed the `&amp;` being unescaped in devtools.

## 0.11.4

### Patch Changes

- [#333](https://github.com/wevm/frog/pull/333) [`d457c65`](https://github.com/wevm/frog/commit/d457c65cb4726905f77578579f6644c2f242ebaa) Thanks [@dalechyn](https://github.com/dalechyn)! - Added Gnosis chain support.

- [#294](https://github.com/wevm/frog/pull/294) [`c9257f5`](https://github.com/wevm/frog/commit/c9257f514bbbf2fb2a6668a89f8fae8391525a77) Thanks [@dalechyn](https://github.com/dalechyn)! - Introduced `.image` handler to handle images separately from the frame handler.

- [#325](https://github.com/wevm/frog/pull/325) [`d8aabe7`](https://github.com/wevm/frog/commit/d8aabe76c7e5f0de3e4f30943bd5421b4721c467) Thanks [@dalechyn](https://github.com/dalechyn)! - Removed `tailwindConfig` from the allowed properties in `imageOptions` since it's not fully implemented in Satori.

- [#324](https://github.com/wevm/frog/pull/324) [`a22492a`](https://github.com/wevm/frog/commit/a22492a1fb5021b7da8da149a62017349344dd74) Thanks [@dalechyn](https://github.com/dalechyn)! - Deleted `font` property from `imageOptions` type in frame handler response.

## 0.11.3

### Patch Changes

- [`7e8134c`](https://github.com/wevm/frog/commit/7e8134c6f0deea5c27ef1c9856f5adf3b0558e1e) Thanks [@tmm](https://github.com/tmm)! - Added Arbitrum chains for transaction support.

## 0.11.2

### Patch Changes

- [`117aae5`](https://github.com/wevm/frog/commit/117aae5673214b3f713bd4a3dff6ad9e257d75f8) Thanks [@tmm](https://github.com/tmm)! - Changed devtools cookie names to be (more) unique to avoid localhost conflicts

## 0.11.1

### Patch Changes

- [`a9123a0`](https://github.com/wevm/frog/commit/a9123a01848637d4040bb8757a51dedfc7aa0449) Thanks [@tmm](https://github.com/tmm)! - Added `createNeynar` for composing hub and middleware.

## 0.11.0

### Minor Changes

- [#255](https://github.com/wevm/frog/pull/255) [`752ccab`](https://github.com/wevm/frog/commit/752ccabcbe4083d747e2ee01c99352d0a0d567bb) Thanks [@dalechyn](https://github.com/dalechyn)! - **Breaking change** Frog UI `icon` property requires an icon map imported from the `'frog/ui/icons'` entrypoint. This also makes it easier for you to supply your own custom icons.

  ```diff
  + import { lucide } from 'frog/ui/icons'

  export const system = createSystem({
  - icons: 'lucide',
  + icons: lucide,
  })
  ```

  In addition, the following separate entrypoints were added for resource constrained environments.

  - `frog/ui/icons/heroicons`
  - `frog/ui/icons/lucide`
  - `frog/ui/icons/radix-icons`

## 0.10.0

### Minor Changes

- [`2aac5d5`](https://github.com/wevm/frog/commit/2aac5d54d73c329f1fe0e56aeff46d0ad23e12c8) Thanks [@tmm](https://github.com/tmm)! - Removed `frog` hub. Use `neynar` along with the `'NEYNAR_FROG_FM'` dev API key instead.

  ```diff
  import { Frog } from 'frog'
  - import { frog } from 'frog/hubs'
  + import { neynar } from 'frog/hubs'

  export const app = new Frog({
  - hub: frog(),
  + hub: neynar({ apiKey: 'NEYNAR_FROG_FM' }),
  })
  ```

## 0.9.4

### Patch Changes

- [#312](https://github.com/wevm/frog/pull/312) [`3a54496`](https://github.com/wevm/frog/commit/3a54496b4530073feff04216f8d3c4ec6f3526aa) Thanks [@0xboby](https://github.com/0xboby)! - Updated devtools to pass through gas for transactions

## 0.9.3

### Patch Changes

- [#309](https://github.com/wevm/frog/pull/309) [`7fedd5a`](https://github.com/wevm/frog/commit/7fedd5ac6e3d1e76d9d6a0f2f5fff5225ecb19ec) Thanks [@tmm](https://github.com/tmm)! - Added gas limit for contract transactions

## 0.9.2

### Patch Changes

- [#298](https://github.com/wevm/frog/pull/298) [`b9e181b`](https://github.com/wevm/frog/commit/b9e181b3355d65d2f9842b661d90c84d8e426e36) Thanks [@tmm](https://github.com/tmm)! - Added experimental feature to allow additional custom meta tags.

- [#295](https://github.com/wevm/frog/pull/295) [`14ec5b1`](https://github.com/wevm/frog/commit/14ec5b1922c594d169a67e2c43b898c99ba3eb79) Thanks [@sinasab](https://github.com/sinasab)! - Added verifyFrame util exports

- [#293](https://github.com/wevm/frog/pull/293) [`536c491`](https://github.com/wevm/frog/commit/536c491c175527c3fcbd3d80e99f323f2eecb27e) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `link` property to `CastActionMessageResponse` to display the toasted message as an external link to the specified URL.
  [See more](https://docs.farcaster.xyz/reference/actions/spec#message-response-type).

## 0.9.1

### Patch Changes

- [#292](https://github.com/wevm/frog/pull/292) [`0017052`](https://github.com/wevm/frog/commit/001705270445172cbfa17fbf3e1b82da2d102743) Thanks [@avneesh0612](https://github.com/avneesh0612)! - Added `verifyFrame` option to hub definition.

## 0.9.0

### Minor Changes

- [#251](https://github.com/wevm/frog/pull/251) [`f841edc`](https://github.com/wevm/frog/commit/f841edc49614a4fd67e5feaae7161f1592ea8c6d) Thanks [@dalechyn](https://github.com/dalechyn)! - Deprecated the Cast Actions Deeplink V1 format in favor of V2. [See more](https://warpcast.notion.site/Spec-Farcaster-Actions-84d5a85d479a43139ea883f6823d8caa).

  Breaking changes have affected `Button.AddCastAction` and `.castAction` handler:

  - `Button.AddCastAction` now only accepts `action` property;
  - `.castAction` handler now requries a third parameter (`options`) to be set. Properties that were removed from `Button.AddCastAction` have migrated here, and `aboutUrl` and `description` were added along.

- [#285](https://github.com/wevm/frog/pull/285) [`6fc1642`](https://github.com/wevm/frog/commit/6fc1642dd61e640054fade000bb9d54e1f4a49fe) Thanks [@dalechyn](https://github.com/dalechyn)! - Implemented multi-step cast actions. [See more](https://warpcast.notion.site/Frames-Multi-step-actions-f469054de8fb4ffc8b8e2649a41b6ad9?pvs=74).

  Breaking changes have affected `.castAction` handler definition and its response:

  - `.castAction` handler response now requires a `"type": "message" | "frame"` to be specified. Shorthands `c.message(...)` and `c.frame(...)` were added for the ease of use.

### Patch Changes

- [#286](https://github.com/wevm/frog/pull/286) [`bfb2f70`](https://github.com/wevm/frog/commit/bfb2f702734314399412b446dbe943f962de0450) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `gas` parameter to transaction response to specify the gas limit. [See more](https://warpcast.com/horsefacts.eth/0xd6390bb3).

## 0.8.7

### Patch Changes

- [#237](https://github.com/wevm/frog/pull/237) [`75f46a4`](https://github.com/wevm/frog/commit/75f46a4c75e2ded0fe7875481e996cdc05a366f7) Thanks [@dalechyn](https://github.com/dalechyn)! - Added root path support in `action` to jump into the root Frog instance via `'~'` symbol. Useful for code-splitting via `app.route`.

- [#287](https://github.com/wevm/frog/pull/287) [`268ee0d`](https://github.com/wevm/frog/commit/268ee0de2e0a310684b1f0a062fcf95a818a5f8c) Thanks [@dalechyn](https://github.com/dalechyn)! - Added degen chain support. [See more](https://warpcast.com/horsefacts.eth/0xd4fede11).

- [#257](https://github.com/wevm/frog/pull/257) [`0d41ddf`](https://github.com/wevm/frog/commit/0d41ddfd63397df502bf5e636609bf68e8c11ee9) Thanks [@dalechyn](https://github.com/dalechyn)! - Disabled watch process when frog CLI is called outside of a project directory.

## 0.8.6

### Patch Changes

- [#272](https://github.com/wevm/frog/pull/272) [`0bffc81`](https://github.com/wevm/frog/commit/0bffc817fd5ed405b86a9d73dd9dbd86f268d84b) Thanks [@dalechyn](https://github.com/dalechyn)! - Reverted changes from #222 that have caused issues in wrangler and edge environments. Intentionally introduced regression with "refreshing frame images" as #222 focused on bringing those work.

## 0.8.5

### Patch Changes

- [#241](https://github.com/wevm/frog/pull/241) [`97c5fd9`](https://github.com/wevm/frog/commit/97c5fd9a9383b809c1be886770c3e9e338c09813) Thanks [@dalechyn](https://github.com/dalechyn)! - Implemented error message response from frames. See https://warpcast.notion.site/Frames-Errors-ddc965b097d44d9ea03ddf98498597c6.

## 0.8.4

### Patch Changes

- [`8f1f038`](https://github.com/wevm/frog/commit/8f1f038bd95e9c0920ccfcbe94ba851dc798850b) Thanks [@jxom](https://github.com/jxom)! - Fixed `frog/ui` children types.

## 0.8.3

### Patch Changes

- [#256](https://github.com/wevm/frog/pull/256) [`02f03ff`](https://github.com/wevm/frog/commit/02f03ffe3be670b4ff55217fa2cbeccf776ea18e) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed a regression in local environments with templates other than `next` used where port was deleted when `X-Forwarded-Host` was not present that resulted in a malformed `postUrl` and `image` url values in the rendered frame meta tags.

- [#254](https://github.com/wevm/frog/pull/254) [`e38c898`](https://github.com/wevm/frog/commit/e38c8986a8ec5af84ea80fee3fcdf8e078996e0b) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue with local devtools with nextjs template that sets `x-forwarded-host` header to `localhost` which previously deleted the port and ended up creating incorrect link.

## 0.8.2

### Patch Changes

- [#246](https://github.com/wevm/frog/pull/246) [`1b2fffd`](https://github.com/wevm/frog/commit/1b2fffd0da3c8484497c719e338e09dd954d54c2) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where port is appended to a reverse-proxied server. Now when `x-forwarded-host` is found, port is deleted.

- [#249](https://github.com/wevm/frog/pull/249) [`dd0d297`](https://github.com/wevm/frog/commit/dd0d2972bd6343315c4ff1ad91426994a0786870) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed an issue where image could not be retrieved in vercel template.

- [#214](https://github.com/wevm/frog/pull/214) [`3fc8b5c`](https://github.com/wevm/frog/commit/3fc8b5c892c7fdf822fb7795063d3da7988046f2) Thanks [@dalechyn](https://github.com/dalechyn)! - Implemented "Cast Actions" support via `.castAction` handler.

- [#233](https://github.com/wevm/frog/pull/233) [`8a29c4d`](https://github.com/wevm/frog/commit/8a29c4db9f58c776cc1b2f832448d764f9b46b99) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed incorrect resolution of Google Font with italic style.

- [#222](https://github.com/wevm/frog/pull/222) [`7e9051d`](https://github.com/wevm/frog/commit/7e9051d6ff11828dce708e654909f6131a237bf6) Thanks [@dalechyn](https://github.com/dalechyn)! - Implemented image retrieval without search params for initial frame request.

## 0.8.1

### Patch Changes

- [#225](https://github.com/wevm/frog/pull/225) [`d219dff`](https://github.com/wevm/frog/commit/d219dff867f5355098b5f4fec6a3f75c9d50848b) Thanks [@tmm](https://github.com/tmm)! - Fixed JSX import source conflicts.

## 0.8.0

### Minor Changes

- [`c3e3290`](https://github.com/wevm/frog/commit/c3e3290c4bb37fece29ad402d00d4bc437dd577c) Thanks [@jxom](https://github.com/jxom)! - Added [FrogUI](https://frog.fm/ui).

## 0.7.16

### Patch Changes

- [#212](https://github.com/wevm/frog/pull/212) [`b5ccf51`](https://github.com/wevm/frog/commit/b5ccf518fa86b739d05ab0178e4f867bcec7d68d) Thanks [@dalechyn](https://github.com/dalechyn)! - Reverted changes introduced in 3d2f0014413abde5e6c76191c5cb44d5ecfa6e8c.

- [#208](https://github.com/wevm/frog/pull/208) [`22bf324`](https://github.com/wevm/frog/commit/22bf3246703d6d3f1d34b3345915ba972b620e01) Thanks [@dalechyn](https://github.com/dalechyn)! - Added Ethereum Mainnet chain id. See https://warpcast.com/horsefacts.eth/0x7c69e9dd.

## 0.7.15

### Patch Changes

- [#209](https://github.com/wevm/frog/pull/209) [`8ff91cb`](https://github.com/wevm/frog/commit/8ff91cb97cd2d501879fa32ec2341c5360c80cb9) Thanks [@dalechyn](https://github.com/dalechyn)! - Set `format` property to be `png` as warpcast does not support `svg+xml` content-type, which was the previously selected by default.

- [#210](https://github.com/wevm/frog/pull/210) [`ffa7108`](https://github.com/wevm/frog/commit/ffa7108f210544dfad855381ff5bb9ad83c855fd) Thanks [@dalechyn](https://github.com/dalechyn)! - Fixed broken `<Button.Reset>` behaviour.

## 0.7.14

### Patch Changes

- [#207](https://github.com/wevm/frog/pull/207) [`3d2f001`](https://github.com/wevm/frog/commit/3d2f0014413abde5e6c76191c5cb44d5ecfa6e8c) Thanks [@tmm](https://github.com/tmm)! - Fixed `<Button>` to use `post_url` internally instead of `target`.

- [#187](https://github.com/wevm/frog/pull/187) [`15ece3a`](https://github.com/wevm/frog/commit/15ece3a6b35909be1a4644e2926ce9358bb9779c) Thanks [@ggomaeng](https://github.com/ggomaeng)! - Added attribution option to transaction parameters

- [#206](https://github.com/wevm/frog/pull/206) [`365da14`](https://github.com/wevm/frog/commit/365da149e76bb46fe8a3b756f1d838e0364d3275) Thanks [@tmm](https://github.com/tmm)! - Added devtools support for transaction button post_url.

- [#200](https://github.com/wevm/frog/pull/200) [`8b2398c`](https://github.com/wevm/frog/commit/8b2398cdb2300a9d288f35762ddf354faa8a1600) Thanks [@ggomaeng](https://github.com/ggomaeng)! - Prioritized devtools route over dynamic path if it exists.

## 0.7.13

### Patch Changes

- [`dbc4b0b`](https://github.com/wevm/frog/commit/dbc4b0be5d280f97c41a5a9d931f762a5d8a7178) Thanks [@tmm](https://github.com/tmm)! - Fixed dev styles

## 0.7.12

### Patch Changes

- [`75dc0e8`](https://github.com/wevm/frog/commit/75dc0e8d279ad42e7a01dabe952ecc4c8e7ce822) Thanks [@tmm](https://github.com/tmm)! - Handled invalid transaction data

## 0.7.11

### Patch Changes

- [`b8d7dcc`](https://github.com/wevm/frog/commit/b8d7dcc6ce1c8237a630a684c458c7cfadbefb13) Thanks [@tmm](https://github.com/tmm)! - Fixed devtools non-Frog frame parsing.

## 0.7.10

### Patch Changes

- [#125](https://github.com/wevm/frog/pull/125) [`7e4feb3`](https://github.com/wevm/frog/commit/7e4feb33a46fbd010b9ad6e00f67fe441c5a0284) Thanks [@dalechyn](https://github.com/dalechyn)! - Added `isFrameRequest` util function to detect if request is for a frame from Warpcast.

## 0.7.9

### Patch Changes

- [`2903d8d`](https://github.com/wevm/frog/commit/2903d8da5d71053503de4afb51345fd23809502c) Thanks [@tmm](https://github.com/tmm)! - Fixed devtools bugs

## 0.7.8

### Patch Changes

- [#170](https://github.com/wevm/frog/pull/170) [`30b7979`](https://github.com/wevm/frog/commit/30b7979eb8468fd40c3575e034b6e67c6ae05546) Thanks [@tmm](https://github.com/tmm)! - Added transaction support to devtools.

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
