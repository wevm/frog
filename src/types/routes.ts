// NOTE: THIS IS A FORK OF https://github.com/honojs/hono/blob/139e863aa214118397e442329121f8f39833b2f9/src/types.ts

import type { Context as Context_hono } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type {
  IfAnyThenEmptyObject,
  RemoveBlankRecord,
  UnionToIntersection,
} from 'hono/utils/types'
import type { FrogBase, RouteOptions } from '../frog-base.js'
import type { CastActionResponse } from './castAction.js'
import type { ComposerActionResponse } from './composerAction.js'
import type {
  CastActionContext,
  ComposerActionContext,
  Context,
  FrameContext,
  ImageContext,
  SignatureContext,
  TransactionContext,
} from './context.js'
import type { Env } from './env.js'
import type { FrameResponse } from './frame.js'
import type { ImageResponse } from './image.js'
import type { HandlerResponse } from './response.js'
import type { SignatureResponse } from './signature.js'
import type { TransactionResponse } from './transaction.js'

////////////////////////////////////////
//////                            //////
//////           Values           //////
//////                            //////
////////////////////////////////////////

export type Next = () => Promise<void>

export type Input = {
  in?: Partial<ValidationTargets>
  out?: Partial<{ [K in keyof ValidationTargets]: unknown }>
}

export type BlankSchema = {}
export type BlankInput = {}

////////////////////////////////////////
//////                            //////
//////          Handlers          //////
//////                            //////
////////////////////////////////////////

export type CastActionHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (c: CastActionContext<E, P, I>) => HandlerResponse<CastActionResponse>

export type ComposerActionHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (
  c: ComposerActionContext<E, P, I>,
) => HandlerResponse<ComposerActionResponse>

export type FrameHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (c: FrameContext<E, P, I>) => HandlerResponse<FrameResponse>

export type ImageHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (c: ImageContext<E, P, I>) => HandlerResponse<ImageResponse>

export type TransactionHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (c: TransactionContext<E, P, I>) => HandlerResponse<TransactionResponse>

export type SignatureHandler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
> = (c: SignatureContext<E, P, I>) => HandlerResponse<SignatureResponse>

export type Handler<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
  R extends HandlerResponse<any> = any,
> = (c: Context<E, P, I>) => R

export type MiddlewareHandler<
  E extends Env = any,
  P extends string = string,
  I extends Input = {},
  // biome-ignore lint/suspicious/noConfusingVoidType:
> = (c: Context_hono<E, P, I>, next: Next) => Promise<Response | void>

export type H<
  E extends Env = any,
  P extends string = any,
  I extends Input = BlankInput,
  R extends HandlerResponse<any> = any,
  M extends string = string,
> = M extends 'frame'
  ? FrameHandler<E, P, I>
  : M extends 'transaction'
    ? TransactionHandler<E, P, I>
    : M extends 'castAction'
      ? CastActionHandler<E, P, I>
      : M extends 'composerAction'
        ? ComposerActionHandler<E, P, I>
        : M extends 'image'
          ? ImageHandler<E, P, I>
          : M extends 'signature'
            ? SignatureHandler<E, P, I>
            : Handler<E, P, I, R>

////////////////////////////////////////
//////                            //////
//////     HandlerInterface       //////
//////                            //////
////////////////////////////////////////

export type HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  S extends Schema = {},
  BasePath extends string = '/',
