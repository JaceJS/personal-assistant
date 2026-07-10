import { QUICK_CHIPS, resolveQuickChipAction } from '@/features/ai/utils/quickChips';

describe('resolveQuickChipAction', () => {
  it('resolves a camera chip to a camera action', () => {
    expect(resolveQuickChipAction({ label: 'Scan', action: 'camera' })).toEqual({
      kind: 'camera',
    });
  });

  it('resolves a send chip to a send action carrying its text', () => {
    expect(
      resolveQuickChipAction({ label: 'Analisa', action: 'send', text: 'Analisa keuanganku' })
    ).toEqual({ kind: 'send', text: 'Analisa keuanganku' });
  });
});

describe('QUICK_CHIPS', () => {
  it.each(['Catat pengeluaran', 'Catat pemasukan'])('auto-sends the "%s" command', (text) => {
    const chip = QUICK_CHIPS.find((c) => c.text === text);
    expect(chip?.action).toBe('send');
  });
});
