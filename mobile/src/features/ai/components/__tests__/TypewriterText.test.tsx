import React from 'react';
import { act, render } from '@testing-library/react-native';

import { TypewriterText } from '@/features/ai/components/TypewriterText';

describe('TypewriterText', () => {
  it('shows the full text immediately when animate is false', async () => {
    const { getByText } = await render(<TypewriterText text="Halo juga!" animate={false} />);
    expect(getByText('Halo juga!')).toBeTruthy();
  });

  it('reveals text progressively by default', async () => {
    jest.useFakeTimers();
    const { getByText, queryByText } = await render(<TypewriterText text="Halo" speed={15} />);

    expect(queryByText('Halo')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(15 * 4);
    });
    expect(getByText('Halo')).toBeTruthy();

    jest.useRealTimers();
  });
});
