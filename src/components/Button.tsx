import type { HtmlEscapedString } from 'hono/utils/html'

export const buttonPrefix = {
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
  /** Octoicon name. @see https://primer.style/foundations/icons */
  icon:
    | 'alert'
    | 'alert-fill'
    | 'archive'
    | 'arrow-both'
    | 'arrow-down'
    | 'arrow-down-left'
    | 'arrow-down-right'
    | 'arrow-left'
    | 'arrow-right'
    | 'arrow-switch'
    | 'arrow-up'
    | 'arrow-up-left'
    | 'arrow-up-right'
    | 'beaker'
    | 'bell'
    | 'bell-fill'
    | 'bell-slash'
    | 'blocked'
    | 'bold'
    | 'book'
    | 'bookmark'
    | 'bookmark-fill'
    | 'bookmark-slash'
    | 'bookmark-slash-fill'
    | 'briefcase'
    | 'broadcast'
    | 'browser'
    | 'bug'
    | 'calendar'
    | 'check'
    | 'check-circle'
    | 'check-circle-fill'
    | 'checkbox'
    | 'checklist'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'chevron-up'
    | 'circle'
    | 'circle-slash'
    | 'clock'
    | 'clock-fill'
    | 'cloud'
    | 'cloud-offline'
    | 'code'
    | 'code-of-conduct'
    | 'code-review'
    | 'code-square'
    | 'codescan'
    | 'codescan-checkmark'
    | 'codespaces'
    | 'columns'
    | 'command-palette'
    | 'comment'
    | 'comment-discussion'
    | 'commit'
    | 'container'
    | 'copilot'
    | 'copy'
    | 'cpu'
    | 'credit-card'
    | 'cross-reference'
    | 'dash'
    | 'database'
    | 'dependabot'
    | 'desktop-download'
    | 'device-camera-video'
    | 'device-desktop'
    | 'device-mobile'
    | 'devices'
    | 'diamond'
    | 'diff'
    | 'discussion-closed'
    | 'discussion-duplicate'
    | 'discussion-outdated'
    | 'dot'
    | 'dot-fill'
    | 'download'
    | 'duplicate'
    | 'eye'
    | 'eye-closed'
    | 'file'
    | 'file-binary'
    | 'file-code'
    | 'file-diff'
    | 'file-directory'
    | 'file-directory-fill'
    | 'file-directory-symlink'
    | 'file-media'
    | 'file-submodule'
    | 'file-symlink-file'
    | 'file-zip'
    | 'filter'
    | 'filter-remove'
    | 'flame'
    | 'fold'
    | 'fold-down'
    | 'fold-up'
    | 'gear'
    | 'gift'
    | 'git-branch'
    | 'git-commit'
    | 'git-compare'
    | 'git-merge'
    | 'git-merge-queue'
    | 'git-pull-request'
    | 'git-pull-request-closed'
    | 'git-pull-request-draft'
    | 'globe'
    | 'goal'
    | 'grabber'
    | 'graph'
    | 'hash'
    | 'heading'
    | 'heart'
    | 'heart-fill'
    | 'history'
    | 'home'
    | 'home-fill'
    | 'horizontal-rule'
    | 'hourglass'
    | 'hubot'
    | 'image'
    | 'inbox'
    | 'infinity'
    | 'info'
    | 'issue-closed'
    | 'issue-draft'
    | 'issue-opened'
    | 'issue-reopened'
    | 'issue-tracked-by'
    | 'issue-tracks'
    | 'italic'
    | 'iterations'
    | 'kebab-horizontal'
    | 'key'
    | 'law'
    | 'light-bulb'
    | 'link'
    | 'link-external'
    | 'list-ordered'
    | 'list-unordered'
    | 'location'
    | 'lock'
    | 'log'
    | 'mail'
    | 'megaphone'
    | 'mention'
    | 'milestone'
    | 'mirror'
    | 'moon'
    | 'mortar-board'
    | 'move-to-bottom'
    | 'move-to-end'
    | 'move-to-start'
    | 'move-to-top'
    | 'multi-select'
    | 'mute'
    | 'no-entry'
    | 'north-star'
    | 'note'
    | 'number'
    | 'organization'
    | 'package'
    | 'package-dependencies'
    | 'package-dependents'
    | 'paper-airplane'
    | 'paperclip'
    | 'passkey-fill'
    | 'paste'
    | 'pencil'
    | 'people'
    | 'person'
    | 'person-add'
    | 'person-fill'
    | 'pin'
    | 'pin-slash'
    | 'pivot-column'
    | 'play'
    | 'plug'
    | 'plus'
    | 'plus-circle'
    | 'project'
    | 'project-roadmap'
    | 'project-symlink'
    | 'project-template'
    | 'pulse'
    | 'question'
    | 'quote'
    | 'read'
    | 'rel-file-path'
    | 'reply'
    | 'repo'
    | 'repo-clone'
    | 'repo-forked'
    | 'repo-locked'
    | 'repo-pull'
    | 'repo-push'
    | 'repo-template'
    | 'report'
    | 'rocket'
    | 'rows'
    | 'rss'
    | 'ruby'
    | 'screen-full'
    | 'screen-normal'
    | 'search'
    | 'server'
    | 'share'
    | 'share-android'
    | 'shield'
    | 'shield-check'
    | 'shield-lock'
    | 'shield-slash'
    | 'shield-x'
    | 'sidebar-collapse'
    | 'sidebar-expand'
    | 'sign-in'
    | 'sign-out'
    | 'single-select'
    | 'skip'
    | 'skip-fill'
    | 'smiley'
    | 'sort-asc'
    | 'sort-desc'
    | 'sponsor-tiers'
    | 'square'
    | 'square-fill'
    | 'squirrel'
    | 'stack'
    | 'star'
    | 'star-fill'
    | 'stop'
    | 'stopwatch'
    | 'strikethrough'
    | 'sun'
    | 'sync'
    | 'tab'
    | 'table'
    | 'tag'
    | 'tasklist'
    | 'telescope'
    | 'telescope-fill'
    | 'terminal'
    | 'thumbsdown'
    | 'thumbsup'
    | 'tools'
    | 'tracked-by-closed-completed'
    | 'tracked-by-closed-not-planned'
    | 'trash'
    | 'triangle-down'
    | 'triangle-left'
    | 'triangle-right'
    | 'triangle-up'
    | 'trophy'
    | 'typography'
    | 'unfold'
    | 'unlink'
    | 'unlock'
    | 'unmute'
    | 'unread'
    | 'unverified'
    | 'upload'
    | 'verified'
    | 'versions'
    | 'video'
    | 'workflow'
    | 'x'
    | 'x-circle'
    | 'x-circle-fill'
    | 'zap'
    | 'zoom-in'
    | 'zoom-out'
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
      // Currently only warpcast supports cast actions but this might support other clients too.
      href={`https://warpcast.com/~/install-cast-action?url=${url}&name=${name}&action=post&icon=${icon}`}
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
  children,
  // @ts-ignore - private
  index = 1,
  href,
}: ButtonLinkProps) {
  return [
    <meta
      property={`fc:frame:button:${index}`}
      content={normalizeChildren(children)}
      data-value={buttonPrefix.link}
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
