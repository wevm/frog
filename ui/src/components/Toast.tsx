import { CheckIcon, Cross1Icon, Cross2Icon } from '@radix-ui/react-icons'
import { type State, store } from '../lib/store'
import { Spinner } from './Spinner.js'

type ToastProps = NonNullable<State['notification']>

export function Toast(props: ToastProps) {
  const { action, dismissable, title, type } = props
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex items-center justify-between rounded-lg border border-gray-alpha-100 bg-background-100 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="mt-0.5">
          {type === 'error' && <Cross1Icon className="text-red-900" />}
          {type === 'loading' && <Spinner size="small" />}
          {type === 'success' && <CheckIcon className="text-green-900" />}
        </div>
        <div className="font-medium text-gray-1000 text-sm">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        {dismissable && (
          <button
            type="button"
            className="flex items-center justify-center rounded-full bg-transparent text-gray-400 hover:text-gray-700"
            onClick={() =>
              store.setState((state) => ({ ...state, notification: null }))
            }
          >
            <div className="sr-only">close</div>
            <Cross2Icon />
          </button>
        )}

        {action && (
          <button
            className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-1000 text-xs hover:bg-gray-200"
            type="submit"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
