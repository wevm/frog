import { createSystem } from 'frog/ui'

export const {
  Box,
  Columns,
  Column,
  Divider,
  Heading,
  HStack,
  Icon,
  Image,
  Rows,
  Row,
  Spacer,
  Text,
  VStack,
  vars,
} = createSystem({
  fonts: {
    default: [
      {
        name: 'Open Sans',
        source: 'google',
        style: 'italic',
        weight: 400,
      },
      {
        name: 'Open Sans',
        source: 'google',
        style: 'italic',
        weight: 600,
      },
      {
        name: 'Open Sans',
        source: 'google',
        style: 'italic',
        weight: 700,
      },
    ],
    madimi: [
      {
        name: 'Madimi One',
        source: 'google',
      },
    ],
  },
})
