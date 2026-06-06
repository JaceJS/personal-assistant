import { clampTooltipX } from '../chartTooltipUtils';

describe('clampTooltipX', () => {
  it('centers tooltip on xPos when well within bounds', () => {
    expect(clampTooltipX(200, 400, 100)).toBe(150);
  });

  it('clamps to 0 when xPos is near left edge', () => {
    expect(clampTooltipX(20, 400, 100)).toBe(0);
  });

  it('clamps to right edge when xPos is near right edge', () => {
    expect(clampTooltipX(390, 400, 100)).toBe(300);
  });

  it('handles tooltip wider than container gracefully', () => {
    expect(clampTooltipX(200, 100, 200)).toBe(0);
  });
});
