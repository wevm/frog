import type { HtmlEscapedString } from 'hono/utils/html'

export const buttonPrefix = {
  addCastAction: '_a',
  link: '_l',
  mint: '_m',
  redirect: '_r',
  reset: '_c',
  transaction: '_t',
}

export type ButtonProps = {
  children: string | string[]
}

export type ButtonRootProps = ButtonProps & {
  action?: string | undefined
  value?: string | undefined
}

ButtonRoot.__type = 'button'
export function ButtonRoot({
  action,
  children,
  // @ts-ignore - private
  index = 1,
  // @ts-ignore - private
  prefix = 'fc:frame',
  value,
}: ButtonRootProps): JSX.Element {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      {...(value ? { 'data-value': value } : {})}
    />,
    <meta property={`${prefix}:button:${index}:action`} content="post" />,
    action && (
      <meta property={`${prefix}:button:${index}:target`} content={action} />
    ),
  ] as unknown as HtmlEscapedString
}

export type ButtonAddCastActionProps = ButtonProps & {
  /** Action path */
  action: string
}

ButtonAddCastAction.__type = 'button'
export function ButtonAddCastAction({
  action,
  children,
  // @ts-ignore - private
  index = 1,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonAddCastActionProps) {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.addCastAction}
    />,
    <meta property={`${prefix}:button:${index}:action`} content="link" />,
    <meta
      property={`${prefix}:button:${index}:target`}
      content={`https://warpcast.com/~/add-cast-action?url=${action}`}
    />,
  ] as unknown as HtmlEscapedString
}

export type ButtonLinkProps = ButtonProps & {
  href: string
}

ButtonLink.__type = 'button'
export function ButtonLink({
  children,
  // @ts-ignore - private
  index = 1,
  href,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonLinkProps): JSX.Element {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.link}
    />,
    <meta property={`${prefix}:button:${index}:action`} content="link" />,
    <meta property={`${prefix}:button:${index}:target`} content={href} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonMintProps = ButtonProps & {
  target: string
}

ButtonMint.__type = 'button'
export function ButtonMint({
  children,
  // @ts-ignore - private
  index = 1,
  target,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonMintProps): JSX.Element {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.mint}
    />,
    <meta property={`${prefix}:button:${index}:action`} content="mint" />,
    <meta property={`${prefix}:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonRedirectProps = ButtonProps & {
  location: string
}

ButtonRedirect.__type = 'button'
export function ButtonRedirect({
  children,
  // @ts-ignore - private
  index = 1,
  location,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonRedirectProps): JSX.Element {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-type="redirect"
      data-value={`${buttonPrefix.redirect}:${location}`}
    />,
    <meta
      property={`${prefix}:button:${index}:action`}
      content="post_redirect"
    />,
    // TODO: Add `target` prop so folks can `'post_redirect'` to a different frame
    // <meta property={`fc:frame:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonResetProps = ButtonProps

ButtonReset.__type = 'button'
export function ButtonReset({
  children,
  // @ts-ignore - private
  index = 1,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonResetProps): JSX.Element {
  return (
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.reset}
      data-type="reset"
    />
  )
}

export type ButtonTransactionProps = ButtonProps & {
  action?: string | undefined
  target: string
}

ButtonTransaction.__type = 'button'
export function ButtonTransaction({
  action,
  children,
  // @ts-ignore - private
  index = 1,
  target,
  // @ts-ignore - private
  prefix = 'fc:frame',
}: ButtonTransactionProps): JSX.Element {
  return [
    <meta
      property={`${prefix}:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.transaction}
    />,
    <meta property={`${prefix}:button:${index}:action`} content="tx" />,
    <meta property={`${prefix}:button:${index}:target`} content={target} />,
    action && (
      <meta property={`${prefix}:button:${index}:post_url`} content={action} />
    ),
  ] as unknown as HtmlEscapedString
}

export const Button = Object.assign(ButtonRoot, {
  AddCastAction: ButtonAddCastAction,
  Link: ButtonLink,
  Mint: ButtonMint,
  Redirect: ButtonRedirect,
  Reset: ButtonReset,
  Transaction: ButtonTransaction,
})

function normalizeChildren(children: string | string[]) {
  return Array.isArray(children) ? children.join('') : children
}
