import { useTranslation } from 'react-i18next'
import { Radio, ExternalLink, PanelRight } from 'lucide-react'
import { ThemeSelector } from '@components/ui/ThemeSelector'
import { useInvestigationStore } from '@store/investigation.store'
import { useContactsStore } from '@store/contacts.store'

export default function PopupApp() {
  const { t } = useTranslation()
  const investigations = useInvestigationStore((s) => s.investigations)
  const contacts = useContactsStore((s) => s.contacts)

  return (
    <div className="sef-popup p-4 bg-background text-foreground space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <div>
            <h1 className="text-sm font-bold">{t('app.name')}</h1>
            <p className="text-[10px] text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>
        <ThemeSelector />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-lg font-bold text-primary">{investigations.length}</p>
          <p className="text-[10px] text-muted-foreground">{t('dashboard.activeInvestigations')}</p>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-lg font-bold text-primary">{contacts.length}</p>
          <p className="text-[10px] text-muted-foreground">{t('dashboard.contactsDiscovered')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="flex-1 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition flex items-center justify-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {t('common.options')}
        </button>
        <button
          type="button"
          onClick={() => chrome.sidePanel?.open({ windowId: chrome.windows?.WINDOW_ID_CURRENT })}
          className="flex-1 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition flex items-center justify-center gap-1"
        >
          <PanelRight className="w-3 h-3" />
          {t('common.sidePanel')}
        </button>
      </div>
    </div>
  )
}
