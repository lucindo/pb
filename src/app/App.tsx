import type { ReactElement } from 'react'

import { AppScreen } from './AppScreen'
import { useAppViewModel } from './useAppViewModel'

export default function App(): ReactElement {
  const vm = useAppViewModel()

  return <AppScreen vm={vm} />
}
