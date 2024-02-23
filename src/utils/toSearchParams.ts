// If this changes, update in dev/components/Preview.tsx as well

export function toSearchParams(object: object) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(object)) {
    const encoded = (() => {
      if (typeof value === 'string') return encodeURIComponent(value)
      if (typeof value === 'number') return value.toString()
      if (typeof value === 'boolean') return value.toString()
      if (typeof value === 'object' && value !== null) {
        return encodeURIComponent(
          Array.isArray(value)
            ? `#A_${value.join(',')}`
            : `#O_${JSON.stringify(value)}`,
        )
      }
      return undefined
    })()
    if (encoded) params.set(key, encoded)
  }
  return params
}
