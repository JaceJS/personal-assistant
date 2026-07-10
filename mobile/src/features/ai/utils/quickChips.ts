export type QuickChipAction = 'send' | 'camera';

export type QuickChip = {
  label: string;
  action: QuickChipAction;
  text?: string;
};

export type ResolvedChipAction = { kind: 'camera' } | { kind: 'send'; text: string };

export function resolveQuickChipAction(chip: QuickChip): ResolvedChipAction {
  if (chip.action === 'camera') return { kind: 'camera' };
  return { kind: 'send', text: chip.text ?? '' };
}

export const QUICK_CHIPS: QuickChip[] = [
  { label: '📝 Catat pengeluaran', action: 'send', text: 'Catat pengeluaran' },
  { label: '📷 Scan struk', action: 'camera' },
  { label: '💰 Catat pemasukan', action: 'send', text: 'Catat pemasukan' },
  {
    label: '💡 Analisa keuanganku',
    action: 'send',
    text: 'Analisa pengeluaran dan keuanganku bulan ini',
  },
];
