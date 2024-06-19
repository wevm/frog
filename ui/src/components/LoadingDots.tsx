const className = 'inline-block bg-gray-900 size-1 rounded-full'

export function LoadingDots() {
  return (
    <span className="loading-dots_loading inline-flex h-1 items-center space-x-0.5">
      <span className={className} />
      <span className={className} />
      <span className={className} />
    </span>
  )
}
