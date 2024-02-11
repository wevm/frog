/** @jsx jsx */
/** @jsxImportSource hono/jsx */
/** @jsxFrag */

import { Button, Farc, TextInput } from 'farc'

type State = {
  index: number
  todos: { completed: boolean; name: string }[]
}

export const app = new Farc<State>({
  initialState: {
    index: -1,
    todos: [],
  },
  route: '/todos',
})

app.frame('/', ({ buttonValue, deriveState, inputText }) => {
  const { index, todos } = deriveState((state) => {
    if (inputText) state.todos.push({ completed: false, name: inputText })
    if (buttonValue === 'up') state.index = Math.max(0, state.index - 1)
    if (buttonValue === 'down')
      state.index = Math.min(state.todos.length - 1, state.index + 1)
    if (buttonValue === 'completed')
      state.todos[state.index].completed = !state.todos[state.index].completed
  })

  return {
    image: (
      <div
        style={{
          backgroundColor: 'black',
          display: 'flex',
          flexDirection: 'column',
          padding: 40,
          width: '100%',
          height: '100%',
        }}
      >
        <div style={{ color: 'white', fontSize: 60 }}>TODO List</div>
        {todos.map((todo, i) => (
          <div
            style={{
              color: 'white',
              display: 'flex',
              fontSize: 40,
              marginTop: 20,
              textDecoration: 'none',
            }}
          >
            {todo.completed ? '✅' : '◻️'} {todo.name} {i === index ? '👈' : ''}
          </div>
        ))}
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter a TODO..." />,
      <Button>Add</Button>,
      <Button value="down">⬇️</Button>,
      <Button value="up">⬆️</Button>,
      <Button value="completed">{todos[index]?.completed ? '◻️' : '✅'}</Button>,
    ],
  }
})
