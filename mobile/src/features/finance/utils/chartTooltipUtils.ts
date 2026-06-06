export function clampTooltipX(
  xPos: number,
  containerWidth: number,
  tooltipWidth: number,
): number {
  'worklet';
  return Math.max(0, Math.min(xPos - tooltipWidth / 2, containerWidth - tooltipWidth));
}
