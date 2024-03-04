import { useStore } from '../hooks/useStore.js'
import { Preview } from './Preview.js'
import { QuickLinks } from './QuickLinks.js'
import { Timeline } from './Timeline.js'

export function App() {
  const store = useStore()

  const { data, dataMap, frame, logs, logIndex } = store
  const url = 'body' in data ? data.body.url : data.url

  return (
    <div
      class="flex flex-col container md:grid md:container gap-4 md:gap-6"
      style={{
        maxWidth: '1512px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <aside
        class="order-1 space-y-4 md:min-w-sidebar md:max-w-sidebar lg:min-w-sidebar lg:max-w-sidebar w-full"
        style={{
          position: 'sticky',
          top: '1.5rem',
          alignSelf: 'start',
        }}
      >
        <Timeline dataMap={dataMap} logs={logs} logIndex={logIndex} />
        <QuickLinks url={url} />
      </aside>

      <main class="flex flex-col md:h-full w-full gap-4 order-0 md:order-1 overflow-hidden">
        <Preview frame={frame} url={url} />
      </main>
    </div>
  )
}
