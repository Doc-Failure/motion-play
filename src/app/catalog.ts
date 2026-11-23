export const catalogCategories = ['Hit & Destroy', 'Catch & Collect', 'Move & Survive', 'Clean & Create', 'Skill & Precision'] as const

export type CatalogCategory = (typeof catalogCategories)[number]
export type InputKind = 'ARM_MOVE' | 'HAND_PINCH' | 'MOTION_HIT' | 'MOTION_BRUSH' | 'HAND_POSITION' | 'HAND_SWIPE' | 'BODY_MOVE' | 'FREEZE' | 'MIXED'
export type Difficulty = 'Easy' | 'Normal' | 'Hard'
export type CatalogGame = { id: number; slug: string; title: string; rules: string; category: CatalogCategory; input: InputKind; difficulty: Difficulty; mode: 'Competitive' | 'Cooperative' | 'Solo score chase'; players: readonly number[]; available: boolean; colors: readonly [string, string] }

const game = (id: number, slug: string, title: string, rules: string, category: CatalogCategory, input: InputKind, difficulty: Difficulty, mode: CatalogGame['mode'], colors: readonly [string, string], available = false): CatalogGame => ({ id, slug, title, rules, category, input, difficulty, mode, players: [1, 2, 3, 4], available, colors })

export const catalogGames: readonly CatalogGame[] = [
  game(1, 'bubble-battle', 'Bubble Battle', 'Pop floating bubbles and keep clear of the bombs.', 'Hit & Destroy', 'MOTION_HIT', 'Easy', 'Competitive', ['#66c7df', '#ee654f'], true),
  game(2, 'whack-a-mole', 'Whack-a-Mole', 'Strike each mole before it ducks back underground.', 'Hit & Destroy', 'MOTION_HIT', 'Easy', 'Competitive', ['#72b779', '#9b6b43'], true),
  game(3, 'meteor-smash', 'Meteor Smash', 'Smash meteors before they crash into your base.', 'Hit & Destroy', 'MOTION_HIT', 'Normal', 'Competitive', ['#7557a8', '#f28c46'], true),
  game(4, 'fruit-slash', 'Fruit Slash', 'Swipe the fruit, but do not slice the bombs.', 'Hit & Destroy', 'HAND_SWIPE', 'Normal', 'Competitive', ['#ee654f', '#72b779'], true),
  game(5, 'punch-arena', 'Cardboard Champ', 'Jab the cardboard boxer. Duck or lean away from its punches.', 'Hit & Destroy', 'MIXED', 'Normal', 'Competitive', ['#f28c46', '#4c9ed9'], true),
  game(6, 'pinata-party', 'Piñata Party', 'Land repeated hits to shower the party with candy.', 'Hit & Destroy', 'MOTION_HIT', 'Easy', 'Cooperative', ['#e45b9d', '#f5c847'], true),
  game(7, 'monster-defense', 'Monster Defense', 'Stop the silly monsters before they reach the gate.', 'Hit & Destroy', 'MOTION_HIT', 'Normal', 'Cooperative', ['#72b779', '#7557a8'], true),
  game(8, 'balloon-panic', 'Balloon Panic', 'Hit only the balloon color called out on screen.', 'Hit & Destroy', 'MOTION_HIT', 'Normal', 'Competitive', ['#ee654f', '#66c7df'], true),
  game(9, 'fruit-catcher', 'Fruit Catcher', 'Catch fresh fruit and dodge anything rotten.', 'Catch & Collect', 'HAND_POSITION', 'Normal', 'Competitive', ['#f28c46', '#72b779'], true),
  game(10, 'gold-rush', 'Gold Rush', 'Collect falling coins while avoiding the hazards.', 'Catch & Collect', 'MOTION_HIT', 'Easy', 'Competitive', ['#f5c847', '#9b6b43'], true),
  game(11, 'fish-frenzy', 'Fish Frenzy', 'Catch the most valuable fish before they swim away.', 'Catch & Collect', 'HAND_POSITION', 'Normal', 'Competitive', ['#4c9ed9', '#66c7df'], true),
  game(12, 'supermarket-rush', 'Supermarket Rush', 'Pick the correct groceries from the moving belt.', 'Catch & Collect', 'MOTION_HIT', 'Normal', 'Competitive', ['#ee654f', '#f5c847'], true),
  game(13, 'star-collector', 'Star Collector', 'Touch the twinkling stars before they disappear.', 'Catch & Collect', 'MOTION_HIT', 'Easy', 'Competitive', ['#f5c847', '#7557a8'], true),
  game(14, 'treasure-grab', 'Treasure Grab', 'Grab bright treasures and avoid the cursed objects.', 'Catch & Collect', 'MOTION_HIT', 'Normal', 'Competitive', ['#f5c847', '#4c9ed9'], true),
  game(15, 'dodgeball', 'Dodgeball', 'Move your body out of the path of incoming balls.', 'Move & Survive', 'BODY_MOVE', 'Normal', 'Competitive', ['#ee654f', '#4c9ed9'], true),
  game(16, 'laser-escape', 'Laser Escape', 'Steer a motion-center marker clear of sweeping laser lines.', 'Move & Survive', 'BODY_MOVE', 'Hard', 'Competitive', ['#e45b9d', '#18334a'], true),
  game(17, 'dance-challenge', 'Dance Challenge', 'Match each simple movement cue to keep the beat.', 'Move & Survive', 'BODY_MOVE', 'Normal', 'Competitive', ['#e45b9d', '#7557a8'], true),
  game(18, 'freeze', 'Freeze!', 'Move with the music, then hold still when it stops.', 'Move & Survive', 'FREEZE', 'Easy', 'Competitive', ['#66c7df', '#7557a8'], true),
  game(19, 'ninja-training', 'Paper Dojo', 'Swat your way through four dojos. Break tougher ninja armor and protect your five health points!', 'Move & Survive', 'MIXED', 'Normal', 'Competitive', ['#477f8e', '#f3c966'], true),
  game(20, 'jump-rush', 'Jump Rush', 'You control the kangaroo. Jump to clear the incoming hurdles!', 'Move & Survive', 'BODY_MOVE', 'Normal', 'Competitive', ['#72b779', '#f28c46'], true),
  game(21, 'window-wipe', 'Window Wipe', 'Sweep away soap, scrub the ink and clean one big window together.', 'Clean & Create', 'MOTION_BRUSH', 'Easy', 'Cooperative', ['#66c7df', '#fffaf0'], true),
  game(22, 'paint-splash', 'Paint Splash', 'Cover as much of your canvas with paint as you can.', 'Clean & Create', 'MOTION_BRUSH', 'Easy', 'Competitive', ['#e45b9d', '#f5c847'], true),
  game(23, 'car-wash', 'Car Wash', 'Scrub away the mud to reveal the bright car beneath.', 'Clean & Create', 'MOTION_BRUSH', 'Easy', 'Cooperative', ['#4c9ed9', '#9b6b43'], true),
  game(24, 'pizza-maker', 'Pizza Maker', 'Choose ingredients to copy each tasty pizza order.', 'Clean & Create', 'MOTION_HIT', 'Normal', 'Cooperative', ['#ee654f', '#f5c847'], true),
  game(25, 'graffiti-race', 'Graffiti Race', 'Paint quickly to reveal the hidden mural.', 'Clean & Create', 'MOTION_BRUSH', 'Normal', 'Competitive', ['#7557a8', '#72b779'], true),
  game(26, 'tower-builder', 'Tower Builder', 'Guide each block into place without toppling the tower.', 'Clean & Create', 'HAND_POSITION', 'Hard', 'Cooperative', ['#f28c46', '#4c9ed9'], true),
  game(27, 'air-pong', 'Air Pong', 'Move your hand to return the ball with your paddle.', 'Skill & Precision', 'HAND_POSITION', 'Normal', 'Competitive', ['#4c9ed9', '#ee654f'], true),
  game(28, 'goalkeeper', 'Goalkeeper', 'Cover the posts and middle of one goal. Reach across to help your teammates save.', 'Skill & Precision', 'BODY_MOVE', 'Normal', 'Cooperative', ['#72b779', '#f5c847'], true),
  game(29, 'basketball-blitz', 'Basketball Blitz', 'Swipe upward to sink as many baskets as possible.', 'Skill & Precision', 'HAND_SWIPE', 'Hard', 'Solo score chase', ['#f28c46', '#7557a8'], true),
  game(30, 'simon-says', 'Simon Says', 'Repeat the growing sequence of target touches.', 'Skill & Precision', 'MOTION_HIT', 'Normal', 'Competitive', ['#f5c847', '#4c9ed9'], true),
  game(31, 'plate-spinner', 'Plate Spinner', 'Tap each wobbling plate before it tumbles.', 'Skill & Precision', 'MOTION_HIT', 'Hard', 'Competitive', ['#66c7df', '#e45b9d'], true),
  game(32, 'magic-duel', 'Magic Duel', 'Draw the shown hand patterns to cast playful spells.', 'Skill & Precision', 'HAND_SWIPE', 'Hard', 'Competitive', ['#7557a8', '#e45b9d'], true),
  game(33, 'rocket-rumble', 'Rocket Rumble', 'Tag matching rockets, then hit the switch for a fireworks chain.', 'Skill & Precision', 'MOTION_HIT', 'Normal', 'Competitive', ['#7557a8','#f5c847'], true),
  game(34, 'silk-squad', 'Silk Squad', 'Move your arms to cast webs at runaway robot bugs.', 'Hit & Destroy', 'ARM_MOVE', 'Normal', 'Competitive', ['#7bd3c4','#e99ccf'], true),
  game(35, 'beat-freak', 'Paper Jam', 'Hit the speakers as the records arrive. Share one song as a band!', 'Skill & Precision', 'MOTION_HIT', 'Normal', 'Cooperative', ['#f39fb8','#78cbd3']),
  game(36, 'keep-ups', 'Keep Ups', 'Three lives. Keep the ball up, beat the wind and aim for golden hoops!', 'Skill & Precision', 'BODY_MOVE', 'Normal', 'Competitive', ['#72b779','#f5c847'], true),
  game(37, 'ghost-catcher', 'Ghost Catcher', 'Rub rising ghosts until they pop. Swat bats before they escape!', 'Hit & Destroy', 'MOTION_BRUSH', 'Normal', 'Competitive', ['#baa3e0','#b9e9de'], true),
  game(38, 'ufo-juggler', 'UFO Juggler', 'Wave to spin saucers into orbit. Let hot engines cool!', 'Skill & Precision', 'MOTION_BRUSH', 'Normal', 'Competitive', ['#91cfd0','#b4a2db'], true),
  game(39, 'six-hoops', 'Six Hoops', 'Bump falling balls into six baskets with your head and body.', 'Skill & Precision', 'BODY_MOVE', 'Normal', 'Competitive', ['#f5a052','#74d6df'], true),
  game(40, 'net-rally', 'Net Rally', 'Play singles or doubles, or rally together with three players.', 'Skill & Precision', 'BODY_MOVE', 'Normal', 'Competitive', ['#74d6df','#ed9ba5'], true),
  game(41, 'kangaroo-race', 'Kangaroo Race', 'Run automatically and jump over logs, rocks and gaps!', 'Move & Survive', 'BODY_MOVE', 'Normal', 'Competitive', ['#d7a16a','#a5d88b'], true),
  game(42, 'marble-bowling', 'Marble Bowling', 'Sweep one hand upward toward the pins. Knock down as many as you can in three rolls!', 'Skill & Precision', 'HAND_SWIPE', 'Easy', 'Competitive', ['#e8bd87','#79c9ce'], true),
  game(43, 'shadow-snap', 'Shadow Snap', 'Fit your whole body through the cardboard cutout. Fill the shape and tuck in the red edges!', 'Clean & Create', 'BODY_MOVE', 'Easy', 'Cooperative', ['#a69ed2','#edb56b'], true),
  game(44, 'floor-is-lava', 'Floor Is Lava', 'Get everyone onto the island before it disappears. Only the grass stays safe when the lava comes!', 'Move & Survive', 'BODY_MOVE', 'Easy', 'Cooperative', ['#ef7946', '#8fd76e'], true),
  game(45, 'jenga', 'Jenga', 'Take turns pulling a wooden block and stacking it on top. How high can you build together?', 'Skill & Precision', 'HAND_POSITION', 'Easy', 'Cooperative', ['#efbd79', '#77b9ac'], true),
]

export const getGameBySlug = (slug: string) => catalogGames.find((entry) => entry.slug === slug)

// The focused public set. Other implementations stay available for later refinement.
export const visibleGameSlugs = ['ninja-training','window-wipe','punch-arena','keep-ups','ghost-catcher','ufo-juggler','six-hoops','goalkeeper','net-rally','kangaroo-race','marble-bowling','shadow-snap','floor-is-lava','jenga'] as const
export const visibleCatalogGames: readonly CatalogGame[] = visibleGameSlugs.flatMap(slug => {
  const entry = getGameBySlug(slug)
  return entry?.available ? [entry] : []
})
export const isGameVisible = (slug: string) => visibleCatalogGames.some(game => game.slug === slug)
