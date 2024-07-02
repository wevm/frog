import type { JSXNode } from 'hono/jsx'

import type { Frog } from '../frog.js'
import type { Child, Direction } from '../ui/types.js'
import { parsePath } from './parsePath.js'

export async function parseImage(
  node_: Child,
  options: {
    assetsUrl: string
    ui: Frog['ui'] & { direction?: Direction | undefined }
  },
): Promise<Child> {
  if (!node_) return node_

  const { assetsUrl, ui } = options

  if (typeof node_ !== 'object') return node_
  if (Array.isArray(node_))
    return (await Promise.all(
      node_.map(async (e) => await parseImage(e, { assetsUrl, ui })),
    )) as Child

  if (node_ instanceof Promise) return await node_

  // Handle Fragment `<></>`
  if (node_.tag === '')
    return (await Promise.all(
      node_.children.map(async (e) => await parseImage(e, { assetsUrl, ui })),
    )) as Child

  let node = node_
  const direction =
    (node.tag as unknown as { direction: Direction } | undefined)?.direction ??
    options.ui.direction ??
    (node.props.flexDirection
      ? node.props.flexDirection === 'column'
        ? 'horizontal'
        : 'vertical'
      : undefined)

  if (typeof node.tag === 'function') {
    node = await node.tag({
      ...node.props,
      __context: {
        direction,
        vars: { ...node.props?.__context?.vars, ...ui?.vars },
      },
      children: node.children,
    })
    if (!node) return node
    node.props.__context = undefined
    node = (await parseImage(node, {
      assetsUrl,
      ui: { ...ui, direction },
    })) as JSXNode
  }
  if (node.children)
    node.children = await Promise.all(
      node.children.map(
        async (e) =>
          await parseImage(e, { assetsUrl, ui: { ...ui, direction } }),
      ),
    )
  if (node.tag === 'img') {
    const src = node.props.src
    if (src.startsWith('/')) node.props.src = `${assetsUrl + parsePath(src)}`
  }

  return node
}
