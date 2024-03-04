import { useState } from '../hooks/useState.js'
import { Data } from './Data.js'
import { Metrics } from './Metrics.js'
import { Navigator } from './Navigator.js'
import { Preview } from './Preview.js'
import { QuickLinks } from './QuickLinks.js'
import { Tabs } from './Tabs.js'
import { Timeline } from './Timeline.js'

export function App() {
  const state = useState()
  const url = 'body' in state.data ? state.data.body.url : state.data.url

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
        <Timeline
          dataMap={state.dataMap}
          logs={state.logs}
          logIndex={state.logIndex}
        />
        <QuickLinks url={url} />
      </aside>

      <main class="flex flex-col md:h-full w-full gap-4 order-0 md:order-1 overflow-hidden">
        <Navigator url={url} />

        <div class="flex flex-col lg:flex-row gap-4">
          <div class="flex flex-col gap-4">
            <Metrics />
            <Preview frame={state.frame} url={url} />
          </div>

          <Data data={state.data} frame={state.frame} />
        </div>

        <Tabs data={state.data} frame={state.frame} url={url} />
      </main>
    </div>
  )
}
