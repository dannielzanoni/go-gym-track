import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { resources } from "@/i18n/resources"

export const supportedLocales = ["en-US", "pt-BR"] as const
export type SupportedLocale = (typeof supportedLocales)[number]

const languageStorageKey = "gymtrack_language"
const storedLanguage = window.localStorage.getItem(languageStorageKey)
const initialLanguage: SupportedLocale = supportedLocales.includes(storedLanguage as SupportedLocale)
  ? storedLanguage as SupportedLocale
  : "en-US"

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en-US",
    supportedLngs: supportedLocales,
    load: "currentOnly",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

i18n.on("languageChanged", (language) => {
  const locale = supportedLocales.includes(language as SupportedLocale) ? language : "en-US"
  window.localStorage.setItem(languageStorageKey, locale)
  document.documentElement.lang = locale
})

document.documentElement.lang = initialLanguage

export default i18n
