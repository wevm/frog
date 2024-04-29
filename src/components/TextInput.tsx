export type TextInputProps = {
  placeholder?: string | undefined
}

TextInput.__type = 'text-input'
export function TextInput({
  placeholder,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: TextInputProps): JSX.Element {
  return <meta property={`${prefix}:input:text`} content={placeholder} />
}
