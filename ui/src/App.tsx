import { useEffect, useState } from 'react'
import { useStore } from 'zustand'

import { store } from './store'
import { client } from './hc'

import './App.css'
import viteLogo from './assets/vite.svg'
import reactLogo from './assets/react.svg'

export function App() {
  const [count, setCount] = useState(0)
  const bears = useStore(store, (state) => state.bears)
  const frames = useStore(store, (state) => state.frames)

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
    <>
      <div>bears: {bears}</div>

      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)} type="button">
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      {frames.map((frame) => (
        <span key={frame}>{frame}</span>
      ))}
    </>
  )
}
