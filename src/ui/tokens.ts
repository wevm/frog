import type { Font } from '../types/frame.js'

export type Tokens = {
  colors?: Record<string, string> | undefined
  fonts?: Record<string, Font[]> | undefined
}

export const colors = {
  dark: {
    background: '#000000',
    'background/elevated': '#191A1C',
    fill: '#44474B',
    'fill/secondary': '#3E3F43',
    'fill/tertiary': '#2e2f30',
    'fill/quarternary': '#212224',
    invert: '#ffffff',
    text: '#ffffff',
    'text/secondary': '#C2C5CB',
    'text/quarternary': '#9A9BA1',
    'text/tertiary': '#78797E',
  },
  light: {
    background: '#F0F0F3',
    'background/elevated': '#ffffff',
    fill: '#D9DBDF',
    'fill/secondary': '#ececec',
    'fill/quarternary': '#E4E6EA',
    'fill/tertiary': '#f9f9f9',
    invert: '#000000',
    text: '#000000',
    'text/secondary': '#5B5C5F',
    'text/tertiary': '#848789',
    'text/quarternary': '#A3A4A8',
  },
} as const

export const defaultTokens = {
  colors: colors.dark,
} as const satisfies Tokens
export type DefaultTokens = typeof defaultTokens
