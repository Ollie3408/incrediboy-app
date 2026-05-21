/**
 * DevDiagnosticsDrawer — slide-out shell for development diagnostics.
 * Does not affect stage layout while closed (position: fixed, off-screen).
 */

import { useEffect, type ReactNode } from 'react'
import './devDiagnosticsDrawer.css'

type DevDiagnosticsDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function DevDiagnosticsDrawer({ open, onClose, children }: DevDiagnosticsDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        className={`dev-drawer-backdrop${open ? ' dev-drawer-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`dev-drawer${open ? ' dev-drawer--open' : ''}`}
        aria-label="Developer diagnostics drawer"
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        <header className="dev-drawer__header">
          <h2 className="dev-drawer__title">Dev Diagnostics</h2>
          <button
            type="button"
            className="dev-drawer__close"
            onClick={onClose}
            aria-label="Close diagnostics drawer"
          >
            ×
          </button>
        </header>
        <div className="dev-drawer__scroll">{children}</div>
      </aside>
    </>
  )
}
