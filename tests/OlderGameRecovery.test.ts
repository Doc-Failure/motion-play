import { BubbleBattleModel } from '../src/minigames/bubble-battle/BubbleBattleModel'
import { describe, expect, it } from 'vitest'
import { PaintSplashModel } from '../src/minigames/paint-splash/PaintSplashModel'
import { MeteorSmashModel } from '../src/minigames/meteor-smash/MeteorSmashModel'
import { BalloonPanicModel } from '../src/minigames/balloon-panic/BalloonPanicModel'
import { GoldRushModel } from '../src/minigames/gold-rush/GoldRushModel'
import { SimonSaysModel } from '../src/minigames/simon-says/SimonSaysModel'
import { FruitCatcherModel } from '../src/minigames/fruit-catcher/FruitCatcherModel'
import { AirPongModel } from '../src/minigames/air-pong/AirPongModel'
import { GoalkeeperModel } from '../src/minigames/goalkeeper/GoalkeeperModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

const options = { playerCount: 4 as const, random: () => .5 }
const games = [
  { name: 'Bubble Battle', create: () => new BubbleBattleModel(options), input: (m: BubbleBattleModel, e: MotionInputEvent) => m.handleInput(e), kind: 'MOTION_HIT' },
  { name: 'Paint Splash', create: () => new PaintSplashModel(options), input: (m: PaintSplashModel, e: MotionInputEvent) => m.brush(e), kind: 'MOTION_BRUSH' },
  { name: 'Meteor Smash', create: () => new MeteorSmashModel(options), input: (m: MeteorSmashModel, e: MotionInputEvent) => m.hit(e), kind: 'MOTION_HIT' },
  { name: 'Balloon Panic', create: () => new BalloonPanicModel(options), input: (m: BalloonPanicModel, e: MotionInputEvent) => m.hit(e), kind: 'MOTION_HIT' },
  { name: 'Gold Rush', create: () => new GoldRushModel(options), input: (m: GoldRushModel, e: MotionInputEvent) => m.hit(e), kind: 'MOTION_HIT' },
  { name: 'Simon Says', create: () => new SimonSaysModel(options), input: (m: SimonSaysModel, e: MotionInputEvent) => m.hit(e), kind: 'MOTION_HIT' },
  { name: 'Fruit Catcher', create: () => new FruitCatcherModel(options), input: (m: FruitCatcherModel, e: MotionInputEvent) => m.moveHand(e), kind: 'HAND_POSITION' },
  { name: 'Air Pong', create: () => new AirPongModel(options), input: (m: AirPongModel, e: MotionInputEvent) => m.moveHand(e), kind: 'HAND_POSITION' },
  { name: 'Goalkeeper', create: () => new GoalkeeperModel(options), input: (m: GoalkeeperModel, e: MotionInputEvent) => m.moveBody(e), kind: 'BODY_MOVE' },
] as const

for (const game of games) describe(game.name, () => {
  for (const pauseAt of [1000, 3500]) it(`preserves four-player state through repeated long pauses at ${pauseAt}ms`, () => {
    const model = game.create()
    const control = game.create()
    model.start(0); control.start(0)
    const before = control.update(pauseAt)
    const frozen = model.pause(pauseAt)
    expect(frozen).toEqual({ ...before, phase: 'paused' })
    expect(model.pause(pauseAt + 10)).toEqual(frozen)
    expect(model.update(100_000)).toEqual(frozen)
    expect(model.resume(100_000)).toEqual(before)
    expect(model.update(100_100)).toEqual(control.update(pauseAt + 100))
    const again = model.pause(100_100)
    expect(model.update(200_000)).toEqual(again)
    model.resume(200_000)
    expect(model.update(200_500)).toEqual(control.update(pauseAt + 600))
    // Pausing an already completed round is harmless.
    model.update(300_000)
    expect(model.pause(300_000).phase).toBe('results')
    expect(model.start(300_001).phase).toBe('countdown')
  })
})

// Keep each model/input pairing typed while applying the same interruption scenario.
function checkInput<M extends { start(t: number): unknown; update(t: number): unknown; pause(t: number): unknown; resume(t: number): unknown }>(
  create: () => M, input: (model: M, event: MotionInputEvent) => unknown, kind: MotionInputEvent['kind'],
) {
  const model = create()
  model.start(0)
  const frozen = model.pause(3500)
  const event: MotionInputEvent = { playerId: 1, kind, x: .5, y: .5, confidence: 1, timestamp: 9000 }
  expect(input(model, event)).toEqual(frozen)
  const resumed = model.resume(10000)
  expect(input(model, event)).toEqual(resumed)
  expect(input(model, { ...event, timestamp: 10001 })).not.toEqual(resumed)
}

it('blocks live and delayed interrupted input in every older model', () => {
  checkInput(games[1].create, games[1].input, games[1].kind)
  checkInput(games[2].create, games[2].input, games[2].kind)
  checkInput(games[3].create, games[3].input, games[3].kind)
  checkInput(games[4].create, games[4].input, games[4].kind)
  checkInput(games[5].create, games[5].input, games[5].kind)
  checkInput(games[6].create, games[6].input, games[6].kind)
  checkInput(games[7].create, games[7].input, games[7].kind)
  checkInput(games[8].create, games[8].input, games[8].kind)
})
