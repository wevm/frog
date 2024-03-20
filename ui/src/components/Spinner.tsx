type SpinnerProps = {
  accessibilityLabel?: string
}

export function Spinner(props: SpinnerProps) {
  const { accessibilityLabel } = props
  return (
    <div className="animate-spin h-6 w-6 stroke-2 stroke-gray-900">
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
