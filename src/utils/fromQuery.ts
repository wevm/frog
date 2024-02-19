export function fromQuery<returnType>(query: object): returnType {
  const obj: Record<string, any> = {}
  for (const [key, value] of Object.entries(query)) {
    let decoded: any = decodeURIComponent(value)
    if (decoded.startsWith('#A_'))
      decoded = decoded.replace('#A_', '').split(',')
    else if (decoded.startsWith('#O_'))
      decoded = JSON.parse(decoded.replace('#O_', ''))

    // Omit any encoded ampersands.
    obj[key.replace(/^amp;/, '')] = decoded
  }
  return obj as returnType
}
