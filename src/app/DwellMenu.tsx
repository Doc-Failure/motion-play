import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DwellController, type DwellTarget } from '../input/DwellController'
import type { MotionInputEvent } from '../input/MotionProcessor'

export interface DwellMenuItem {
  id: string
  label: string
  hint: string
  onActivate(): void
}

export function DwellMenu({ events, items }: { events: readonly MotionInputEvent[]; items: readonly DwellMenuItem[] }) {
  const controller = useRef(new DwellController())
  const actions = useRef(new Map<string, () => void>())
  const [active, setActive] = useState({ id: null as string | null, progress: 0 })
  const targets = useMemo<DwellTarget[]>(() => items.map((item, index) => ({ id: item.id, x: index / items.length, y: .68, width: 1 / items.length, height: .32 })), [items])

  useEffect(() => { actions.current = new Map(items.map((item) => [item.id, item.onActivate])) }, [items])
  useEffect(() => {
    for (const event of events) {
      const state = controller.current.process(event, targets)
      setActive({ id: state.activeId, progress: state.progress })
      if (state.activatedId) actions.current.get(state.activatedId)?.()
    }
  }, [events, targets])

  return <div className="dwell-menu" aria-label="Hands-free menu"><p>Player 1: hold your motion over a choice</p><div>{items.map((item) => {
    const progress = active.id === item.id ? active.progress : 0
    const style = { '--dwell-progress': `${progress * 360}deg` } as CSSProperties
    return <button type="button" key={item.id} style={style} aria-label={`${item.label}. ${item.hint}`} onClick={item.onActivate} onPointerLeave={() => { controller.current.cancel(); setActive({ id: null, progress: 0 }) }}><span className="dwell-ring" aria-hidden="true" /><strong>{item.label}</strong><small>{item.hint}</small></button>
  })}</div></div>
}
