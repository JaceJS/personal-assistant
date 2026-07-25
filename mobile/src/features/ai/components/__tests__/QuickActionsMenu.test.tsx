import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { QuickActionsMenu } from '@/features/ai/components/QuickActionsMenu';
import type { QuickChip } from '@/features/ai/utils/quickChips';

const chips: QuickChip[] = [
  { id: 'logExpense', labelKey: 'ai.quickChips.logExpense.label', action: 'send', text: 'Catat pengeluaran' },
  { id: 'scanReceipt', labelKey: 'ai.quickChips.scanReceipt.label', action: 'camera' },
];

describe('QuickActionsMenu', () => {
  it('renders only the trigger when collapsed', async () => {
    const { getByTestId, queryByText } = await render(
      <QuickActionsMenu chips={chips} visible={false} onToggle={() => {}} onSelect={() => {}} />
    );

    expect(getByTestId('quick-actions-trigger')).toBeTruthy();
    expect(queryByText('📝 Catat pengeluaran')).toBeNull();
  });

  it('renders every chip label when expanded', async () => {
    const { getByText } = await render(
      <QuickActionsMenu chips={chips} visible onToggle={() => {}} onSelect={() => {}} />
    );

    expect(getByText('📝 Catat pengeluaran')).toBeTruthy();
    expect(getByText('📷 Scan struk')).toBeTruthy();
  });

  it('calls onToggle when the trigger is pressed', async () => {
    const onToggle = jest.fn();
    const { getByTestId } = await render(
      <QuickActionsMenu chips={chips} visible={false} onToggle={onToggle} onSelect={() => {}} />
    );

    fireEvent.press(getByTestId('quick-actions-trigger'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the chip when a row is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <QuickActionsMenu chips={chips} visible onToggle={() => {}} onSelect={onSelect} />
    );

    fireEvent.press(getByText('📝 Catat pengeluaran'));
    expect(onSelect).toHaveBeenCalledWith(chips[0]);
  });

  it('calls onToggle when the backdrop is pressed', async () => {
    const onToggle = jest.fn();
    const { getByTestId } = await render(
      <QuickActionsMenu chips={chips} visible onToggle={onToggle} onSelect={() => {}} />
    );

    fireEvent.press(getByTestId('quick-actions-backdrop'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders no backdrop or rows when collapsed', async () => {
    const { queryByTestId } = await render(
      <QuickActionsMenu chips={chips} visible={false} onToggle={() => {}} onSelect={() => {}} />
    );

    expect(queryByTestId('quick-actions-backdrop')).toBeNull();
  });

  it('shows a spinner on the busy chip instead of its icon', async () => {
    const { getByTestId } = await render(
      <QuickActionsMenu
        chips={chips}
        visible
        onToggle={() => {}}
        onSelect={() => {}}
        busyChipId="scanReceipt"
      />
    );

    expect(getByTestId('quick-action-busy-scanReceipt')).toBeTruthy();
  });

  it('does not fire onSelect when the busy chip is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <QuickActionsMenu
        chips={chips}
        visible
        onToggle={() => {}}
        onSelect={onSelect}
        busyChipId="scanReceipt"
      />
    );

    fireEvent.press(getByText('📷 Scan struk'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still fires onSelect for other chips while one chip is busy', async () => {
    const onSelect = jest.fn();
    const { getByText } = await render(
      <QuickActionsMenu
        chips={chips}
        visible
        onToggle={() => {}}
        onSelect={onSelect}
        busyChipId="scanReceipt"
      />
    );

    fireEvent.press(getByText('📝 Catat pengeluaran'));
    expect(onSelect).toHaveBeenCalledWith(chips[0]);
  });

  it('does not show a spinner on any chip when busyChipId is undefined', async () => {
    const { queryByTestId } = await render(
      <QuickActionsMenu chips={chips} visible onToggle={() => {}} onSelect={() => {}} />
    );

    expect(queryByTestId('quick-action-busy-scanReceipt')).toBeNull();
  });
});
