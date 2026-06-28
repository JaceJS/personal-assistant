import React from 'react';
import Input from './Input';

interface RupiahInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

function formatDisplay(n: number): string {
  if (n === 0) return '';
  // Manual dot separator to avoid Node.js Intl/ICU locale dependency
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function RupiahInput({ value, onChange, ...rest }: RupiahInputProps) {
  function handleChangeText(raw: string) {
    const digits = raw.replace(/\D/g, '');
    onChange(digits ? Number(digits) : 0);
  }

  return (
    <Input
      keyboardType="numeric"
      value={formatDisplay(value)}
      onChangeText={handleChangeText}
      {...rest}
    />
  );
}

export default React.memo(RupiahInput);
