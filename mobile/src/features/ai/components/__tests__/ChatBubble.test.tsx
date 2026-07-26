import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ChatBubble } from '@/features/ai/components/ChatBubble';
import {
  createReceiptMessage,
  createUploadingMessage,
  createVoiceMessage,
} from '@/features/finance/utils/chatMessageUtils';
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

  it('shows the photo thumbnail for a receipt message with a local URI', async () => {
    const message = createReceiptMessage('receipt-1', 'file:///tmp/receipt.jpg', 'acc-1');
    const { getByTestId } = await render(<ChatBubble message={message} />);
    expect(getByTestId('receipt-thumbnail').props.source.uri).toBe('file:///tmp/receipt.jpg');
  });

  it('does not show a thumbnail for a receipt message without a local URI', async () => {
    const message = createReceiptMessage('receipt-2');
    const { queryByTestId } = await render(<ChatBubble message={message} />);
    expect(queryByTestId('receipt-thumbnail')).toBeNull();
  });

  it('does not show a thumbnail for a voice message even with a local URI', async () => {
    const message = createVoiceMessage('voice-3', 'file:///tmp/audio.m4a', 'acc-1');
    const { queryByTestId } = await render(<ChatBubble message={message} />);
    expect(queryByTestId('receipt-thumbnail')).toBeNull();
  });

  it('falls back to the icon footer when the thumbnail fails to load', async () => {
    const message = createReceiptMessage('receipt-3', 'file:///tmp/broken.jpg', 'acc-1');
    const { getByTestId, queryByTestId } = await render(<ChatBubble message={message} />);
    await fireEvent(getByTestId('receipt-thumbnail'), 'error');
    expect(queryByTestId('receipt-thumbnail')).toBeNull();
  });

  it('shows the thumbnail immediately for a message still uploading, before any server id exists', async () => {
    const message = createUploadingMessage({
      id: 'local-1',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    const { getByTestId, getByText } = await render(<ChatBubble message={message} />);
    expect(getByTestId('receipt-thumbnail').props.source.uri).toBe('file:///tmp/r.jpg');
    expect(getByText('Mengirim...')).toBeTruthy();
  });

  it('dims the bubble while uploading ("belum terkirim")', async () => {
    const message = createUploadingMessage({
      id: 'local-1',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    const { getByTestId } = await render(<ChatBubble message={message} />);
    expect(getByTestId('chat-bubble').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: expect.any(Number) })])
    );
  });

  it('does not show the retry button while uploading', async () => {
    const message = createUploadingMessage({
      id: 'local-1',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    const onRetry = jest.fn();
    const { queryByText } = await render(<ChatBubble message={message} onRetry={onRetry} />);
    expect(queryByText('Coba lagi')).toBeNull();
  });

  it('shows a sent indicator (icon only) once the upload is acknowledged by the server', async () => {
    const message = createReceiptMessage('receipt-1', 'file:///tmp/r.jpg', 'acc-1');
    const { getByTestId, queryByTestId } = await render(<ChatBubble message={message} />);
    expect(getByTestId('status-icon-sent')).toBeTruthy();
    expect(queryByTestId('status-icon-failed')).toBeNull();
    expect(queryByTestId('status-icon-sending')).toBeNull();
  });

  it('shows a failed indicator (icon only) when the message failed', async () => {
    const message: ChatMessage = { ...createReceiptMessage('receipt-1'), status: 'failed' };
    const { getByTestId, queryByTestId } = await render(<ChatBubble message={message} />);
    expect(getByTestId('status-icon-failed')).toBeTruthy();
    expect(queryByTestId('status-icon-sent')).toBeNull();
  });

  it('shows a sending indicator (icon only) while uploading', async () => {
    const message = createUploadingMessage({
      id: 'local-1',
      type: 'receipt',
      localUri: 'file:///tmp/r.jpg',
      accountId: 'acc-1',
    });
    const { getByTestId, queryByTestId } = await render(<ChatBubble message={message} />);
    expect(getByTestId('status-icon-sending')).toBeTruthy();
    expect(queryByTestId('status-icon-sent')).toBeNull();
    expect(queryByTestId('status-icon-failed')).toBeNull();
  });
});
