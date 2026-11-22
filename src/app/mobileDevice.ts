/** Choose the experience once per visit so resizing or rotating never swaps games. */
export function isMobileDevice(device: Navigator = navigator) {
  return /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
    || (device as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData?.mobile === true
}
