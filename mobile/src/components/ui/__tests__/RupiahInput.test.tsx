import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RupiahInput from '../RupiahInput';

describe('RupiahInput', () => {
  it('renders empty when value is 0', async () => {
    const { getByPlaceholderText } = await render(
      <RupiahInput value={0} onChange={jest.fn()} placeholder="jumlah" />,
    );
    expect(getByPlaceholderText('jumlah').props.value).toBe('');
  });

  it('formats 10000 as "10.000"', async () => {
    const { getByPlaceholderText } = await render(
      <RupiahInput value={10000} onChange={jest.fn()} placeholder="jumlah" />,
    );
    expect(getByPlaceholderText('jumlah').props.value).toBe('10.000');
  });

  it('formats 10000000 as "10.000.000"', async () => {
    const { getByPlaceholderText } = await render(
      <RupiahInput value={10000000} onChange={jest.fn()} placeholder="jumlah" />,
    );
    expect(getByPlaceholderText('jumlah').props.value).toBe('10.000.000');
  });

  it('calls onChange with numeric value when user types digits', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <RupiahInput value={0} onChange={onChange} placeholder="jumlah" />,
    );
    fireEvent.changeText(getByPlaceholderText('jumlah'), '50000');
    expect(onChange).toHaveBeenCalledWith(50000);
  });

  it('strips non-digit characters and calls onChange(0) for empty result', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <RupiahInput value={0} onChange={onChange} placeholder="jumlah" />,
    );
    fireEvent.changeText(getByPlaceholderText('jumlah'), 'abc');
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('renders formatted string when initialized from a quick-chip value', async () => {
    const { getByPlaceholderText } = await render(
      <RupiahInput value={50000} onChange={jest.fn()} placeholder="jumlah" />,
    );
    expect(getByPlaceholderText('jumlah').props.value).toBe('50.000');
  });

  it('shows label when provided', async () => {
    const { getByText } = await render(
      <RupiahInput value={0} onChange={jest.fn()} label="Jumlah (Rupiah)" />,
    );
    expect(getByText('Jumlah (Rupiah)')).toBeTruthy();
  });

  it('shows error when provided', async () => {
    const { getByText } = await render(
      <RupiahInput value={0} onChange={jest.fn()} error="Jumlah tidak valid" />,
    );
    expect(getByText('Jumlah tidak valid')).toBeTruthy();
  });
});
