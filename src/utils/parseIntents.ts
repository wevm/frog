import { type JSXNode } from 'hono/jsx'

import { type FrameIntents } from '../types.js'

type Counter = { button: number }

export function parseIntents(intents_: FrameIntents) {
  const nodes = intents_ as unknown as JSXNode | JSXNode[]
  const counter: Counter = {
    button: 1,
  }

  const intents = (() => {
    if (Array.isArray(nodes))
      return nodes.map((e) => parseIntent(e as JSXNode, counter))
    if (typeof nodes.children[0] === 'object')
      return Object.assign(nodes, {
        children: nodes.children.map((e) => parseIntent(e as JSXNode, counter)),
      })
    return parseIntent(nodes, counter)
  })()

  return (Array.isArray(intents) ? intents : [intents]).flat()
}

function parseIntent(node_: JSXNode, counter: Counter) {
  // Check if the node is a "falsy" node (ie. `null`, `undefined`, `false`, etc).
  const node = (
    !node_ ? { children: [], props: {}, tag() {} } : node_
  ) as JSXNode

  const props = (() => {
    if ((node.tag as any).__type === 'button')
      return { ...node.props, children: node.children, index: counter.button++ }
    if ((node.tag as any).__type === 'text-input')
      return { ...node.props, children: node.children }
    return {}
  })()

  return (typeof node.tag === 'function' ? node.tag(props) : node) as JSXNode
}
