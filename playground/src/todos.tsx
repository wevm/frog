import { Button, Frog, TextInput } from 'Frog'

export const app = new Frog<{
  index: number
  todos: { completed: boolean; name: string }[]
}>({
  hubApiUrl: 'https://api.hub.wevm.dev',
  initialState: {
    index: -1,
    todos: [],
  },
  verify: 'silent',
})

app.frame('/', (c) => {
  const { buttonValue, deriveState, inputText } = c

  const { index, todos } = deriveState((state) => {
    if (inputText) {
      state.todos.push({ completed: false, name: inputText })
    }
    if (buttonValue === 'up')
      state.index =
        state.index - 1 < 0 ? state.todos.length - 1 : state.index - 1
    if (buttonValue === 'down')
      state.index =
        state.index + 1 > state.todos.length - 1 ? 0 : state.index + 1
    if (buttonValue === 'completed')
      state.todos[state.index].completed = !state.todos[state.index].completed
  })

  return c.res({
    image: (
      <div tw="flex flex-col w-full h-full p-10 bg-black">
        <div tw="text-white text-6xl">TODO List</div>
        {todos.map((todo, i) => (
          <div tw="text-white flex text-4xl mt-5">
            {todo.completed ? '✅' : '◻️'} {todo.name} {i === index ? '👈' : ''}
          </div>
        ))}
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter a TODO" />,
      <Button>Add</Button>,
      <Button value="down">⬇️</Button>,
      <Button value="up">⬆️</Button>,
      <Button value="completed">{todos[index]?.completed ? '◻️' : '✅'}</Button>,
    ],
  })
})

app.frame('/foo', (c) => {
  return c.res({
    image: (
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        hello world
      </div>
    ),
    intents: [<Button>foo</Button>, <Button>bar</Button>, <Button>baz</Button>],
  })
})
