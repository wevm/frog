import {
  integer,
  number,
  object,
  minValue,
  maxValue,
  string,
  union,
  undefined_,
  optional,
} from 'valibot'

import { defaultCastId } from './constants.js'

// TODO: Add additional validations
export const postSchema = object({
  buttonIndex: number([integer(), minValue(1), maxValue(4)]),
  castId: optional(
    object({
      fid: number([integer(), minValue(1)]),
      hash: string(),
    }),
    defaultCastId,
  ),
  fid: number([integer(), minValue(1)]),
  inputText: union([undefined_(), string()]),
  state: union([undefined_(), string()]),
})
