import { ArrowRightIcon } from '@radix-ui/react-icons'
import {
  type FormEventHandler,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'

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
        className="flex h-12 w-full items-center overflow-hidden rounded-md border bg-background-100 ring-blue-900 focus-within:ring-2"
        onSubmit={handleSubmit}
      >
        <input
          autoComplete="off"
          name="url"
          ref={inputRef}
          className="text h-full w-full bg-transparent pr-2 pl-4 font-sans text-gray-1000"
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
          className="flex h-full items-center justify-center bg-background-100 px-4 text-gray-700 hover:bg-gray-100 focus-visible:bg-gray-100"
          style={{ boxShadow: 'none' }}
        >
          <span className="sr-only">Go</span>
          <ArrowRightIcon height="18" width="18" />
        </button>
      </form>

      <div className="flex items-center justify-center gap-6 font-medium text-gray-700 text-sm">
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
