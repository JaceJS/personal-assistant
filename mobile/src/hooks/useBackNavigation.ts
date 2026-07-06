import { useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';

import { DEFAULT_BACK_FALLBACK, resolveBackAction } from './backNavigationUtils';

export function useBackNavigation(fallback: Href = DEFAULT_BACK_FALLBACK as Href) {
  const router = useRouter();
  return useCallback(() => {
    const action = resolveBackAction(router.canGoBack(), fallback as string);
    if (action.type === 'back') router.back();
    else router.replace(action.href as Href);
  }, [router, fallback]);
}
