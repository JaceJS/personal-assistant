import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { TFunction } from 'i18next';

jest.mock('@/features/ai/api/chat', () => ({ confirmAiDraft: jest.fn() }));
jest.mock('@/features/finance/api/transactions', () => ({ updateTransaction: jest.fn() }));
jest.mock('@/features/finance/repository', () => ({
  useFinanceRepository: () => ({ createTransaction: jest.fn() }),
}));
jest.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { isGuest: boolean }) => unknown) => selector({ isGuest: false }),
}));

import { confirmAiDraft } from '@/features/ai/api/chat';
import { updateTransaction } from '@/features/finance/api/transactions';
import { useDraftActions } from '@/features/ai/hooks/useDraftActions';
import { createDraftMessages } from '@/features/finance/utils/chatMessageUtils';
import type { DraftMessage, Message } from '@/features/finance/utils/chatMessageUtils';
import type { DraftTransaction } from '@/features/ai/api/chat';
import type { Category } from '@/features/finance/types';

const mockConfirm = confirmAiDraft as jest.MockedFunction<typeof confirmAiDraft>;
const mockUpdateTransaction = updateTransaction as jest.MockedFunction<typeof updateTransaction>;

const t = ((key: string) => key) as unknown as TFunction;

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

const categories = [
  { id: 'cat-1', name: 'Makan', icon: 'utensils', color: '#000', type: 'expense' },
] as unknown as Category[];

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

async function makeHook(showToast = jest.fn()) {
  const setMessages = jest.fn();
  const { result } = await renderHook(
    () => useDraftActions({ setMessages, categories, showToast, t }),
    { wrapper: makeWrapper() }
  );
  return { result, setMessages, showToast };
}

describe('useDraftActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('handleDraftEdit opens the draft and exposes it as editingDraftData', async () => {
    const { result } = await makeHook();
    const msg = createDraftMessages([makeDraft()])[0];

    await act(async () => result.current.handleDraftEdit(msg));

    expect(result.current.editingDraft).toBe(msg);
    expect(result.current.editingDraftData).toMatchObject({
      amount: -20000,
      merchant: 'Sate',
      category_name: 'Makan',
    });
  });

  it('editingDraftData is null when nothing is being edited', async () => {
    const { result } = await makeHook();
    expect(result.current.editingDraftData).toBeNull();
  });

  it('dismissDraftEdit clears the editing draft', async () => {
    const { result } = await makeHook();
    const msg = createDraftMessages([makeDraft()])[0];
    await act(async () => result.current.handleDraftEdit(msg));

    await act(async () => result.current.dismissDraftEdit());

    expect(result.current.editingDraft).toBeNull();
  });

  it('handleDraftSave resolves the category name to an id and confirms the mutation', async () => {
    mockConfirm.mockResolvedValueOnce(undefined as never);
    const { result, setMessages } = await makeHook();
    const msg = createDraftMessages([makeDraft()])[0];

    await act(async () => result.current.handleDraftSave(msg));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());

    expect(mockConfirm).toHaveBeenCalledWith('tx-1', {
      amount: -20000,
      account_id: 'acc-1',
      category_id: 'cat-1',
      merchant: 'Sate',
      note: null,
    });
    // once for "saving", once for "saved"
    expect(setMessages).toHaveBeenCalledTimes(2);
  });

  it('handleDraftSave reverts to pending and toasts on failure', async () => {
    mockConfirm.mockRejectedValueOnce(new Error('boom'));
    const showToast = jest.fn();
    const { result } = await makeHook(showToast);
    const msg = createDraftMessages([makeDraft()])[0];

    await act(async () => result.current.handleDraftSave(msg));
    await waitFor(() => expect(showToast).toHaveBeenCalled());

    expect(showToast).toHaveBeenCalledWith('ai.toast.transactionSaveFailed', 'error');
  });

  it('handleEditingDraftSave merges the payload into the message before confirming', async () => {
    mockConfirm.mockResolvedValueOnce(undefined as never);
    const { result, setMessages } = await makeHook();
    const msg = createDraftMessages([makeDraft()])[0];
    await act(async () => result.current.handleDraftEdit(msg));

    await act(async () =>
      result.current.handleEditingDraftSave({
        amount: -9999,
        accountId: 'acc-2',
        categoryId: 'cat-1',
        merchant: 'Warkop',
        note: 'edited',
      })
    );

    expect(mockConfirm).toHaveBeenCalledWith('tx-1', {
      amount: -9999,
      account_id: 'acc-2',
      category_id: 'cat-1',
      merchant: 'Warkop',
      note: 'edited',
    });
    // the first setMessages call applies the edit + "saving" state
    const updater = setMessages.mock.calls[0][0] as (prev: Message[]) => Message[];
    const [updated] = updater([msg]) as DraftMessage[];
    expect(updated.draft.amount).toBe(-9999);
    expect(updated.draft.merchant).toBe('Warkop');
    expect(updated.state).toBe('saving');
    expect(result.current.editingDraft).toBeNull();
  });

  it('handleDraftCancel cancels via the API and marks the draft cancelled', async () => {
    mockUpdateTransaction.mockResolvedValueOnce(undefined as never);
    const { result, setMessages } = await makeHook();
    const msg = createDraftMessages([makeDraft()])[0];

    await act(async () => result.current.handleDraftCancel(msg));
    await waitFor(() => expect(mockUpdateTransaction).toHaveBeenCalled());

    expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', { status: 'cancelled' });
    expect(setMessages).toHaveBeenCalledTimes(2);
  });

  it('isSavingDraft reflects the confirm mutation pending state', async () => {
    const { result } = await makeHook();
    expect(result.current.isSavingDraft).toBe(false);
  });
});
