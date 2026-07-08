import React from 'react';
import { render } from '@testing-library/react-native';
import Input from '../Input';

describe('Input', () => {
  it('uses the label prop as the accessible name', async () => {
    const { getByLabelText } = await render(
      <Input label="Nama Goal" value="" onChangeText={jest.fn()} />,
    );
    expect(getByLabelText('Nama Goal')).toBeTruthy();
  });

  it('falls back to placeholder as accessible name when no label is given', async () => {
    const { getByLabelText } = await render(
      <Input placeholder="Tiket konser, Liburan..." value="" onChangeText={jest.fn()} />,
    );
    expect(getByLabelText('Tiket konser, Liburan...')).toBeTruthy();
  });

  it('lets an explicit accessibilityLabel override the default', async () => {
    const { getByLabelText } = await render(
      <Input
        label="Nama Goal"
        accessibilityLabel="Custom label"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(getByLabelText('Custom label')).toBeTruthy();
  });
});
