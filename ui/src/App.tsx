import { Data } from './components/Data'
import { Metrics } from './components/Metrics'
import { Navigator } from './components/Navigator'
import { Preview } from './components/Preview'
import { QuickLinks } from './components/QuickLinks'
import { StartForm } from './components/StartForm'
import { Tabs } from './components/Tabs'
import { Timeline } from './components/Timeline'
import { useData, useFrame, useFrameUrl, useStore } from './hooks/useStore'

export function App() {
  const data = useData()
  const frame = useFrame()
  const frameUrl = useFrameUrl()
  const frameUrls = useStore((state) => state.frameUrls)

  if (!data || !frame || !frameUrl)
    return (
      <div
        className="mx-auto flex flex-col items-center gap-4 p-4 pt-32 md:gap-6"
        style={{ maxWidth: '40rem' }}
      >
        <StartForm />
      </div>
    )

  return (
    <div
      className="container mx-auto flex h-auto flex-col gap-4 p-4 md:container md:grid md:gap-6 md:p-6"
      style={{
        maxWidth: '1512px',
      }}
    >
      <aside
        className="order-1 w-full space-y-4 md:min-w-sidebar md:max-w-sidebar lg:min-w-sidebar lg:max-w-sidebar"
        style={{
          position: 'sticky',
          top: '1.5rem',
          alignSelf: 'start',
        }}
      >
        <Timeline />
        <QuickLinks url={frameUrl} />
      </aside>

      <main className="order-0 flex w-full flex-col gap-4 overflow-hidden md:order-1 md:h-full">
        <Navigator frameUrls={frameUrls} url={frameUrl} />

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-col gap-4">
            <Metrics />
            <Preview frame={frame} url={frameUrl} />
          </div>

          <Data data={data} frame={frame} />
        </div>

        <Tabs data={data} frame={frame} />
      </main>
    </div>
  )
}
