import type { Child, JSXNode } from 'hono/jsx'
import type { Tokens } from '../ui/tokens.js'
import { parsePath } from './parsePath.js'

export async function parseImage(
  node_: Child,
  { assetsUrl, tokens }: { assetsUrl: string; tokens?: Tokens },
): Promise<Child> {
  if (typeof node_ !== 'object') return node_
  if (Array.isArray(node_))
    return (await Promise.all(
      node_.map(async (e) => await parseImage(e, { assetsUrl, tokens })),
    )) as Child
  if (node_ instanceof Promise) return await node_

  let node = node_

  if (typeof node.tag === 'function') {
    node = await node.tag({
      ...node.props,
      __context: { tokens: { ...node.props?.__context?.tokens, ...tokens } },
      children: node.children,
    })
    node.props.__context = undefined
    node = (await parseImage(node, { assetsUrl, tokens })) as JSXNode
  }
  if (node.children)
    node.children = await Promise.all(
      node.children.map(
        async (e) => await parseImage(e, { assetsUrl, tokens }),
      ),
    )
  if (node.tag === 'img') {
    const src = node.props.src
    if (src.startsWith('/')) node.props.src = `${assetsUrl + parsePath(src)}`
  }

  return node
}
