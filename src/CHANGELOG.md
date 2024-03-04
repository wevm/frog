# frog

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
