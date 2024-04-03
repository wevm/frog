import type { ResolvedRegister } from 'viem'

export type Assign<T, U> = Assign_<T, U> & U
type Assign_<T, U> = {
  [K in keyof T as K extends keyof U
    ? // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
      U[K] extends void
      ? never
      : K
    : K]: K extends keyof U ? U[K] : T[K]
}

export type Pretty<type> = { [key in keyof type]: type[key] } & unknown

export type UnionPretty<type> = type extends object ? Pretty<type> : type

export type Widen<type> =
  | ([unknown] extends [type] ? unknown : never)
  | (type extends Function ? type : never)
  | (type extends ResolvedRegister['BigIntType'] ? bigint : never)
  | (type extends boolean ? boolean : never)
  | (type extends ResolvedRegister['IntType'] ? number : never)
  | (type extends string
      ? type extends ResolvedRegister['AddressType']
        ? ResolvedRegister['AddressType']
        : type extends ResolvedRegister['BytesType']['inputs']
          ? ResolvedRegister['BytesType']
          : string
      : never)
  | (type extends readonly [] ? readonly [] : never)
  | (type extends Record<string, unknown>
      ? { [K in keyof type]: Widen<type[K]> }
      : never)
  | (type extends { length: number }
      ? {
          [K in keyof type]: Widen<type[K]>
        } extends infer Val extends readonly unknown[]
        ? readonly [...Val]
        : never
      : never)

export type UnionWiden<type> = type extends any ? Widen<type> : never
