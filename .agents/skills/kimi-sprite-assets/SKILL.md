---
name: kimi-sprite-assets
description: Generate and integrate Motion Play crayon sprites or sprite sheets using ChatGPT's image interface through Kimi WebBridge. Use when creating or replacing game artwork with this browser workflow.
---

# Kimi sprite assets for Motion Play

Inspect the requested game, its animation states and existing artwork first. Read
`SPEC.md` and follow the repository's `AGENTS.md`. Prefer procedural motion for
continuous movement; use generated frames when they add meaningful poses or
expressions. Preserve the camera → normalized input events → game boundary.

## Browser workflow

- Use the authenticated ChatGPT **web interface** through Kimi WebBridge, not
  the OpenAI Image API. Keep related assets in the existing **EyeToy Game
  Assets** conversation when available:
  `https://chatgpt.com/c/6afdb368-b440-83eb-8bea-67b7fedbb8eb`. If it is not
  available to the current account, find or create a dedicated conversation;
  ask the user to sign in if authentication is required. Do not upload webcam
  frames or camera data.
- Check the local bridge and browser session before acting. The bridge used in
  this project listened at `http://127.0.0.1:10086`; discover its current
  address and installed Kimi WebBridge instructions if that has changed. The
  local binary previously lived at `~/.kimi-webbridge/bin/kimi-webbridge`.
  The browser tab ID and bridge session can change; discover them instead of
  assuming old IDs are valid. For example, if the bridge is on that port:

  ```sh
  curl -s http://127.0.0.1:10086/status
  curl -s -X POST http://127.0.0.1:10086/command \
    -H 'Content-Type: application/json' \
    -d '{"action":"list_tabs","args":{},"session":"motion-play-assets"}'
  ```

  Use the bridge's `attach_tab`, `snapshot`, `fill`, `send_keys` and `click`
  actions to work in the conversation. Inspect the current accessibility tree
  before choosing controls; refs are not durable. Follow the current bridge
  documentation for sessions, reconnects and cleanup. Preserve existing user
  tabs and work.
- Request individual reusable sprites or a clearly aligned sheet, rather than
  a screenshot of a complete interface. Specify the character, exact frame
  order, consistent scale and alignment, padding, transparent background,
  and no text, grid lines or unwanted scenery. Match the existing art:
  childlike wax-crayon scribbles, imperfect coloring, uneven dark outlines,
  cheerful colors and subtle paper texture; avoid polished vectors, gradients
  and realistic shadows. For interface backgrounds, keep the center legible and
  render labels as real accessible text.
- Download through the ChatGPT browser interface. If a native Save dialog
  appears, inspect it and complete the authorized download. If downloading is
  blocked, report the actual problem; do not imply the file was saved or bypass
  a permission or approval requirement. Do not expose credentials or tokens.

## Verify and integrate

1. Find the actual download and inspect it visually. Check dimensions and alpha
   (for example with `magick identify`), and verify transparency is real rather
   than a checkerboard painted into the image. Check the frame boundaries,
   poses, alignment, padding and style. If needed, use the ChatGPT editor's
   background removal and download the result again; verify the new file.
2. Preserve the downloaded source under `docs/visual-audit/` and preserve a
   recoverable copy before overwriting any existing asset. Optimize for browser
   delivery without visibly degrading it; avoid enlarging tiny frames into
   blurry game art. Put assets in `public/assets/minigames/<game-name>/` or the
   appropriate UI asset directory.
3. Document filename, intended use, exact prompt, dimensions, transparency,
   animation states and source in the game asset manifest and
   `docs/visual-audit/asset-manifest.md`. Keep old art as a fallback where
   appropriate. Never claim a missing download or untested result exists.
4. Connect frames to the game's simulation states and clock, not a separate
   drifting timer. Keep collision geometry and camera mirroring consistent;
   support reduced motion and pause. Maintain readable text and player cues.
5. Run relevant unit and browser checks using simulated input when available;
   inspect gameplay screenshots, including multiplayer and narrow layouts when
   relevant. Check the release budgets with `npm run build`. Update the visual
   audit with before/after captures and any failures. Synthetic camera tests do
   not establish real-webcam tracking or latency; report hardware validation
   separately and honestly.
