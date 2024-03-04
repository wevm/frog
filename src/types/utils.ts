export type Pretty<type> = { [key in keyof type]: type[key] } & unknown
