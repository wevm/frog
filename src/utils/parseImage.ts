import type { Child } from 'hono/jsx'
import { parsePath } from './parsePath.js'

export async function parseImage(
  node_: Child,
  { assetsUrl }: { assetsUrl: string },
): Promise<Child> {
  if (typeof node_ !== 'object') return node_
  if (Array.isArray(node_))
    return (await Promise.all(
      node_.map(async (e) => await parseImage(e, { assetsUrl })),
    )) as Child
  if (node_ instanceof Promise) return await node_

  let node = node_
  if (typeof node.tag === 'function')
    node = await node.tag({
      ...node.props,
      children: node.children,
    })
  if (node.children)
    node.children = await Promise.all(
      node.children.map(async (e) => await parseImage(e, { assetsUrl })),
    )
  if (node.tag === 'img') {
    const src = node.props.src
    if (src.startsWith('/')) node.props.src = `${assetsUrl + parsePath(src)}`
  }
  return node
}
