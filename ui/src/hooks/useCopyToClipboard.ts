import { useCallback, useState } from 'react'

type UseCopyToClipboardParameters = {
  timeout?: number | undefined
  value: string | undefined
}

export function useCopyToClipboard(parameters: UseCopyToClipboardParameters) {
  const { timeout = 1_000, value } = parameters

  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (copied) return
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), timeout)
  }, [timeout, value, copied])

  return { copied, copy }
}
