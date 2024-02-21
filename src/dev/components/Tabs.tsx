export function Tabs() {
  return (
    <div>
      <div class="border rounded-md bg-background-100 h-full overflow-hidden">
        <div
          class="bg-background-200 border flex flex-row gap-6 text-sm px-4"
          style={{ borderLeft: '0', borderRight: '0', borderTop: '0' }}
        >
          <button type="button" class="bg-transparent py-3 text-gray-700">
            Request
          </button>
          <button
            type="button"
            class="bg-transparent py-3 border-gray-1000"
            style={{
              borderBottomWidth: '2px',
              marginBottom: '-1px',
            }}
          >
            Context
          </button>
          <button type="button" class="bg-transparent py-3 text-gray-700">
            Meta Tags
          </button>
        </div>

        <div class="p-4 text-sm" x-html="data.tools.contextHtml" />
      </div>
    </div>
  )
}
