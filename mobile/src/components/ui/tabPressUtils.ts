import type { NavigationAction } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';

interface TabPressOptions {
  focused: boolean;
  routeName: string;
  routeState: { key?: string; index?: number } | undefined;
  navigate: (name: string) => void;
  dispatch: (action: NavigationAction) => void;
}

// Exported for testing. Resets nested stack to root when tab is already focused.
export function handleTabPress({ focused, routeName, routeState, navigate, dispatch }: TabPressOptions): void {
  if (focused && (routeState?.index ?? 0) > 0) {
    dispatch({ ...StackActions.popToTop(), target: routeState?.key });
  } else {
    navigate(routeName);
  }
}
