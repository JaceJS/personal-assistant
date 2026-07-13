import React from 'react';
import { useTranslation } from 'react-i18next';
import Input from './Input';
import { SUPPORTED_LANGUAGES } from '@/i18n/registry';

interface RupiahInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

function formatDisplay(n: number, groupingSeparator: string): string {
  if (n === 0) return '';
  // Manual grouping (not Intl.NumberFormat) to avoid an ICU/locale-data
  // dependency on this hot typing path; the separator itself is locale-aware.
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator);
}

function RupiahInput({ value, onChange, ...rest }: RupiahInputProps) {
  const { i18n } = useTranslation();
  const groupingSeparator =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language)?.groupingSeparator ?? '.';

  function handleChangeText(raw: string) {
    const digits = raw.replace(/\D/g, '');
    onChange(digits ? Number(digits) : 0);
  }

  return (
    <Input
      keyboardType="numeric"
      value={formatDisplay(value, groupingSeparator)}
      onChangeText={handleChangeText}
      {...rest}
    />
  );
}

export default React.memo(RupiahInput);
