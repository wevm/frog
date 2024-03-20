import { FileTextIcon, ImageIcon, StopwatchIcon } from '@radix-ui/react-icons'
import { useData } from '../hooks/useStore.js'
import { formatFileSize, formatSpeed } from '../utils/format.js'

export function Metrics() {
  const data = useData()
  const metrics = [
    {
      icon: <StopwatchIcon className="text-gray-600" />,
      name: 'speed',
      value: data ? formatSpeed(data.metrics.speed) : '-',
    },
    {
      icon: <FileTextIcon className="text-gray-600" />,
      name: 'frame size',
      value:
        data && 'htmlSize' in data.metrics
          ? formatFileSize(data.metrics.htmlSize)
          : '-',
    },
    {
      icon: <ImageIcon className="text-gray-600" />,
      name: 'image size',
      value:
        data && 'imageSize' in data.metrics
          ? formatFileSize(data.metrics.imageSize)
          : '-',
    },
  ]

  return (
    <div
      className="bg-background-100 border rounded-md flex flex-row divide-x"
      style={{ justifyContent: 'space-around', minHeight: '44.9px' }}
    >
      {metrics.map((metric) => (
        <div
          className="items-center flex font-mono gap-1.5 text-sm justify-center"
          style={{ flex: '1', padding: '0.685rem' }}
        >
          {metric.icon}
          <div className="text-gray-1000">{metric.value}</div>
        </div>
      ))}
    </div>
  )
}
