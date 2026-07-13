export type QuickChipAction = 'send' | 'camera';

// Literal union (not `string`) so t(chip.labelKey) stays type-checked against
// the keys generated from src/i18n/locales — see src/i18n/types.ts.
export type QuickChipLabelKey =
  | 'ai.quickChips.logExpense.label'
  | 'ai.quickChips.scanReceipt.label'
  | 'ai.quickChips.logIncome.label'
  | 'ai.quickChips.analyze.label';

export type QuickChip = {
  id: string;
  labelKey: QuickChipLabelKey;
  action: QuickChipAction;
  // Literal message sent to the AI chat as if the user had typed it. Stays
  // Indonesian regardless of UI language — the AI backend (prompts, slang
  // map) is Indonesian-only for now; translating AI I/O is a separate,
  // later phase (see docs/PRD.md §2.5). Only the visible chip `labelKey`
  // follows the UI language.
  text?: string;
};

export type ResolvedChipAction = { kind: 'camera' } | { kind: 'send'; text: string };

export function resolveQuickChipAction(chip: QuickChip): ResolvedChipAction {
  if (chip.action === 'camera') return { kind: 'camera' };
  return { kind: 'send', text: chip.text ?? '' };
}

export const QUICK_CHIPS: QuickChip[] = [
  {
    id: 'logExpense',
    labelKey: 'ai.quickChips.logExpense.label',
    action: 'send',
    text: 'Catat pengeluaran',
  },
  { id: 'scanReceipt', labelKey: 'ai.quickChips.scanReceipt.label', action: 'camera' },
  {
    id: 'logIncome',
    labelKey: 'ai.quickChips.logIncome.label',
    action: 'send',
    text: 'Catat pemasukan',
  },
  {
    id: 'analyze',
    labelKey: 'ai.quickChips.analyze.label',
    action: 'send',
    text: 'Analisa pengeluaran dan keuanganku bulan ini',
  },
];
