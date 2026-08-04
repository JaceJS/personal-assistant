import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DraftTransactionCard } from '@/features/ai/components/DraftTransactionCard';
import { createDraftMessages } from '@/features/finance/utils/chatMessageUtils';
import type { DraftMessage } from '@/features/finance/utils/chatMessageUtils';
import type { DraftTransaction } from '@/features/ai/api/chat';

const makeDraft = (overrides: Partial<DraftTransaction> = {}): DraftTransaction => ({
  transaction_id: 'tx-1',
  amount: -20000,
  currency: 'IDR',
  merchant: 'Sate',
  category_name: 'Makan',
  note: null,
  account_id: 'acc-1',
  status: 'draft',
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeMessage = (
  state: DraftMessage['state'] = 'pending',
  overrides: Partial<DraftTransaction> = {},
): DraftMessage => ({ ...createDraftMessages([makeDraft(overrides)])[0], state });

const noop = () => {};

describe('DraftTransactionCard', () => {
  it('shows category as the headline, formatted amount, and merchant', async () => {
    const { getByText } = await render(
      <DraftTransactionCard message={makeMessage()} onSave={noop} onEdit={noop} onCancel={noop} />,
    );
    expect(getByText('Makan')).toBeTruthy();
    expect(getByText(/20\.000/)).toBeTruthy();
    expect(getByText('Sate')).toBeTruthy();
  });

  it('falls back to a generic title when category is missing', async () => {
    const { getByText } = await render(
      <DraftTransactionCard
        message={makeMessage('pending', { category_name: null })}
        onSave={noop}
        onEdit={noop}
        onCancel={noop}
      />,
    );
    expect(getByText('Transaksi')).toBeTruthy();
  });

  it('omits the merchant line when merchant is missing', async () => {
    const { queryByText } = await render(
      <DraftTransactionCard
        message={makeMessage('pending', { merchant: null })}
        onSave={noop}
        onEdit={noop}
        onCancel={noop}
      />,
    );
    expect(queryByText('Sate')).toBeNull();
  });

  // Note: one fireEvent.press per test. Multiple presses in a single test leave
  // Pressable timers pending and blank out the next test's render.
  it('pending: Simpan fires onSave with the message', async () => {
    const onSave = jest.fn();
    const msg = makeMessage();
    const { getByText } = await render(
      <DraftTransactionCard message={msg} onSave={onSave} onEdit={noop} onCancel={noop} />,
    );
    fireEvent.press(getByText('Simpan'));
    expect(onSave).toHaveBeenCalledWith(msg);
  });

  it('pending: Edit fires onEdit with the message', async () => {
    const onEdit = jest.fn();
    const msg = makeMessage();
    const { getByText } = await render(
      <DraftTransactionCard message={msg} onSave={noop} onEdit={onEdit} onCancel={noop} />,
    );
    fireEvent.press(getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(msg);
  });

  it('pending: Batal fires onCancel with the message', async () => {
    const onCancel = jest.fn();
    const msg = makeMessage();
    const { getByText } = await render(
      <DraftTransactionCard message={msg} onSave={noop} onEdit={noop} onCancel={onCancel} />,
    );
    fireEvent.press(getByText('Batal'));
    expect(onCancel).toHaveBeenCalledWith(msg);
  });

  it('saving: hides action buttons', async () => {
    const { queryByText } = await render(
      <DraftTransactionCard
        message={makeMessage('saving')}
        onSave={noop}
        onEdit={noop}
        onCancel={noop}
      />,
    );
    expect(queryByText('Simpan')).toBeNull();
    expect(queryByText('Batal')).toBeNull();
  });

  it('saved: shows confirmation label, no buttons', async () => {
    const { getByText, queryByText } = await render(
      <DraftTransactionCard
        message={makeMessage('saved')}
        onSave={noop}
        onEdit={noop}
        onCancel={noop}
      />,
    );
    expect(getByText('Tersimpan')).toBeTruthy();
    expect(queryByText('Simpan')).toBeNull();
  });

  it('cancelled: shows cancelled label, no buttons', async () => {
    const { getByText, queryByText } = await render(
      <DraftTransactionCard
        message={makeMessage('cancelled')}
        onSave={noop}
        onEdit={noop}
        onCancel={noop}
      />,
    );
    expect(getByText('Dibatalkan')).toBeTruthy();
    expect(queryByText('Simpan')).toBeNull();
  });
});
