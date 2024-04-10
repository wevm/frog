import { loadGoogleFont } from 'hono-og'
import type { Font } from '../types/frame.js'

export async function parseFonts(fonts: Font[] | undefined) {
  if (!fonts) return undefined
  return await Promise.all(
    fonts.map(async (font) => {
      if (font.source === 'google')
        return {
          ...font,
          data: await loadGoogleFont({
            family: font.name,
            weight: font.weight,
            style: font.style,
          }),
        }
      return font
    }),
  )
}
