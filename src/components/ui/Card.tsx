import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: ReactNode
  children: ReactNode
}

// Base surface for the light dashboard: hairline border, small radius,
// no shadow, no gradient. Title/action row is optional so it also works
// as a bare stat tile.
export function Card({ title, action, children, className = '', ...rest }: CardProps): JSX.Element {
  return (
    <section className={`rounded-card border border-line bg-surface p-4 ${className}`} {...rest}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-medium text-graphite-dim">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
