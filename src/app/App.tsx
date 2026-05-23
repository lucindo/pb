import type { ReactElement } from 'react'

import { UiStringsProvider } from '../hooks/useUiStringsContext'
import { ScreenRouter } from './ScreenRouter'
import { useAppViewModel } from './useAppViewModel'

export default function App(): ReactElement {
  const vm = useAppViewModel()

  return (
    <UiStringsProvider value={vm.uiStrings}>
      <ScreenRouter vm={vm} />
    </UiStringsProvider>
  )
}
