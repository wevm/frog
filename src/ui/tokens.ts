import type { Font } from '../types/frame.js'

export type Tokens = {
  colors?: Record<string, string> | undefined
  fonts?: Record<string, Font[]> | undefined
}

export const colors = {
  dark: {
    background: '#000000',
    background100: '#000000',
    background200: '#191A1C',
    invert: '#ffffff',
    text: '#ffffff',
    text100: '#ffffff',
    text200: '#C2C5CB',
    text300: '#9A9BA1',
    text400: '#78797E',
    gray100: '#1a1a1a',
    gray200: '#1f1f1f',
    gray300: '#292929',
    gray400: '#2e2e2e',
    gray500: '#454545',
    gray: '#878787',
    gray600: '#878787',
    gray700: '#8f8f8f',
    gray800: '#7d7d7d',
    gray900: '#a1a1a1',
    gray1000: '#ededed',
    blue100: '#06193a',
    blue200: '#06193a',
    blue300: '#012f61',
    blue400: '#003674',
    blue500: '#00418c',
    blue: '#008fff',
    blue600: '#008fff',
    blue700: '#006ffe',
    blue800: '#005be7',
    blue900: '#47a8ff',
    blue1000: '#ebf6ff',
    red100: '#330a10',
    red200: '#440c13',
    red300: '#5d0e18',
    red400: '#6e101c',
    red500: '#871620',
    red: '#f22e41',
    red600: '#f22e41',
    red700: '#f13342',
    red800: '#e2162a',
    red900: '#ff575e',
    red1000: '#ffe9ed',
    amber100: '#2a1700',
    amber200: '#361a00',
    amber300: '#502800',
    amber400: '#5b3000',
    amber500: '#703f00',
    amber: '#ed9a00',
    amber600: '#ed9a00',
    amber700: '#ffae00',
    amber800: '#ff9300',
    amber900: '#ff9300',
    amber1000: '#fff2d5',
    green100: '#002608',
    green200: '#00320b',
    green300: '#00390e',
    green400: '#004614',
    green500: '#006717',
    green: '#00952d',
    green600: '#00952d',
    green700: '#00ac3a',
    green800: '#009431',
    green900: '#00ca51',
    green1000: '#d8ffe4',
    teal100: '#00231b',
    teal200: '#002b22',
    teal300: '#003d34',
    teal400: '#004036',
    teal500: '#006354',
    teal: '#009e86',
    teal600: '#009e86',
    teal700: '#00aa96',
    teal800: '#00927f',
    teal900: '#00cfb7',
    teal1000: '#cbfff5',
    purple100: '#2a0c33',
    purple200: '#331141',
    purple300: '#48185e',
    purple400: '#551a76',
    purple500: '#642290',
    purple: '#9340d5',
    purple600: '#9340d5',
    purple700: '#9340d5',
    purple800: '#7e2bbb',
    purple900: '#c372fc',
    purple1000: '#faedff',
    pink100: '#310d1d',
    pink200: '#420d26',
    pink300: '#561033',
    pink400: '#5d0d35',
    pink500: '#75073f',
    pink: '#ba0056',
    pink600: '#ba0056',
    pink700: '#f12b82',
    pink800: '#e7006d',
    pink900: '#ff4c8d',
    pink1000: '#ffe8f4',
  },
  light: {
    background: '#F0F0F3',
    background100: '#F0F0F3',
    background200: '#ffffff',
    invert: '#000000',
    text: '#000000',
    text100: '#000000',
    text200: '#5B5C5F',
    text300: '#848789',
    text400: '#A3A4A8',
    gray100: '#f2f2f2',
    gray200: '#ebebeb',
    gray300: '#e6e5e5',
    gray400: '#ebebeb',
    gray500: '#c9c9c9',
    gray: '#a8a8a8',
    gray600: '#a8a8a8',
    gray700: '#8f8f8f',
    gray800: '#7d7d7d',
    gray900: '#666666',
    gray1000: '#171717',
    blue100: '#f0f7ff',
    blue200: '#e9f4ff',
    blue300: '#dff0ff',
    blue400: '#cbe7ff',
    blue500: '#cbe7ff',
    blue: '#49aeff',
    blue600: '#49aeff',
    blue700: '#006bff',
    blue800: '#0059ed',
    blue900: '#0060f2',
    blue1000: '#002358',
    red100: '#ffedef',
    red200: '#ffe8ea',
    red300: '#ffe3e5',
    red400: '#ffd7d6',
    red500: '#ffb1b3',
    red: '#ff676c',
    red600: '#ff676c',
    red700: '#fc0036',
    red800: '#ea001d',
    red900: '#d8001b',
    red1000: '#47000c',
    amber100: '#fff6df',
    amber200: '#fff4cf',
    amber300: '#fff0c2',
    amber400: '#ffdc73',
    amber500: '#ffc542',
    amber: '#ffa700',
    amber600: '#ffa700',
    amber700: '#ffae00',
    amber800: '#ff9300',
    amber900: '#aa4d00',
    amber1000: '#561a00',
    green100: '#ecfdec',
    green200: '#e6fce6',
    green300: '#d2fad2',
    green400: '#b9f5bc',
    green500: '#82ec8d',
    green: '#4be15d',
    green600: '#4be15d',
    green700: '#28a948',
    green800: '#269141',
    green900: '#0f7e32',
    green1000: '#003900',
    teal100: '#ddfffb',
    teal200: '#ddfef6',
    teal300: '#ccf9f1',
    teal400: '#b1f7ec',
    teal500: '#51f0db',
    teal: '#00e4c4',
    teal600: '#00e4c4',
    teal700: '#00ac96',
    teal800: '#00927f',
    teal900: '#007f70',
    teal1000: '#003f35',
    purple100: '#faf0ff',
    purple200: '#f8f1ff',
    purple300: '#f5e8ff',
    purple400: '#f2d9ff',
    purple500: '#dfa7ff',
    purple: '#c979ff',
    purple600: '#c979ff',
    purple700: '#a000f8',
    purple800: '#8500d1',
    purple900: '#7d00cc',
    purple1000: '#2f004e',
    pink100: '#ffe8f7',
    pink200: '#ffe8f2',
    pink300: '#ffdfeb',
    pink400: '#ffd2e0',
    pink500: '#fdb3cc',
    pink: '#f97ea8',
    pink600: '#f97ea8',
    pink700: '#f32782',
    pink800: '#e4106e',
    pink900: '#c31562',
    pink1000: '#450522',
  },
} as const

export const defaultTokens = {
  colors: colors.dark,
} as const satisfies Tokens
export type DefaultTokens = typeof defaultTokens
