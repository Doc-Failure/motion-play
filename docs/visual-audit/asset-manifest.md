# Generated game assets

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/goalkeeper/kicker-crayon.webp` | Goalkeeper kicker | 192 × 192 | Alpha | Procedural tilt during wind-up and kick |
| `public/assets/minigames/paper-dojo/watchtower.webp` | Paper Dojo side towers | 192 × 256 | Alpha | Static scenery, mirrored for the right side |
| `public/assets/ui/button-yellow-crayon.webp` | Results action button background; label remains text | 300 × 100 | Alpha | CSS hover and focus, no image frames |

Both were generated through the “EyeToy Game Assets” ChatGPT conversation.
Original PNGs are preserved in this directory as `goalkeeper-kicker-original.png`
and `dojo-tower-original.png`.

The yellow button original is `button-yellow-original.png`. Its prompt requested
a single blank wide yellow wax-crayon sticker with an uneven black outline,
clear center for real dark text and a transparent background, without text,
icons, scenery, gradients or realistic shadows.

The footballer prompt asked for a cheerful young player in a red jersey and
blue shorts, poised to kick, drawn in imperfect wax crayon with a transparent
background and no ball, scenery or text. The tower prompt asked for a tall
wooden dojo watchtower with teal roofs and a flag, in the same rough crayon
style, isolated on transparency without people, scenery or text.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/paper-dojo/ninja-poses.webp` | Paper Dojo target and hit reaction | 256 × 256 | Alpha | Four cells: running, ready, airborne and surprised hit; procedural rotation and tumble |

The ninja sheet was generated in the same ChatGPT conversation, requesting four
separate poses of a cheerful teal ninja with yellow scarf in rough wax crayon,
with uneven dark outlines and transparent background. ChatGPT's background
removal was applied after the first download contained a baked checkerboard.
The verified transparent source is `dojo-ninja-sheet-original.png`.
The recoverable pre-optimization tournament panel is `tournament-panel-original.webp`.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/paper-dojo/ninja-attack.webp` | Paper Dojo airborne attack | 128 × 128 | Alpha | Determined attack pose, rotated along the simulated leap |

The attack image was generated in the same ChatGPT conversation: a full-body
teal ninja with yellow scarf, leaping in a punch with determined eyebrows and a
playful battle-cry face; rough crayon strokes, dark uneven outlines, transparent
background, and no scenery or text. The original is
`dojo-ninja-attack-original.png`. The existing leap frame remains the fallback
if this image cannot load.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/goalkeeper/kicker-poses.webp` | Goalkeeper opponent | 256 × 256 | Alpha | Four cells: ready, wind-up, kick and follow-through, selected by the shot clock |

Generated in the same ChatGPT conversation as a consistent four-pose red-shirt
footballer, in rough wax crayon, on transparent background without ball or
scenery. The full prompt is in the Goalkeeper asset manifest; the unmodified
source is `goalkeeper-kicker-sheet-original.png`. The previous single image
remains available as a fallback.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/kangaroo-race/kangaroo-poses.webp` | Kangaroo Race runner | 256 × 256 | Alpha | Four cells: running, jumping, landing and stumbling, selected by the race clock |

Generated through the same ChatGPT conversation as a tan kangaroo with a teal
running shirt in rough wax crayon; see the game asset manifest for the prompt.
The full-resolution source is `kangaroo-poses-original.png`. The original
procedural kangaroo remains the loading/error fallback.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/cardboard-champ/boxer-poses.webp` | Cardboard Champ robot body | 512 × 512 | Alpha | Four cells: ready, attack, hit and knockout; arms and gloves remain procedural |

Generated in the same ChatGPT conversation as a friendly armless cardboard
robot in rough wax crayon. The full prompt is in the game asset manifest;
`cardboard-boxer-sheet-original.png` preserves the downloaded source.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/ghost-catcher/bat-poses.webp` | Ghost Catcher bat | 256 × 256 | Alpha | Wings up, spread, down and touched; procedural fallback retained |
| `public/assets/ui/button-yellow-clean.webp` | Results action background | 450 × 150 | Alpha | Existing CSS interaction and accessible text labels |

Both were generated through the same ChatGPT conversation. Sources are
`ghost-bat-sheet-original.png` and `button-yellow-clean-original.png`. The
button prompt requested a blank, pale yellow crayon sticker with a clear center
and a gently uneven dark outline, transparent outside, no text or icons. The
previous generated button remains in `public/assets/ui/button-yellow-crayon.webp`.

| Assets | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/ui/catalog-{yellow,blue,purple,green}.webp` | Catalog game tiles | 300 × 120 each | Alpha | CSS hover/focus |

Generated together in ChatGPT through Kimi WebBridge as four blank rounded
crayon stickers with pale centers and uneven dark outlines, in yellow, blue,
purple and green. Source: `catalog-buttons-original.png`; each tile was cropped
and optimized. Game names and illustrations remain separate accessible UI.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/ghost-catcher/ghost-poses.webp` | Ghost Catcher ghost | 384 × 384 | Alpha | Idle, wave, touched, caught; original ghost remains the fallback |

Generated in the same ChatGPT conversation as the original white and blue
crayon ghost. The full prompt is in the game manifest and the unmodified
source is `ghost-poses-original.png`.

| Asset | Use | Dimensions | Transparency | Animation |
| --- | --- | --- | --- | --- |
| `public/assets/minigames/kangaroo-race/kangaroo-run.webp` | Automatically running kangaroo | 384 × 384 | Alpha | Four running poses, selected from the race clock; still frame for reduced motion |

Generated in the existing ChatGPT conversation. The source is
`kangaroo-run-sheet-original.png`; the original jump and stumble sheet remains
in use for those states and as a running fallback.
