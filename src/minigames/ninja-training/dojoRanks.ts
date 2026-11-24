const ranks = [
  { name: 'Leaf Scout', dojo: 'Bamboo Pavilion', slug: 'leaf', hits: 1, flight: 2500 },
  { name: 'Lantern Runner', dojo: 'Lantern Gate', slug: 'lantern', hits: 2, flight: 2220 },
  { name: 'Frost Guard', dojo: 'Frost Lookout', slug: 'frost', hits: 3, flight: 1950 },
  { name: 'Golden Crane Master', dojo: 'Golden Crane Pagoda', slug: 'crane', hits: 4, flight: 1720 },
  { name: 'Violet Shadow', dojo: 'Moon Gate', slug: 'violet', hits: 5, flight: 1620 },
] as const

export const DOJO_LEVELS = ranks.length
export const PLAYER_HEALTH = 5
export function dojoRank(level: number) {
  return ranks[Math.max(0, Math.min(ranks.length - 1, Math.floor(level) - 1))]
}
