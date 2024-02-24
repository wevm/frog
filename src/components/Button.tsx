import type { HtmlEscapedString } from 'hono/utils/html'

export type ButtonProps = {
  children: string
  index?: number | undefined
}

export type ButtonRootProps = ButtonProps & {
  target?: string | undefined
  value?: string | undefined
}

ButtonRoot.__type = 'button'
export function ButtonRoot({
  children,
  index = 1,
  target,
  value,
}: ButtonRootProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      {...(value ? { 'data-value': value } : {})}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="post" />,
    target && (
      <meta property={`fc:frame:button:${index}:target`} content={target} />
    ),
  ] as unknown as HtmlEscapedString
}

export type ButtonLinkProps = ButtonProps & {
  href: string
}

ButtonLink.__type = 'button'
export function ButtonLink({ children, index = 1, href }: ButtonLinkProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-value="_l"
    />,
    <meta property={`fc:frame:button:${index}:action`} content="link" />,
    <meta property={`fc:frame:button:${index}:target`} content={href} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonMintProps = ButtonProps & {
  target: string
}

ButtonMint.__type = 'button'
export function ButtonMint({ children, index = 1, target }: ButtonMintProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-value="_m"
    />,
    <meta property={`fc:frame:button:${index}:action`} content="mint" />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonRedirectProps = ButtonProps & {
  location: string
  target?: string | undefined
}

ButtonRedirect.__type = 'button'
export function ButtonRedirect({
  children,
  index = 1,
  location,
  target,
}: ButtonRedirectProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-type="redirect"
      data-value={`_r:${location}`}
    />,
    <meta
      property={`fc:frame:button:${index}:action`}
      content="post_redirect"
    />,
    target && (
      <meta property={`fc:frame:button:${index}:target`} content={target} />
    ),
  ] as unknown as HtmlEscapedString
}

export type ButtonResetProps = ButtonProps

ButtonReset.__type = 'button'
export function ButtonReset({ children, index = 1 }: ButtonResetProps) {
  return (
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-value="_c"
      data-type="reset"
    />
  )
}

export const Button = Object.assign(ButtonRoot, {
  Link: ButtonLink,
  Mint: ButtonMint,
  Redirect: ButtonRedirect,
  Reset: ButtonReset,
})
