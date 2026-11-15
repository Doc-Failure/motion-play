import type { MotionInputEvent } from './MotionProcessor'

export interface DwellTarget {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface DwellState {
  activeId: string | null
  progress: number
  activatedId: string | null
}

export interface DwellOptions {
  dwellMs?: number
  continuityMs?: number
  cooldownMs?: number
}

/** Converts repeated player-one motion samples into deliberate menu activation. */
export class DwellController {
  private readonly dwellMs: number
  private readonly continuityMs: number
  private readonly cooldownMs: number
  private activeId: string | null = null
  private startedAt = 0
  private lastSeenAt = -Infinity
  private cooldownUntil = -Infinity

  constructor(options: DwellOptions = {}) {
    this.dwellMs = options.dwellMs ?? 1_200
    this.continuityMs = options.continuityMs ?? 500
    this.cooldownMs = options.cooldownMs ?? 750
  }

  process(event: MotionInputEvent, targets: readonly DwellTarget[]): DwellState {
    if (event.playerId !== 1 || event.timestamp < this.cooldownUntil) return this.snapshot()
    const target = targets.find((candidate) => event.x >= candidate.x && event.x <= candidate.x + candidate.width && event.y >= candidate.y && event.y <= candidate.y + candidate.height)
    if (!target) return this.cancel()
    if (this.activeId !== target.id || event.timestamp - this.lastSeenAt > this.continuityMs) {
      this.activeId = target.id
      this.startedAt = event.timestamp
    }
    this.lastSeenAt = event.timestamp
    const progress = Math.min(1, Math.max(0, (event.timestamp - this.startedAt) / this.dwellMs))
    if (progress < 1) return { activeId: this.activeId, progress, activatedId: null }
    const activatedId = this.activeId
    this.cooldownUntil = event.timestamp + this.cooldownMs
    this.activeId = null
    return { activeId: null, progress: 0, activatedId }
  }

  cancel(): DwellState {
    this.activeId = null
    this.lastSeenAt = -Infinity
    return this.snapshot()
  }

  private snapshot(): DwellState {
    return { activeId: this.activeId, progress: 0, activatedId: null }
  }
}
