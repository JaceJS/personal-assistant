import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  it('exposes accessibilityRole="button" and a label matching the visible text', async () => {
    const { getByRole } = await render(<Button label="Simpan" onPress={jest.fn()} />);
    const btn = getByRole('button', { name: 'Simpan' });
    expect(btn).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="Simpan" onPress={onPress} />);
    fireEvent.press(getByRole('button', { name: 'Simpan' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes accessibilityState.disabled when disabled', async () => {
    const { getByRole } = await render(
      <Button label="Simpan" onPress={jest.fn()} disabled />,
    );
    const btn = getByRole('button', { name: 'Simpan' });
    expect(btn.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('exposes accessibilityState.busy when loading', async () => {
    const { getByRole } = await render(
      <Button label="Simpan" onPress={jest.fn()} loading />,
    );
    const btn = getByRole('button', { name: 'Simpan' });
    expect(btn.props.accessibilityState).toMatchObject({ busy: true });
  });
});
