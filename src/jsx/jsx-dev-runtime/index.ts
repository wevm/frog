import { type JSXNode, jsx } from 'hono/jsx'
export type { JSX } from 'hono/jsx/jsx-runtime'
import type { HtmlEscapedString } from 'hono/utils/html'
export { Fragment } from 'hono/jsx'

export function jsxDEV(
  tag: string | Function,
  props: Record<string, unknown>,
  key?: string,
): JSXNode {
  let node: JSXNode
  if (!props || !('children' in props)) {
    node = jsx(tag, props, ...[])
  } else {
    const children = props.children as string | HtmlEscapedString
    // biome-ignore lint/performance/noDelete:
    // biome-ignore lint/complexity/useLiteralKeys:
    delete props['children']
    node = Array.isArray(children)
      ? jsx(tag, props, ...children)
      : jsx(tag, props, ...[children])
  }
  node.key = key
  return node
}
