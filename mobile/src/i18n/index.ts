import "intl-pluralrules";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./registry";

const resources = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, { translation: lang.resource }])
);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  initImmediate: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
