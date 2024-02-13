import type { HtmlEscapedString } from 'hono/utils/html'

export type ButtonProps = {
  children: string
  index?: number | undefined
}

export type ButtonRootProps = ButtonProps & {
  action?: 'post' | 'post_redirect'
  target?: string | undefined
  value?: string | undefined
}

ButtonRoot.__type = 'button'
export function ButtonRoot({
  action = 'post',
  children,
  index = 0,
  target,
  value,
}: ButtonRootProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-type={action === 'post_redirect' ? 'redirect' : undefined}
      data-value={value}
    />,
    <meta property={`fc:frame:button:${index}:action`} content={action} />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonLinkProps = ButtonProps & {
  href: string
}

ButtonLink.__type = 'button'
export function ButtonLink({ children, index = 0, href }: ButtonLinkProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-href={href}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="link" />,
    <meta property={`fc:frame:button:${index}:target`} content={href} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonMintProps = ButtonProps & {
  target: string
}

ButtonMint.__type = 'button'
export function ButtonMint({ children, index = 0, target }: ButtonMintProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-target={target}
    />,
    <meta property={`fc:frame:button:${index}:action`} content="mint" />,
    <meta property={`fc:frame:button:${index}:target`} content={target} />,
  ] as unknown as HtmlEscapedString
}

export type ButtonResetProps = ButtonProps

ButtonReset.__type = 'button'
export function ButtonReset({ children, index = 0 }: ButtonResetProps) {
  return (
    <meta
      property={`fc:frame:button:${index}`}
      content={children}
      data-type="reset"
    />
  )
}

export const Button = Object.assign(ButtonRoot, {
  Link: ButtonLink,
  Mint: ButtonMint,
  Reset: ButtonReset,
})
