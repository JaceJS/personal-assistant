import "@testing-library/jest-native/extend-expect";

// Import for its side effect: initializes the shared i18next singleton so
// every test (including ones that never touch i18n directly, but render a
// component using useTranslation()) sees deterministic Indonesian copy.
import "./src/i18n";
