import { colors, createSystem } from 'frog/ui'

export const {
  Box,
  Columns,
  Column,
  Heading,
  HStack,
  Rows,
  Row,
  Spacer,
  Text,
  VStack,
  tokens,
} = createSystem({
  // colors: colors.light,
  fonts: {
    default: [
      {
        name: 'Open Sans',
        source: 'google',
        weight: 400,
      },
      {
        name: 'Open Sans',
        source: 'google',
        weight: 600,
      },
      {
        name: 'Open Sans',
        source: 'google',
        weight: 700,
      },
    ],
  },
})
