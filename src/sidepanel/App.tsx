import { ThemeSelector } from '@components/ui/ThemeSelector'
import { EnergyBar } from '@components/ui/EnergyBar'
import { useSession } from '@hooks/useSession'
import { useSettingsStore } from '@store/settings.store'
import { SEF_VERSION } from '@core/constants/extension'
import { PROFILES } from '@profiles/index'

export default function SidePanelApp() {
  const { session } = useSession()
  const { profile } = useSettingsStore()
  const currentProfile = PROFILES[profile]

  return (
    <div className="sef-sidepanel p-4 bg-background text-foreground space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">SEF</h1>
          <p className="text-xs text-muted-foreground">
            Stealth Extension Framework v{SEF_VERSION}
          </p>
        </div>
        <ThemeSelector />
      </div>

      {/* Energy */}
      <EnergyBar />

      {/* Active Profile */}
      <div className="rounded-lg border border-border p-3 space-y-2">
        <div className="text-sm font-medium">Active Profile</div>
        <div className="text-xs space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>Name</span>
            <span className="text-foreground font-mono capitalize">{profile}</span>
          </div>
          <div className="flex justify-between">
            <span>WPM Range</span>
            <span className="text-foreground font-mono">
              {currentProfile.wpmRange[0]}–{currentProfile.wpmRange[1]}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Typo Rate</span>
            <span className="text-foreground font-mono">
              {(currentProfile.typoRate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cursor Speed</span>
            <span className="text-foreground font-mono">
              {currentProfile.cursorSpeedMultiplier}x
            </span>
          </div>
        </div>
      </div>

      {/* Session */}
      <div className="rounded-lg border border-border p-3 space-y-2 text-xs">
        <div className="text-sm font-medium">Session</div>
        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
          <span>Status</span>
          <span className={session.isActive ? 'text-primary font-medium' : ''}>
            {session.isActive ? 'Active' : 'Idle'}
          </span>
          <span>Duration</span>
          <span className="font-mono text-foreground">
            {session.isActive ? `${Math.floor((Date.now() - session.startTime) / 60000)}m` : '—'}
          </span>
          <span>Breaks</span>
          <span className="font-mono text-foreground">{session.breakCount}</span>
          <span>Fatigue</span>
          <span className={session.isFatigued ? 'text-destructive' : 'text-foreground'}>
            {session.isFatigued ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Options link */}
      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        className="w-full py-2 text-sm rounded-md border border-border hover:bg-muted transition"
      >
        Open Options
      </button>
    </div>
  )
}
