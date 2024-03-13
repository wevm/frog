import { useEffect, useState } from 'react'
import { useStore } from 'zustand'

import { client } from './lib/api'
import { store } from './lib/store'

import './App.css'

export function App() {
  const [count, setCount] = useState(0)
  const frames = useStore(store, (state) => state.frames)
  const refreshCount = useStore(store, (state) => state.refreshCount)

  useEffect(() => {
    client.frames
      .$get()
      .then((res) => res.json())
      .then((frames) => {
        console.log('frames', frames)
        store.setState((state) => ({ ...state, frames }))
      })
      .catch((err) => {
        console.error('error fetching frames', err)
      })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <button onClick={() => setCount((count) => count - 1)} type="button">
          -
        </button>
        {count}
        <button onClick={() => setCount((count) => count + 1)} type="button">
          +
        </button>
      </div>

      <div>
        frames
        <ul>
          {frames.map((frame) => (
            <li key={frame}>{frame} </li>
          ))}
        </ul>
      </div>

      <div>refreshCount: {refreshCount}</div>
    </div>
  )
}
