import React from 'react';
import { render } from '@testing-library/react-native';

import { ChatBubble } from '@/features/ai/components/ChatBubble';
import { createVoiceMessage } from '@/features/finance/utils/chatMessageUtils';
import type { ChatMessage } from '@/features/finance/utils/chatMessageUtils';
import type { ExtractedTransaction } from '@/features/finance/api/voice';

const item = (overrides: Partial<ExtractedTransaction> = {}): ExtractedTransaction => ({
  amount: -15000,
  currency: 'IDR',
  merchant: null,
  category_name: 'Makan',
  note: null,
  confidence: 0.9,
  ...overrides,
});

const completed = (extractedData: ExtractedTransaction[]): ChatMessage => ({
  ...createVoiceMessage('voice-1'),
  status: 'completed',
  extractedData,
});

describe('ChatBubble', () => {
  it('shows the formatted amount for a single extracted transaction', async () => {
    const { getByText } = await render(
      <ChatBubble message={completed([item({ amount: -15000 })])} />
    );
    expect(getByText(/15\.000/)).toBeTruthy();
  });

  it('shows an item-count summary for multiple extracted transactions', async () => {
    const { getByText, queryByText } = await render(
      <ChatBubble message={completed([item({ amount: -15000 }), item({ amount: -5000 })])} />
    );
    expect(getByText('2 transaksi terdeteksi')).toBeTruthy();
    expect(queryByText(/15\.000/)).toBeNull();
  });

  it('shows nothing extra when there is no extracted data', async () => {
    const { queryByText } = await render(
      <ChatBubble message={{ ...createVoiceMessage('voice-2'), status: 'completed' }} />
    );
    expect(queryByText(/transaksi terdeteksi/)).toBeNull();
  });
});
