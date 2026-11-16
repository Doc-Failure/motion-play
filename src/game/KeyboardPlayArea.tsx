import { useId, useState, type ComponentPropsWithoutRef } from 'react'

type Props = Omit<ComponentPropsWithoutRef<'div'>, 'onKeyDown'> & {
  enabled: boolean
  onAction(x: number, y: number): void
}

/** A stable keyboard target that emits the same normalized positions as pointers. */
export function KeyboardPlayArea({ enabled, onAction, children, className = '', ...props }: Props) {
  // Integer steps avoid accumulated floating point drift at the board edges.
  const [cursor, setCursor] = useState({ x: 10, y: 10 })
  const helpId = useId()
  return <div {...props} className={`${className} keyboard-play-area`} role="group" tabIndex={0}
    aria-disabled={!enabled} aria-describedby={helpId} onKeyDown={event => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter']
      if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
      event.preventDefault()
      if (!enabled) return
      if (event.key === ' ' || event.key === 'Enter') onAction(cursor.x / 20, cursor.y / 20)
      else setCursor(current => ({
        x: Math.max(0, Math.min(20, current.x + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0))),
        y: Math.max(0, Math.min(20, current.y + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0))),
      }))
    }}>
    {children}
    <p id={helpId} className="keyboard-play-help">Keyboard: arrows to aim. Space or Enter to act.</p>
    <i className="keyboard-play-cursor" aria-hidden="true" style={{ left: `${cursor.x * 5}%`, top: `${cursor.y * 5}%` }} />
  </div>
}
