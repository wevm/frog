const className = 'inline-block bg-gray-900 size-1 rounded-full'

export function LoadingDots() {
  return (
    <span className="inline-flex items-center h-1 space-x-0.5 loading-dots_loading">
      <span className={className} />
      <span className={className} />
      <span className={className} />
    </span>
  )
}
