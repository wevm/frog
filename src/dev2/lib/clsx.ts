// clsx
// https://github.com/lukeed/clsx

type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | null
  | boolean
  | undefined
type ClassDictionary = Record<string, any>
type ClassArray = ClassValue[]

export function clsx(...inputs: ClassValue[]) {
  const len = inputs.length

  let i = 0
  let tmp = undefined
  let x = undefined
  let str = ''

  for (; i < len; i++) {
    tmp = inputs[i]
    if (!tmp) return
    x = toVal(tmp)
    if (!x) return

    if (str) str += ' '
    str += x
  }

  return str
}

function toVal(mix: ClassValue) {
  let k = undefined
  let y = undefined
  let str = ''

  if (typeof mix === 'string' || typeof mix === 'number') str += mix
  else if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      const len = mix.length
      for (k = 0; k < len; k++) {
        if (mix[k]) {
          y = toVal(mix[k])
          if (y) {
            if (str) str += ' '
            str += y
          }
        }
      }
    } else {
      for (y in mix) {
        if (mix?.[y]) {
          if (str) str += ' '
          str += y
        }
      }
    }
  }

  return str
}
