interface IconProps {
  svg: string
  className?: string
}

// Renders a hand-authored SVG (imported via `?raw`) inline, so its
// `stroke="currentColor"` paths pick up the surrounding text color —
// needed for the sidebar's active/inactive tinting.
export function Icon({ svg, className = '' }: IconProps): JSX.Element {
  return <span className={`inline-flex ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />
}
