import { fileTextIcon, imageIcon, stopwatchIcon } from './icons.js'

export function Metrics() {
  return (
    <div
      class="bg-background-100 border rounded-md flex flex-row divide-x"
      style={{ justifyContent: 'space-around', minHeight: '44.9px' }}
      x-data={`{
        get metrics() {
          return [
            { icon: '${stopwatchIcon}', name: 'speed', value: formatSpeed(data.metrics.speed) },
            { icon: '${fileTextIcon}', name: 'frame size', value: data.metrics.htmlSize ? formatFileSize(data.metrics.htmlSize) : '-' },
            { icon: '${imageIcon}', name: 'image size', value: data.metrics.imageSize ? formatFileSize(data.metrics.imageSize) : '-' },
          ]
        }
      }`}
    >
      <template x-for="metric in metrics">
        <div
          class="items-center flex font-mono gap-1.5 text-sm justify-center"
          style={{ flex: '1', padding: '0.685rem' }}
        >
          <span class="text-gray-700" x-html="metric.icon" />
          <div class="text-gray-1000" x-text="metric.value" />
        </div>
      </template>
    </div>
  )
}
