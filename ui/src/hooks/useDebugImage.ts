import { useQuery } from '@tanstack/react-query'

import { client } from '../lib/api'
import { store } from '../lib/store'
import { useDataKey, useFrameUrl } from './useStore'

export function useDebugImage() {
  const dataKey = useDataKey()
  const frameUrl = useFrameUrl()

  const { data: imageData } = useQuery({
    enabled: dataKey !== undefined,
    queryKey: ['debug-image', { dataKey, frameUrl }] as const,
    async queryFn(options) {
      const params = options.queryKey[1]
      if (!params.dataKey) return null
      if (!params.frameUrl) return null

      const url = encodeURIComponent(params.frameUrl)
      const data = store.getState().dataMap[params.dataKey]
      const text = await client.debug.image[':url']
        .$post({
          param: { url },
          json: 'body' in data ? data.body : {},
        })
        .then((res) => res.text())

      return text
    },
  })

  return imageData
}
