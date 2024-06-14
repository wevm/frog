import {
  integer,
  maxValue,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
  undefined_,
  union,
} from 'valibot'

import { defaultCastId } from './constants.js'

// TODO: Add additional validations
export const postSchema = object({
  buttonIndex: pipe(number(), integer(), minValue(1), maxValue(4)),
  castId: optional(
    object({
      fid: pipe(number(), integer(), minValue(1)),
      hash: string(),
    }),
    defaultCastId,
  ),
  fid: pipe(number(), integer(), minValue(1)),
  fromAddress: union([undefined_(), string()]),
  inputText: union([undefined_(), string()]),
  state: union([undefined_(), string()]),
  transactionId: union([undefined_(), string()]),
  sourceFrameId: string(),
} as const)
