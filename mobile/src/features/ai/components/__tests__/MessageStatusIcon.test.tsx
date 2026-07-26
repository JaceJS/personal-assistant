import React from 'react';
import { render } from '@testing-library/react-native';

import { MessageStatusIcon } from '@/features/ai/components/MessageStatusIcon';

describe('MessageStatusIcon', () => {
  it('renders only the sending icon for status="sending"', async () => {
    const { getByTestId, queryByTestId, queryByText } = await render(
      <MessageStatusIcon status="sending" />
    );
    expect(getByTestId('status-icon-sending')).toBeTruthy();
    expect(queryByTestId('status-icon-sent')).toBeNull();
    expect(queryByTestId('status-icon-failed')).toBeNull();
    expect(queryByText(/./)).toBeNull();
  });

  it('renders only the sent icon for status="sent"', async () => {
    const { getByTestId, queryByTestId } = await render(<MessageStatusIcon status="sent" />);
    expect(getByTestId('status-icon-sent')).toBeTruthy();
    expect(queryByTestId('status-icon-sending')).toBeNull();
    expect(queryByTestId('status-icon-failed')).toBeNull();
  });

  it('renders only the failed icon for status="failed"', async () => {
    const { getByTestId, queryByTestId } = await render(<MessageStatusIcon status="failed" />);
    expect(getByTestId('status-icon-failed')).toBeTruthy();
    expect(queryByTestId('status-icon-sending')).toBeNull();
    expect(queryByTestId('status-icon-sent')).toBeNull();
  });
});
