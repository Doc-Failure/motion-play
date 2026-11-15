/** Preserve the complete camera frame. Input and overlays share this rectangle. */
export function containCameraFrame(viewWidth: number, viewHeight: number, aspect: number) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9
  const width = Math.min(viewWidth, viewHeight * ratio)
  const height = width / ratio
  return { width, height, left: (viewWidth - width) / 2, top: (viewHeight - height) / 2 }
}
