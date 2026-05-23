import type { ReactElement } from 'react'

import { ScreenRouter } from './ScreenRouter'
import { useAppViewModel } from './useAppViewModel'

export default function App(): ReactElement {
  const vm = useAppViewModel()

  return <ScreenRouter vm={vm} />
}
