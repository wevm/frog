import { Data } from './components/Data'
import { Metrics } from './components/Metrics'
import { Navigator } from './components/Navigator'
import { Preview } from './components/Preview'
import { QuickLinks } from './components/QuickLinks'
import { StartForm } from './components/StartForm'
import { Tabs } from './components/Tabs'
import { Timeline } from './components/Timeline'
import { useData, useFrame, useStore, useFrameUrl } from './hooks/useStore'

export function App() {
  const data = useData()
  const frame = useFrame()
  const frameUrl = useFrameUrl()
  const frameUrls = useStore((state) => state.frameUrls)

  if (!data || !frame || !frameUrl)
    return (
      <div
        className="flex flex-col items-center gap-4 md:gap-6 p-4 pt-32 mx-auto"
        style={{ maxWidth: '40rem' }}
      >
        <StartForm />
      </div>
    )

  return (
    <div
      className="flex flex-col container md:grid md:container gap-4 md:gap-6 mx-auto"
      style={{
        maxWidth: '1512px',
      }}
    >
      <aside
        className="order-1 space-y-4 md:min-w-sidebar md:max-w-sidebar lg:min-w-sidebar lg:max-w-sidebar w-full"
        style={{
          position: 'sticky',
          top: '1.5rem',
          alignSelf: 'start',
        }}
      >
        <Timeline />
        <QuickLinks url={frameUrl} />
      </aside>

      <main className="flex flex-col md:h-full w-full gap-4 order-0 md:order-1 overflow-hidden">
        <Navigator frameUrls={frameUrls} url={frameUrl} />

        <div className="flex flex-col lg:flex-row gap-4">
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
