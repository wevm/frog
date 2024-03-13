import type { FrameContext } from '../../../src/types/context'
import type { Frame } from '../../../src/dev/types'
import { Client } from '../lib/api'

export type ApiData = FramesRouteGet

export type Data = {
  context: FrameContext
  frame: Frame
} & ApiData

export type { Frame, FrameContext }

///

type FramesRouteGet = Awaited<
  ReturnType<Awaited<ReturnType<Client['frames'][':route']['$get']>>['json']>
>
