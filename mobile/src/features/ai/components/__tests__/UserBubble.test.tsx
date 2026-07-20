import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { UserBubble } from '@/features/ai/components/UserBubble';
import { createUserTextMessage } from '@/features/finance/utils/chatMessageUtils';

describe('UserBubble', () => {
  it('renders the message content', async () => {
    const message = createUserTextMessage('sate 20.000');
    const { getByText } = await render(<UserBubble message={message} />);
    expect(getByText('sate 20.000')).toBeTruthy();
  });

  it('fires onLongPress with the message when long-pressed', async () => {
    const onLongPress = jest.fn();
    const message = createUserTextMessage('sate 20.000');
    const { getByTestId } = await render(
      <UserBubble message={message} onLongPress={onLongPress} />,
    );
    fireEvent(getByTestId('user-bubble'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(message);
  });

  it('does not throw when onLongPress is not provided', async () => {
    const message = createUserTextMessage('sate 20.000');
    const { getByTestId } = await render(<UserBubble message={message} />);
    expect(() => fireEvent(getByTestId('user-bubble'), 'longPress')).not.toThrow();
  });
});
