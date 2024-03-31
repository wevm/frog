import type { Child, JSXNode } from 'hono/jsx'
import type { Frog } from '../frog.js'
import { parsePath } from './parsePath.js'

export async function parseImage(
  node_: Child,
  { assetsUrl, ui }: { assetsUrl: string; ui: Frog['ui'] },
): Promise<Child> {
  if (typeof node_ !== 'object') return node_
  if (Array.isArray(node_))
    return (await Promise.all(
      node_.map(async (e) => await parseImage(e, { assetsUrl, ui })),
    )) as Child
  if (node_ instanceof Promise) return await node_

  let node = node_

  if (typeof node.tag === 'function') {
    node = await node.tag({
      ...node.props,
      __context: { vars: { ...node.props?.__context?.vars, ...ui?.vars } },
      children: node.children,
    })
    node.props.__context = undefined
    node = (await parseImage(node, { assetsUrl, ui })) as JSXNode
  }
  if (node.children)
    node.children = await Promise.all(
      node.children.map(async (e) => await parseImage(e, { assetsUrl, ui })),
    )
  if (node.tag === 'img') {
    const src = node.props.src
    if (src.startsWith('/')) node.props.src = `${assetsUrl + parsePath(src)}`
  }

  return node
}
