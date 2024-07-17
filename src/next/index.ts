// TODO: Rename this package to `js` as most of it doesn't strictly depend
// on Next.JS specific features. Only `handle` does.

export { getFrameMetadata } from './getFrameMetadata.js'
export { handle } from '../vercel/index.js'
export { isFrameRequest } from './isFrameRequest.js'
export {
  postComposerActionMessage,
  postComposerCreateCastActionMessage,
} from './postComposerActionMessage.js'
