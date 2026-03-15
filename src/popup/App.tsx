import { ThemeSelector } from '@components/ui/ThemeSelector'
import { EnergyBar } from '@components/ui/EnergyBar'
import { useSession } from '@hooks/useSession'
import { useSettingsStore } from '@store/settings.store'
import { SEF_VERSION } from '@core/constants/extension'

export default function PopupApp() {
  const { session } = useSession()
  const { profile } = useSettingsStore()

  return (
    <div className="sef-popup p-4 bg-background text-foreground space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">SEF</h1>
          <p className="text-xs text-muted-foreground">v{SEF_VERSION}</p>
        </div>
        <ThemeSelector />
      </div>

      {/* Energy */}
      <EnergyBar />

      {/* Session Status */}
      <div className="rounded-lg border border-border p-3 space-y-2 text-xs">
        <div className="font-medium text-sm">Session</div>
        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
          <span>Status</span>
          <span className={session.isActive ? 'text-primary' : 'text-muted-foreground'}>
            {session.isActive ? 'Active' : 'Idle'}
          </span>
          <span>Profile</span>
          <span className="font-mono text-foreground capitalize">{profile}</span>
          <span>Breaks</span>
          <span className="font-mono text-foreground">{session.breakCount}</span>
          <span>Fatigued</span>
          <span className={session.isFatigued ? 'text-destructive' : 'text-foreground'}>
            {session.isFatigued ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="flex-1 py-1.5 text-xs rounded-md border border-border hover:bg-muted transition"
        >
          Options
        </button>
        <button
          type="button"
          onClick={() => chrome.sidePanel?.open({ windowId: chrome.windows?.WINDOW_ID_CURRENT })}
          className="flex-1 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          Side Panel
        </button>
      </div>
    </div>
  )
}
