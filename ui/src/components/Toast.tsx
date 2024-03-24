import { CheckIcon, Cross1Icon, Cross2Icon } from '@radix-ui/react-icons'
import { State, store } from '../lib/store'
import { Spinner } from './Spinner.js'

type ToastProps = NonNullable<State['notification']>

export function Toast(props: ToastProps) {
  const { action, dismissable, title, type } = props
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background-100 rounded-lg border border-gray-alpha-100 px-4 py-3 flex justify-between items-center relative"
    >
      <div className="flex gap-3 items-center">
        <div className="mt-0.5">
          {type === 'error' && <Cross1Icon className="text-red-900" />}
          {type === 'loading' && <Spinner size="small" />}
          {type === 'success' && <CheckIcon className="text-green-900" />}
        </div>
        <div className="text-sm font-medium text-gray-1000">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        {dismissable && (
          <button
            type="button"
            className="bg-transparent text-gray-400 rounded-full flex items-center justify-center hover:text-gray-700"
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
            className="text-xs bg-gray-100 hover:bg-gray-200 font-medium text-gray-1000 px-2 py-1 rounded-md"
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
