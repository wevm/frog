import { useState } from '../hooks/useState.js'
import { formatFileSize, formatSpeed } from '../utils/format.js'
import { fileTextIcon, imageIcon, stopwatchIcon } from './icons.js'

export function Metrics() {
  const { data } = useState()
  const metrics = [
    {
      icon: stopwatchIcon,
      name: 'speed',
      value: formatSpeed(data.metrics.speed),
    },
    {
      icon: fileTextIcon,
      name: 'frame size',
      value:
        'htmlSize' in data.metrics
          ? formatFileSize(data.metrics.htmlSize)
          : '-',
    },
    {
      icon: imageIcon,
      name: 'image size',
      value:
        'imageSize' in data.metrics
          ? formatFileSize(data.metrics.imageSize)
          : '-',
    },
  ]

  return (
    <div
      class="bg-background-100 border rounded-md flex flex-row divide-x"
      style={{ justifyContent: 'space-around', minHeight: '44.9px' }}
    >
      {metrics.map((metric) => (
        <div
          class="items-center flex font-mono gap-1.5 text-sm justify-center"
          style={{ flex: '1', padding: '0.685rem' }}
        >
          <span class="text-gray-600">{metric.icon}</span>
          <div class="text-gray-1000">{metric.value}</div>
        </div>
      ))}
    </div>
  )
}
