import { describe, expect, it } from 'vitest'
import backlog from '../tasks/backlog.json'
import { catalogGames } from '../src/app/catalog'

const expansionIds = Array.from({ length: 22 }, (_, index) => `T25${String.fromCharCode(65 + index)}`)

describe('T25 catalog expansion plan', () => {
  it('assigns every remaining catalog game to exactly one small task', () => {
    const plannedTasks = backlog.filter((task) => expansionIds.includes(task.id))
    const remainingGames = catalogGames.filter((game) => !game.available)

    expect(plannedTasks).toHaveLength(22)
    expect(remainingGames).toHaveLength(22)

    for (const game of remainingGames) {
      expect(plannedTasks.filter((task) => task.title.includes(game.title))).toHaveLength(1)
    }

    expect(plannedTasks.every((task) => /rendered (?:brush )?simulation/.test(task.notes))).toBe(true)
    expect(plannedTasks.every((task) => task.needs_hardware_validation && !task.hardware_verified)).toBe(true)
  })

  it('keeps the expansion sequential and blocks final release review until it finishes', () => {
    const byId = new Map(backlog.map((task) => [task.id, task]))

    expansionIds.forEach((id, index) => {
      expect(byId.get(id)?.depends_on).toEqual([index === 0 ? 'T25' : expansionIds[index - 1]])
    })

    expect(byId.get('T26')?.depends_on).toEqual(['T25V'])
  })
})
