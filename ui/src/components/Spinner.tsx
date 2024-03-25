import { clsx } from 'clsx'

type SpinnerProps = {
  accessibilityLabel?: string
  size?: 'small' | 'medium'
}

export function Spinner(props: SpinnerProps) {
  const { accessibilityLabel, size = 'medium' } = props
  return (
    <div
      className={clsx([
        'animate-spin stroke-2 stroke-gray-900',
        size === 'small' && 'size-4',
        size === 'medium' && 'size-6',
      ])}
    >
      {accessibilityLabel && (
        <div className="sr-only">{accessibilityLabel}</div>
      )}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          fill="none"
          r="10"
          strokeDasharray="42"
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="12"
          fill="none"
          opacity="0.25"
          r="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
