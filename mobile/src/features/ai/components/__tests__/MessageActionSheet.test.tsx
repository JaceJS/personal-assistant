import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

import { MessageActionSheet } from '@/features/ai/components/MessageActionSheet';

describe('MessageActionSheet', () => {
  it('renders Copy and Delete actions', async () => {
    const { getByText } = await render(
      <MessageActionSheet isVisible onCopy={() => {}} onDelete={() => {}} onDismiss={() => {}} />,
    );

    expect(getByText('Salin')).toBeTruthy();
    expect(getByText('Hapus')).toBeTruthy();
  });

  it('fires onCopy when Salin is pressed', async () => {
    const onCopy = jest.fn();
    const { getByText } = await render(
      <MessageActionSheet isVisible onCopy={onCopy} onDelete={() => {}} onDismiss={() => {}} />,
    );

    fireEvent.press(getByText('Salin'));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('fires onDelete when Hapus is pressed', async () => {
    const onDelete = jest.fn();
    const { getByText } = await render(
      <MessageActionSheet isVisible onCopy={() => {}} onDelete={onDelete} onDismiss={() => {}} />,
    );

    fireEvent.press(getByText('Hapus'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
