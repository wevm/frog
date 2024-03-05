import { useCallback, useState } from 'hono/jsx/dom'

type UseCopyToClipboardParameters = {
  timeout?: number | undefined
  value: string
}

export function useCopyToClipboard(parameters: UseCopyToClipboardParameters) {
  const { timeout = 1_000, value } = parameters

  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (copied) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), timeout)
  }, [timeout, value])

  return { copied, copy }
}
