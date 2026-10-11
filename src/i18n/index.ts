import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import es from "./locales/es.json";

const saved =
  typeof localStorage !== "undefined" ? localStorage.getItem("bookocr.lang") : null;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
    es: { translation: es },
  },
  lng: saved ?? "fr",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

export const languages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Español" },
] as const;
