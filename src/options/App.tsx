import { useState } from 'react'
import { ThemeSelector } from '@components/ui/ThemeSelector'
import { EnergyBar } from '@components/ui/EnergyBar'
import { useSettingsStore } from '@store/settings.store'
import { useEnergy } from '@hooks/useEnergy'
import { THEME_DEFINITIONS } from '@core/config/theme.config'
import type { ProfileName } from '@core/types/extension.types'
import { SEF_VERSION } from '@core/constants/extension'

type Tab = 'profile' | 'theme' | 'energy' | 'stealth' | 'debug' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'theme', label: 'Theme' },
  { id: 'energy', label: 'Energy' },
  { id: 'stealth', label: 'Stealth' },
  { id: 'debug', label: 'Debug' },
  { id: 'about', label: 'About' },
]

const PROFILES: { value: ProfileName; label: string; description: string }[] = [
  { value: 'slow-user', label: 'Slow User', description: '20–40 WPM · High breaks · 12% typos' },
  {
    value: 'normal-user',
    label: 'Normal User',
    description: '55–80 WPM · Medium breaks · 5% typos',
  },
  { value: 'power-user', label: 'Power User', description: '90–130 WPM · Low breaks · 2% typos' },
]

export default function OptionsApp() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { profile, debugMode, setProfile, setDebugMode, setInfiniteEnergy, infiniteEnergy } =
    useSettingsStore()
  const { energy, reset: resetEnergy, refill, setInfinite } = useEnergy()

  return (
    <div className="sef-options min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SEF Options</h1>
            <p className="text-sm text-muted-foreground">
              Stealth Extension Framework v{SEF_VERSION}
            </p>
          </div>
          <ThemeSelector />
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main>
        {activeTab === 'profile' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Behavior Profile</h2>
            <p className="text-sm text-muted-foreground">
              Select how the stealth engine emulates human behavior. This affects cursor speed,
              typing pace, break frequency, and typo rate.
            </p>
            <div className="grid gap-3">
              {PROFILES.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    profile === p.value
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={p.value}
                    checked={profile === p.value}
                    onChange={() => setProfile(p.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'theme' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="text-sm text-muted-foreground">
              Choose from 6 Tweakcn-based themes. Each theme has separate light and dark modes.
            </p>
            <div className="flex items-center gap-4">
              <ThemeSelector />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {Object.values(THEME_DEFINITIONS).map((theme) => (
                <div key={theme.id} className="p-3 rounded-lg border border-border">
                  <div className="font-medium text-sm">{theme.name}</div>
                  <div className="text-xs text-muted-foreground">{theme.description}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'energy' && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold">Energy System</h2>
            <EnergyBar />
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <div className="font-medium text-sm">Infinite Energy</div>
                  <div className="text-xs text-muted-foreground">Skip all energy checks</div>
                </div>
                <input
                  type="checkbox"
                  checked={infiniteEnergy}
                  onChange={(e) => {
                    setInfiniteEnergy(e.target.checked)
                    setInfinite(e.target.checked)
                  }}
                  className="accent-primary w-4 h-4"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => refill(energy.max - energy.current)}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  Refill Energy
                </button>
                <button
                  type="button"
                  onClick={() => resetEnergy()}
                  className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'stealth' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Stealth Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Advanced stealth engine settings. Edit{' '}
              <code className="font-mono text-xs bg-muted px-1 rounded">
                src/config/stealth.config.ts
              </code>{' '}
              directly for full control.
            </p>
            <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Base cursor speed</span>
                <span className="font-mono text-foreground">0.8 px/ms</span>
                <span>Base WPM</span>
                <span className="font-mono text-foreground">65</span>
                <span>Min keystroke delay</span>
                <span className="font-mono text-foreground">30ms</span>
                <span>Max cursor jitter</span>
                <span className="font-mono text-foreground">4px</span>
                <span>Pre-click pause</span>
                <span className="font-mono text-foreground">80–250ms</span>
                <span>Thinking pause</span>
                <span className="font-mono text-foreground">400–1800ms</span>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'debug' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Debug Tools</h2>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <div className="font-medium text-sm">Debug Mode</div>
                <div className="text-xs text-muted-foreground">Enables verbose [SEF:*] logging</div>
              </div>
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <div className="font-medium">Storage State</div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs font-mono">
                <span>Energy:</span>
                <span>
                  {energy.current}/{energy.max}
                </span>
                <span>Profile:</span>
                <span>{profile}</span>
                <span>Debug:</span>
                <span>{debugMode ? 'on' : 'off'}</span>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'about' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">About SEF</h2>
            <div className="rounded-lg border border-border p-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  Stealth Extension Framework v{SEF_VERSION}
                </strong>
              </p>
              <p>Production-ready browser automation extension base template.</p>
              <p>Built with Vite + CRXJS + React 19 + TypeScript strict + TailwindCSS + Zustand.</p>
              <p className="pt-2 text-xs font-mono">
                Contexts: background SW · content script · popup · options · side panel
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
