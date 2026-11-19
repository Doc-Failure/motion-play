# Marble Bowling artwork

`pin-poses.webp`: 1086 × 362, transparent WebP, four equal horizontal cells.
Used for standing, wobbling, tipping, and knocked-down bowling pins. Frames
follow the simulated impact time; reduced motion uses the standing and final
poses. The unmodified 2172 × 724 PNG downloaded through ChatGPT and Kimi
WebBridge is preserved at `docs/visual-audit/marble-bowling/pin-poses-original.png`.

Generation prompt:

> Create a reusable animation sprite sheet for our Motion Play Marble Bowling game, matching the crayon artwork in this conversation. One identical cheerful bowling pin with a red neck stripe, drawn in childlike wax crayon with rough scribbled texture and uneven dark outlines, white pin. Exactly 4 equally sized square frames in a single horizontal row: (1) standing upright, (2) wobbling slightly, (3) tipping diagonally after impact, (4) lying horizontally knocked down. Keep the pin consistently sized and aligned to the same ground line in each frame, fully inside each cell, ample transparent padding, no overlap. True transparent background, no checkerboard, no text, no numbers, no grid lines, no lane or scenery. Individual reusable game artwork, not a screenshot. Avoid gradients, realistic shadows, and polished vector art.

The generated cells are rectangular rather than square; the renderer crops
them at equal quarter-width boundaries while preserving the art's aspect ratio.
