import type { JSX } from 'hono/jsx/jsx-runtime'

export type TextInputProps = {
  placeholder?: string | undefined
}

TextInput.__type = 'text-input'
export function TextInput({ placeholder }: TextInputProps): JSX.Element {
  return <meta property="fc:frame:input:text" content={placeholder} />
}
