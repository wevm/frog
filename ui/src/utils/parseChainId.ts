import type { ChainIdEip155 } from '../types/frog'

// https://regexr.com/7tstq
// https://chainagnostic.org/CAIPs/caip-2
const caip2Regex =
  /^(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32})$/

export function parseChainId(caip2ChainId: string) {
  const { groups } = caip2Regex.exec(caip2ChainId) || {}
  const namespace = groups?.namespace
  const reference = Number(groups?.reference) as ChainIdEip155
  return { namespace, reference }
}
