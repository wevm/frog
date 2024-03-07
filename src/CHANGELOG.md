# frog

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
