import type { HtmlEscapedString } from 'hono/utils/html'
import type { Octicon } from '../types/octicon.js'

export const buttonPrefix = {
  installAction: '_i',
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
  value,
}: ButtonRootProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      {...(value ? { 'data-value': value } : {})}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="post" />,
    action && (
      <meta property={`fc:frame:button:${index}:target`} content={action} />
    ),
  ] as unknown as HtmlEscapedString
}

export type ButtonInstallActionProps = ButtonProps & {
  /** URL of the action. */
  url: string
  /** Name of the action. 30 characters maximum */
  name: string
  /** Octicon name. @see https://primer.style/foundations/icons */
  icon: Octicon
}

ButtonInstallAction.__type = 'button'
export function ButtonInstallAction({
  children,
  name,
  icon,
  url,
}: ButtonInstallActionProps) {
  return (
    <ButtonLink
      // @ts-ignore - private
      dataValue={buttonPrefix.installAction}
      // Currently only warpcast supports cast actions but this component might support other clients too.
      href={`https://warpcast.com/~/add-cast-action?postUrl=${url}&name=${name}&action=post&icon=${icon}`}
    >
      {children}
    </ButtonLink>
  )
}

export type ButtonLinkProps = ButtonProps & {
  href: string
}

ButtonLink.__type = 'button'
export function ButtonLink({
  // @ts-ignore - private
  dataValue = buttonPrefix.link,
  children,
  // @ts-ignore - private
  index = 1,
  href,
}: ButtonLinkProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      data-value={dataValue}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="link" />,
    <meta property={`fc:frame:button:${index}:target`} content={href} />,
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
}: ButtonMintProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.mint}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="mint" />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
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
}: ButtonRedirectProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      data-type="redirect"
      data-value={`${buttonPrefix.redirect}:${location}`}
    />,
    <meta
      property={`fc:frame:button:${index}:action`}
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
}: ButtonResetProps) {
  return (
    <meta
      property={`fc:frame:button:${index}`}
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
}: ButtonTransactionProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.transaction}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="tx" />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
    action && (
      <meta property={`fc:frame:button:${index}:post_url`} content={action} />
    ),
  ] as unknown as HtmlEscapedString
}

export const Button = Object.assign(ButtonRoot, {
  InstallAction: ButtonInstallAction,
  Link: ButtonLink,
  Mint: ButtonMint,
  Redirect: ButtonRedirect,
  Reset: ButtonReset,
  Transaction: ButtonTransaction,
})

function normalizeChildren(children: string | string[]) {
  return Array.isArray(children) ? children.join('') : children
}
