import { checkCircledIcon, crossCircledIcon } from './icons.js'

export function Data() {
  return (
    <div
      role="grid"
      aria-colcount="16"
      class="bg-background-100 border rounded-md overflow-hidden"
      style={{ height: 'min-content' }}
    >
      <div class="sr-only" role="rowgroup">
        <div role="row">
          <span role="columnheader" aria-colindex="1">
            Property
          </span>
          <span role="columnheader" aria-colindex="2">
            Value
          </span>
          <span role="columnheader" aria-colindex="3">
            Status
          </span>
        </div>
      </div>

      <div role="rowgroup" class="overflow-hidden divide-y">
        <template x-for="(row, index) in data.frame.debug.validations">
          <div role="row" class="flex flex-col">
            <div
              class="items-center flex flex-row"
              style={{ fontSize: '0.8125rem' }}
            >
              <div
                class="text-gray-700 p-3 font-medium"
                x-text="row.property"
                style={{ minWidth: '10rem' }}
                role="gridcell"
                aria-colindex="1"
              />
              <button
                role="gridcell"
                aria-colindex="2"
                class="bg-transparent text-gray-1000 p-3 text-ellipsis overflow-hidden whitespace-nowrap"
                x-data="{ copied: false }"
                x-text="copied ? 'Copied!' : row.value"
                x-on:click="
                  if (copied) return
                  navigator.clipboard.writeText(row.value)
                  copied = true
                  setTimeout(() => copied = false, 1_000)
                "
              />
              <div
                role="gridcell"
                aria-colindex="3"
                class="flex p-3"
                style={{
                  justifyContent: 'flex-end',
                  flex: '1',
                  marginBottom: '2px',
                }}
              >
                <span class="sr-only" x-text="row.status" />
                <template x-if="row.status === 'valid'">
                  <span class="text-green-900">{checkCircledIcon}</span>
                </template>
                <template x-if="row.status === 'invalid'">
                  <span class="text-red-900">{crossCircledIcon}</span>
                </template>
              </div>
            </div>

            <template x-if="row.status === 'invalid' && row.message">
              <div class="p-3" style={{ paddingTop: '0' }}>
                <div class="border border-red-100 text-red-900 text-xs rounded-lg p-3">
                  <span x-html="row.message" />
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  )
}
