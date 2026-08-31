import { Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useTheme } from "@/features/preferences/theme-context"
import type { SupportedLocale } from "@/i18n"
import brazilFlag from "flag-icons/flags/4x3/br.svg"
import unitedStatesFlag from "flag-icons/flags/4x3/us.svg"

const languages = [
  { locale: "en-US", flag: unitedStatesFlag, shortLabel: "EN", translationKey: "preferences.englishUS" },
  { locale: "pt-BR", flag: brazilFlag, shortLabel: "PT", translationKey: "preferences.portugueseBR" },
] as const

function LanguageFlag({ src }: { src: string }) {
  return <img src={src} className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm ring-1 ring-foreground/10" alt="" aria-hidden="true" />
}

export function PreferencesControls({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const locale: SupportedLocale = i18n.resolvedLanguage === "pt-BR" ? "pt-BR" : "en-US"
  const currentLanguage = languages.find((language) => language.locale === locale) ?? languages[0]
  const languageLabel = t("preferences.selectLanguage")
  const themeLabel = theme === "dark" ? t("preferences.enableLight") : t("preferences.enableDark")

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
        {theme === "dark" ? <Sun /> : <Moon />}
      </Button>
      <Select value={locale} onValueChange={(value) => {
        if (value === "en-US" || value === "pt-BR") void i18n.changeLanguage(value)
      }}>
        <SelectTrigger
          size="sm"
          className={compact ? "h-9 rounded-[10px] border-0 px-2 font-mono text-[10px] font-bold" : "h-9 rounded-[10px] border-0 px-2 text-xs font-semibold"}
          aria-label={languageLabel}
          title={languageLabel}
        >
          <LanguageFlag src={currentLanguage.flag} />
          <span>{compact ? currentLanguage.shortLabel : t(currentLanguage.translationKey)}</span>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-52 rounded-[10px]">
          {languages.map((language) => (
            <SelectItem key={language.locale} value={language.locale} className="min-h-[34px] rounded-[8.5px]">
              <LanguageFlag src={language.flag} />
              <span>{t(language.translationKey)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
