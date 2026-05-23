import type { MouseEventHandler, ReactNode } from 'react'

interface ArrowLinkSharedProps {
  children: ReactNode
  className?: string
}

interface ArrowLinkButtonProps extends ArrowLinkSharedProps {
  onClick: MouseEventHandler<HTMLButtonElement>
  href?: never
  target?: never
  rel?: never
}

interface ArrowLinkAnchorProps extends ArrowLinkSharedProps {
  href: string
  target?: string
  rel?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

export type ArrowLinkProps = ArrowLinkButtonProps | ArrowLinkAnchorProps

/** Bold accent-color CTA link with a trailing right-arrow glyph. Renders as
 *  `<a>` when an `href` is provided and as `<button>` otherwise. The arrow is
 *  always present after the children so the CTA shape is consistent across
 *  every place this primitive is used (cards, table rows, list items). */
export function ArrowLink(props: ArrowLinkProps) {
  const baseClass = `inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-breathing-accent-strong)] transition hover:opacity-80 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 ${props.className ?? ''}`.trim()
  if ('href' in props && props.href !== undefined) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        onClick={props.onClick}
        className={baseClass}
      >
        {props.children}
        <ArrowGlyph />
      </a>
    )
  }
  return (
    <button type="button" onClick={props.onClick} className={baseClass}>
      {props.children}
      <ArrowGlyph />
    </button>
  )
}

function ArrowGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  )
}
