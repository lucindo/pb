// Design-primitive component library. Token-bound, no surface-specific
// styling, composable from src/components/icons/.
//
// Naming convention: each file exports a single named component plus its
// props interface as `<Name>Props`. Variant string-literal types are also
// exported when they aid consumer type-safety.

export { IconButton } from './IconButton'
export type { IconButtonProps, IconButtonSize } from './IconButton'

export { PageShell } from './PageShell'
export type { PageShellProps } from './PageShell'

export { PickerCardGrid } from './PickerCardGrid'
export type { PickerCardGridProps, PickerCardLayout } from './PickerCardGrid'

export { SectionCard } from './SectionCard'
export type { SectionCardProps } from './SectionCard'

export { SegmentedControl } from './SegmentedControl'
export type { SegmentedControlOption, SegmentedControlProps } from './SegmentedControl'

export { Stepper } from './Stepper'
export type { StepperProps } from './Stepper'

export { Toggle } from './Toggle'
export type { ToggleProps } from './Toggle'

export { TopAppBar } from './TopAppBar'
export type { TopAppBarProps } from './TopAppBar'
