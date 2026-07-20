import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Gate } from '@/components/ui/Gate';

describe('Gate', () => {
  it('renders the title, subtitle, and CTA label', async () => {
    const { getByText } = await render(
      <Gate
        icon={<Text>icon</Text>}
        title="Belum ada akun"
        subtitle="Buat akun dulu sebelum lanjut."
        ctaLabel="Buat Akun"
        onCtaPress={() => {}}
      />,
    );

    expect(getByText('Belum ada akun')).toBeTruthy();
    expect(getByText('Buat akun dulu sebelum lanjut.')).toBeTruthy();
    expect(getByText('Buat Akun')).toBeTruthy();
  });

  it('fires onCtaPress when the CTA is pressed', async () => {
    const onCtaPress = jest.fn();
    const { getByText } = await render(
      <Gate
        icon={<Text>icon</Text>}
        title="title"
        subtitle="subtitle"
        ctaLabel="Go"
        onCtaPress={onCtaPress}
      />,
    );

    fireEvent.press(getByText('Go'));
    expect(onCtaPress).toHaveBeenCalledTimes(1);
  });
});
