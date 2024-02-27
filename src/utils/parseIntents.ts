import { type JSXNode } from 'hono/jsx'

import { type FrameIntents } from '../types.js'
import { parsePath } from './parsePath.js'

type Counter = { button: number }

type ParseIntentsOptions = {
  baseUrl?: string
  search?: string
}

export function parseIntents(
  intents_: FrameIntents | undefined,
  options: ParseIntentsOptions = {},
  counter: Counter = { button: 1 },
): JSXNode[] {
  if (!intents_) return []
  const nodes = intents_ as unknown as JSXNode | JSXNode[]

  const intents = (() => {
    if (Array.isArray(nodes))
      return nodes.map((e) => parseIntent(e as JSXNode, options, counter))
    if (typeof nodes.children[0] === 'object')
      return Object.assign(nodes, {
        children: nodes.children.map((e) =>
          parseIntent(e as JSXNode, options, counter),
        ),
      })
    return parseIntent(nodes, options, counter)
  })()

  return (Array.isArray(intents) ? intents : [intents]).flat()
}

function parseIntent(
  node_: JSXNode,
  options: ParseIntentsOptions,
  counter: Counter,
): JSXNode | JSXNode[] {
  // Check if the node is a "falsy" node (ie. `null`, `undefined`, `false`, etc).
  const node = (
    !node_ ? { children: [], props: {}, tag() {} } : node_
  ) as JSXNode

  const props = (() => {
    if ((node.tag as any).__type === 'button') {
      const search = (node.props.location ?? '').split('?')[1]
      return {
        ...node.props,
        action: node.props.action
          ? parsePath(options.baseUrl + node.props.action) +
            (options.search ? `?${options.search}` : '')
          : undefined,
        children: node.children,
        location: node.props.location
          ? node.props.location?.startsWith('http')
            ? node.props.location
            : parsePath(options.baseUrl + node.props.location) +
              (search ? `?${search}` : '')
          : undefined,
        index: counter.button++,
      }
    }
    if ((node.tag as any).__type === 'text-input')
      return { ...node.props, children: node.children }
    return {}
  })()

  const intent = (
    typeof node.tag === 'function' ? node.tag(props) : node
  ) as JSXNode

  if (intent?.tag === '' && Object.keys(intent.props).length === 0)
    throw new InvalidIntentComponentError()

  if (typeof intent?.tag === 'function' && typeof node.tag === 'function') {
    if (intent.children.length > 1) throw new InvalidIntentComponentError()
    return parseIntent(node.tag(node.props), options, counter)
  }
  return intent
}

class InvalidIntentComponentError extends Error {
  constructor() {
    super(
      [
        'Intent components must return a single intent element.',
        '',
        'Example:',
        '',
        '```',
        "import { Button } from 'frog'",
        '',
        'function CustomIntent() {',
        '  return <Button>Foo</Button>',
        '}',
        '```',
      ].join('\n'),
    )
  }
}
