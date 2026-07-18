import "@testing-library/jest-native/extend-expect";

// Without this, AsyncStorage mocking is order-dependent: it only works if some
// other test file happens to touch the native module first in the same Jest
// worker. That makes suites fail/pass based on worker scheduling (e.g. under
// `--ci` or `CI=true`, which changes default worker count) rather than on
// actual code correctness.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Import for its side effect: initializes the shared i18next singleton so
// every test (including ones that never touch i18n directly, but render a
// component using useTranslation()) sees deterministic Indonesian copy.
import "./src/i18n";
