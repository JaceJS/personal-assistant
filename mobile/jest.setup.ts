import "@testing-library/jest-native/extend-expect";

// Without this, AsyncStorage mocking is order-dependent: it only works if some
// other test file happens to touch the native module first in the same Jest
// worker. That makes suites fail/pass based on worker scheduling (e.g. under
// `--ci` or `CI=true`, which changes default worker count) rather than on
// actual code correctness.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// react-native-keyboard-controller wraps a native module — its own jest mock
// (docs: recipes/jest-testing-guide) stands in for that native binding.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest")
);

// @react-native-community/netinfo wraps a native module — its own jest mock
// stands in for that native binding, same rationale as AsyncStorage above.
jest.mock("@react-native-community/netinfo", () =>
  jest.requireActual("@react-native-community/netinfo/jest/netinfo-mock")
);

// Import for its side effect: initializes the shared i18next singleton so
// every test (including ones that never touch i18n directly, but render a
// component using useTranslation()) sees deterministic Indonesian copy.
import "./src/i18n";
