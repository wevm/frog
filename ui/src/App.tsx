import { useState } from 'react'

import { useFrame } from './hooks/useFrame'

export function App() {
  const frame = useFrame()
  const [count, setCount] = useState(0)

  return (
    <div>
      <div flex="" bg-red>
        <button onClick={() => setCount((count) => count - 1)} type="button">
          -
        </button>
        {count}
        <button onClick={() => setCount((count) => count + 1)} type="button">
          +
        </button>
      </div>

      {JSON.stringify(frame)}
    </div>
  )
}