> = {
  // app.get(path, handler, options)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E,
  >(
    path: P,
    handler: H<E2, MergedPath, I, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    handler: H<E3, MergedPath, I2, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I2['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x2, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    handler: H<E4, MergedPath, I3, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x3, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    handler: H<E5, MergedPath, I4, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x4, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    handler: H<E6, MergedPath, I5, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x5, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    middleware_5: MiddlewareHandler<E6, MergedPath, I5>,
    handler: H<E7, MergedPath, I6, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I6['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x6, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    middleware_5: MiddlewareHandler<E6, MergedPath, I5>,
    middleware_6: MiddlewareHandler<E7, MergedPath, I6>,
    handler: H<E8, MergedPath, I7, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I7['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x7, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    middleware_5: MiddlewareHandler<E6, MergedPath, I5>,
    middleware_6: MiddlewareHandler<E7, MergedPath, I6>,
    middleware_7: MiddlewareHandler<E8, MergedPath, I7>,
    handler: H<E9, MergedPath, I8, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I8['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x8, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    middleware_5: MiddlewareHandler<E6, MergedPath, I5>,
    middleware_6: MiddlewareHandler<E7, MergedPath, I6>,
    middleware_7: MiddlewareHandler<E8, MergedPath, I7>,
    middleware_8: MiddlewareHandler<E9, MergedPath, I8>,
    handler: H<E10, MergedPath, I9, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I9['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(path, middleware x9, handler)
  <
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<
      [E, E2, E3, E4, E5, E6, E7, E8, E9, E10]
    >,
  >(
    path: P,
    middleware: MiddlewareHandler<E2, MergedPath, I>,
    middleware_2: MiddlewareHandler<E3, MergedPath, I2>,
    middleware_3: MiddlewareHandler<E4, MergedPath, I3>,
    middleware_4: MiddlewareHandler<E5, MergedPath, I4>,
    middleware_5: MiddlewareHandler<E6, MergedPath, I5>,
    middleware_6: MiddlewareHandler<E7, MergedPath, I6>,
    middleware_7: MiddlewareHandler<E8, MergedPath, I7>,
    middleware_8: MiddlewareHandler<E9, MergedPath, I8>,
    middleware_9: MiddlewareHandler<E10, MergedPath, I9>,
    handler: H<E11, MergedPath, I10, R, M>,
    ...rest: M extends 'castAction' | 'composerAction'
      ? [options: RouteOptions<M, E2, MergedPath, I>]
      : [options?: RouteOptions<M>]
  ): FrogBase<
    E,
    S &
      ToSchema<M, MergePath<BasePath, P>, I10['in'], MergeTypedResponseData<R>>,
    BasePath
  >
}

////////////////////////////////////////
//////                            //////
////// MiddlewareHandlerInterface //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/',
> {
  //// app.use(...handlers[])
  <E2 extends Env = E>(
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, ExtractKey<S>>>[]
  ): FrogBase<IntersectNonAnyTypes<[E, E2]>, S, BasePath>

  // app.use(handler)
  <E2 extends Env = E>(
    handler: MiddlewareHandler<E2, MergePath<BasePath, ExtractKey<S>>>,
  ): FrogBase<IntersectNonAnyTypes<[E, E2]>, S, BasePath>

  // app.use(handler x2)
  <
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [MiddlewareHandler<E2, P>, MiddlewareHandler<E3, P>]
  ): FrogBase<IntersectNonAnyTypes<[E, E2, E3]>, S, BasePath>

  // app.use(handler x3)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
    ]
  ): FrogBase<IntersectNonAnyTypes<[E, E2, E3, E4]>, S, BasePath>

  // app.use(handler x4)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
    ]
  ): FrogBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5]>, S, BasePath>

  // app.use(handler x5)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
    ]
  ): FrogBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>, S, BasePath>

  // app.use(handler x6)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
    ]
  ): FrogBase<IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>, S, BasePath>

  // app.use(handler x7)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S,
    BasePath
  >

  // app.use(handler x8)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S,
    BasePath
  >

  // app.use(handler x9)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>,
      MiddlewareHandler<E10, P>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S,
    BasePath
  >

  // app.use(handler x10)
  <
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<
      [E, E2, E3, E4, E5, E6, E7, E8, E9, E10]
    >,
    P extends string = MergePath<BasePath, ExtractKey<S>>,
  >(
    ...handlers: [
      MiddlewareHandler<E2, P>,
      MiddlewareHandler<E3, P>,
      MiddlewareHandler<E4, P>,
      MiddlewareHandler<E5, P>,
      MiddlewareHandler<E6, P>,
      MiddlewareHandler<E7, P>,
      MiddlewareHandler<E8, P>,
      MiddlewareHandler<E9, P>,
      MiddlewareHandler<E10, P>,
      MiddlewareHandler<E11, P>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S,
    BasePath
  >

  //// app.use(path, ...handlers[])
  <P extends string, E2 extends Env = E>(
    path: P,
    ...handlers: MiddlewareHandler<E2, MergePath<BasePath, P>>[]
  ): FrogBase<E, S, BasePath>
}

////////////////////////////////////////
//////                            //////
//////     OnHandlerInterface     //////
//////                            //////
////////////////////////////////////////

export interface OnHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/',
> {
  // app.on(method, path, handler)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E,
  >(
    method: M,
    path: P,
    handler: H<E2, MergedPath, I, R>,
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2]>,
    S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x2)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I2['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x3)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I3['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x4)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I4['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x5)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I5['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x6)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I6['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x7)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I7['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x8)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I8['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x9)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S &
      ToSchema<M, MergePath<BasePath, P>, I9['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.on(method, path, handler x10)
  <
    M extends string,
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<
      [E, E2, E3, E4, E5, E6, E7, E8, E9, E10]
    >,
  >(
    method: M,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
      H<E11, MergedPath, I10>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S &
      ToSchema<
        M,
        MergePath<BasePath, P>,
        I10['in'],
        MergeTypedResponseData<HandlerResponse<any>>
      >,
    BasePath
  >

  // app.get(method, path, ...handler)
  <
    M extends string,
    P extends string,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
  >(
    method: M,
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): FrogBase<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >

  // app.get(method[], path, handler)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    E2 extends Env = E,
  >(
    methods: Ms,
    path: P,
    handler: H<E2, MergedPath, I, R>,
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x2)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [H<E2, MergedPath, I>, H<E3, MergedPath, I2, R>]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I2['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x3)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I3['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x4)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I4['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x5)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I5['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x6)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I6['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x7)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I7['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x8)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    R extends HandlerResponse<any> = any,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8, R>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I8['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.get(method[], path, handler x9)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9]>,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I9['in'],
        MergeTypedResponseData<HandlerResponse<any>>
      >,
    BasePath
  >

  // app.get(method[], path, handler x10)
  <
    Ms extends string[],
    P extends string,
    MergedPath extends MergePath<BasePath, P> = MergePath<BasePath, P>,
    I extends Input = BlankInput,
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    I6 extends Input = I & I2 & I3 & I4 & I5,
    I7 extends Input = I & I2 & I3 & I4 & I5 & I6,
    I8 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7,
    I9 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8,
    I10 extends Input = I & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = E,
    E7 extends Env = E,
    E8 extends Env = E,
    E9 extends Env = E,
    E10 extends Env = E,
    E11 extends Env = IntersectNonAnyTypes<
      [E, E2, E3, E4, E5, E6, E7, E8, E9, E10]
    >,
  >(
    methods: Ms,
    path: P,
    ...handlers: [
      H<E2, MergedPath, I>,
      H<E3, MergedPath, I2>,
      H<E4, MergedPath, I3>,
      H<E5, MergedPath, I4>,
      H<E6, MergedPath, I5>,
      H<E7, MergedPath, I6>,
      H<E8, MergedPath, I7>,
      H<E9, MergedPath, I8>,
      H<E10, MergedPath, I9>,
      H<E11, MergedPath, I10>,
    ]
  ): FrogBase<
    IntersectNonAnyTypes<[E, E2, E3, E4, E5, E6, E7, E8, E9, E10, E11]>,
    S &
      ToSchema<
        Ms[number],
        MergePath<BasePath, P>,
        I10['in'],
        MergeTypedResponseData<HandlerResponse<any>>
      >,
    BasePath
  >

  // app.on(method[], path, ...handler)
  <
    P extends string,
    R extends HandlerResponse<any> = any,
    I extends Input = {},
  >(
    methods: string[],
    path: P,
    ...handlers: H<E, MergePath<BasePath, P>, I, R>[]
  ): FrogBase<
    E,
    S &
      ToSchema<
        string,
        MergePath<BasePath, P>,
        I['in'],
        MergeTypedResponseData<R>
      >,
    BasePath
  >

  // app.on(method | method[], path[], ...handlers[])
  <I extends Input = BlankInput, R extends HandlerResponse<any> = any>(
    methods: string | string[],
    paths: string[],
    ...handlers: H<E, any, I, R>[]
  ): FrogBase<
    E,
    S & ToSchema<string, string, I['in'], MergeTypedResponseData<R>>,
    BasePath
  >
}

type ExtractKey<S> = S extends Record<infer Key, unknown>
  ? Key extends string
    ? Key
    : never
  : string

////////////////////////////////////////
//////                            //////
//////           ToSchema           //////
//////                            //////
////////////////////////////////////////

export type ToSchema<
  M extends string,
  P extends string,
  I extends Input['in'],
  O,
> = {
  [K in P]: {
    [K2 in M as AddDollar<K2>]: {
      input: unknown extends I ? AddParam<{}, P> : AddParam<I, P>
      output: unknown extends O ? {} : O
    }
  }
}

export type KnownResponseFormat = 'json' | 'text' | 'redirect'
export type ResponseFormat = KnownResponseFormat | string

export type Schema = {
  [Path: string]: {
    [Method: `$${Lowercase<string>}`]: {
      input: Partial<ValidationTargets> & {
        param?: Record<string, string | undefined>
      }
      output: any
      outputFormat: ResponseFormat
      status: StatusCode
    }
  }
}

type ExtractParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string }
    : Path extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: string }
      : never

type FlattenIfIntersect<T> = T extends infer O
  ? { [K in keyof O]: O[K] }
  : never

export type MergeSchemaPath<
  OrigSchema extends Schema,
  SubPath extends string,
> = {
  [P in keyof OrigSchema as MergePath<SubPath, P & string>]: {
    [M in keyof OrigSchema[P]]: OrigSchema[P][M] extends {
      input: infer Input
      output: infer Output
    }
      ? {
          input: Input extends { param: infer _ }
            ? ExtractParams<SubPath> extends never
              ? Input
              : FlattenIfIntersect<Input & { param: ExtractParams<SubPath> }>
            : RemoveBlankRecord<ExtractParams<SubPath>> extends never
              ? Input
              : Input & { param: ExtractParams<SubPath> }
          output: Output
        }
      : never
  }
}

export type AddParam<I, P extends string> = ParamKeys<P> extends never
  ? I
  : I extends { param: infer _ }
    ? I
    : I & { param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>> }

type AddDollar<T extends string> = `$${Lowercase<T>}`

export type MergePath<A extends string, B extends string> = A extends ''
  ? B
  : A extends '/'
    ? B
    : A extends `${infer P}/`
      ? B extends `/${infer Q}`
        ? `${P}/${Q}`
        : `${P}/${B}`
      : B extends `/${infer Q}`
        ? Q extends ''
          ? A
          : `${A}/${Q}`
        : `${A}/${B}`

////////////////////////////////////////
//////                            //////
//////        TypedResponse       //////
//////                            //////
////////////////////////////////////////

export type TypedResponse<T = unknown> = {
  data: T
  format: 'json' // Currently, support only `json` with `c.jsonT()`
}

type ExtractResponseData<T> = T extends Promise<infer T2>
  ? T2 extends TypedResponse<infer U>
    ? U
    : {}
  : T extends TypedResponse<infer U>
    ? U
    : {}

type MergeTypedResponseData<T> = ExtractResponseData<T>

////////////////////////////////////////
//////                             /////
//////      ValidationTargets      /////
//////                             /////
////////////////////////////////////////

export type ValidationTargets = {
  json: any
  form: Record<string, string | File>
  query: Record<string, string | string[]>
  param: Record<string, string> | Record<string, string | undefined>
  header: Record<string, string>
  cookie: Record<string, string>
}

////////////////////////////////////////
//////                            //////
//////      Path parameters       //////
//////                            //////
////////////////////////////////////////

type ParamKeyName<NameWithPattern> =
  NameWithPattern extends `${infer Name}{${infer Rest}`
    ? Rest extends `${infer _Pattern}?`
      ? `${Name}?`
      : Name
    : NameWithPattern

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>

export type ParamKeyToRecord<T extends string> = T extends `${infer R}?`
  ? Record<R, string | undefined>
  : { [K in T]: string }

////////////////////////////////////////
//////                            //////
/////       For HonoRequest       //////
//////                            //////
////////////////////////////////////////

export type InputToDataByTarget<
  T extends Input['out'],
  Target extends keyof ValidationTargets,
> = T extends {
  [K in Target]: infer R
}
  ? R
  : never

export type RemoveQuestion<T> = T extends `${infer R}?` ? R : T

export type UndefinedIfHavingQuestion<T> = T extends `${infer _}?`
  ? string | undefined
  : string

////////////////////////////////////////
//////                            //////
//////         Utilities          //////
//////                            //////
////////////////////////////////////////

export type ExtractSchema<T> = UnionToIntersection<
  T extends FrogBase<infer _, infer S, any> ? S : never
>

type EnvOrEmpty<T> = T extends Env ? (Env extends T ? {} : T) : T
type IntersectNonAnyTypes<T extends any[]> = T extends [
  infer Head,
  ...infer Rest,
]
  ? IfAnyThenEmptyObject<EnvOrEmpty<Head>> & IntersectNonAnyTypes<Rest>
  : {}
