import { useFont } from '@shopify/react-native-skia';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans';

export function useChartFont() {
  return useFont(PlusJakartaSans_400Regular, 10);
}
