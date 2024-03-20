import {
  type FormEventHandler,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { ArrowRightIcon } from '@radix-ui/react-icons'

import { handleSelectNewFrame } from '../utils/actions'

export function StartForm() {
  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const url = data.get('url') as string
      try {
        await handleSelectNewFrame(url)
      } catch (error) {
        // TODO: Handle error
      }
    },
    [],
  )

  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="w-full space-y-6">
      <form
        className="bg-background-100 border flex rounded-md w-full overflow-hidden items-center focus-within:ring-2 ring-blue-900 h-12"
        onSubmit={handleSubmit}
      >
        <input
          name="url"
          ref={inputRef}
          className="bg-transparent font-sans text-gray-1000 text pl-4 pr-2 w-full h-full"
          data-1p-ignore
          placeholder="Enter frame address"
          required
          style={{
            boxShadow: 'none',
            lineHeight: '1.9rem',
          }}
          type="url"
        />

        <button
          type="submit"
          className="bg-background-100 flex items-center justify-center text-gray-700 px-4 h-full hover:bg-gray-100 focus-visible:bg-gray-100"
          style={{ boxShadow: 'none' }}
        >
          <span className="sr-only">Go</span>
          <ArrowRightIcon height="18" width="18" />
        </button>
      </form>

      <div className="flex gap-6 items-center justify-center font-medium text-sm text-gray-700">
        <a href="?url=https://frame.frog.fm/api">frame.frog.fm</a>

        <a href="https://frog.fm" target="_blank" rel="noreferrer">
          Frog Documentation
        </a>

        <a href="https://github.com/wevm/frog" target="_blank" rel="noreferrer">
          GitHub Repo
        </a>
      </div>
    </div>
  )
}
