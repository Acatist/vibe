import { Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '@store/language.store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { Button } from '@components/ui/button'

const LANGUAGES = [
  { code: 'en' as const, flag: '🇺🇸' },
  { code: 'es' as const, flag: '🇪🇸' },
]

export function Header() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageStore()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
      {/* Left — Logo + title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
          <Radio className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight text-foreground">{t('app.name')}</h1>
          <p className="text-[10px] leading-tight text-muted-foreground">{t('app.tagline')}</p>
        </div>
      </div>

      {/* Right — Language selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-base">
            {LANGUAGES.find((l) => l.code === language)?.flag ?? '🇺🇸'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-0">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="text-base justify-center px-3"
            >
              {lang.flag}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
