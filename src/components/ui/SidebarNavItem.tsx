import type { ReactNode } from 'react'

interface SidebarNavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

// Thin-sidebar nav row: icon + label, brass tint when active. No
// gradients, no pill-shaped hover — a flat tint and a color change on
// the icon carry the state.
export function SidebarNavItem({ icon, label, active = false, onClick }: SidebarNavItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-brass-tint font-medium text-graphite' : 'text-graphite-dim hover:bg-line/50 hover:text-graphite'
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center ${active ? 'text-brass' : ''}`}>
        {icon}
      </span>
      {label}
    </button>
  )
}
