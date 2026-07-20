import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MessageActionMenu } from '@/features/ai/components/MessageActionMenu';

describe('MessageActionMenu', () => {
  it('renders Copy and Delete actions near the long-press point', async () => {
    const { getByText } = await render(
      <MessageActionMenu
        visible
        x={100}
        y={200}
        onCopy={() => {}}
        onDelete={() => {}}
        onDismiss={() => {}}
      />,
    );

    expect(getByText('Salin')).toBeTruthy();
    expect(getByText('Hapus')).toBeTruthy();
  });

  it('renders nothing when not visible', async () => {
    const { queryByText } = await render(
      <MessageActionMenu
        visible={false}
        x={100}
        y={200}
        onCopy={() => {}}
        onDelete={() => {}}
        onDismiss={() => {}}
      />,
    );

    expect(queryByText('Salin')).toBeNull();
  });

  it('fires onCopy when Salin is pressed', async () => {
    const onCopy = jest.fn();
    const { getByText } = await render(
      <MessageActionMenu
        visible
        x={100}
        y={200}
        onCopy={onCopy}
        onDelete={() => {}}
        onDismiss={() => {}}
      />,
    );

    fireEvent.press(getByText('Salin'));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('fires onDelete when Hapus is pressed', async () => {
    const onDelete = jest.fn();
    const { getByText } = await render(
      <MessageActionMenu
        visible
        x={100}
        y={200}
        onCopy={() => {}}
        onDelete={onDelete}
        onDismiss={() => {}}
      />,
    );

    fireEvent.press(getByText('Hapus'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss when the backdrop is pressed', async () => {
    const onDismiss = jest.fn();
    const { getByTestId } = await render(
      <MessageActionMenu
        visible
        x={100}
        y={200}
        onCopy={() => {}}
        onDelete={() => {}}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByTestId('message-action-menu-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
