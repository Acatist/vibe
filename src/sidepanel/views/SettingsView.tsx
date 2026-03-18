import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Check,
  Palette,
  FolderDown,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Bot,
  Building2,
  Upload,
  Folder,
  AlertTriangle,
  Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Switch } from '@components/ui/switch'
import { Separator } from '@components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import {
  useAIStore,
  AVAILABLE_MODELS,
  PROVIDER_LABELS,
  PROVIDER_ICONS,
  DEFAULT_MODELS,
} from '@store/ai.store'
import { useSettingsStore } from '@store/settings.store'
import { useBusinessStore } from '@store/business.store'
import { useRuntimeStore } from '@store/runtime.store'
import { useTheme } from '@hooks/useTheme'
import { THEME_DEFINITIONS, THEME_IDS } from '@core/config/theme.config'
import { testAIConnection } from '@services/ai.service'
import type { AIProviderType } from '@core/types/ai.types'
import type { ThemeId } from '@core/types/extension.types'
import type { RuntimeMode } from '@core/types/runtime.types'
import type { TabId } from '@components/layout/Navigation'

const THEME_SWATCHES: Record<ThemeId, string[]> = {
  twitter: [
    'oklch(0.6723 0.1606 244.9955)',
    'oklch(0.9392 0.0166 250.8453)',
    'oklch(0.1884 0.0128 248.5103)',
    'oklch(0.9222 0.0013 286.3737)',
  ],
  perpetuity: [
    'oklch(0.5624 0.0947 203.2755)',
    'oklch(0.9021 0.0297 201.8915)',
    'oklch(0.9244 0.0181 196.845)',
    'oklch(0.9295 0.0107 196.9723)',
  ],
  'cosmic-night': [
    'oklch(0.5417 0.179 288.0332)',
    'oklch(0.9221 0.0373 262.141)',
    'oklch(0.9174 0.0435 292.6901)',
    'oklch(0.958 0.0133 286.1454)',
  ],
  'violet-bloom': [
    'oklch(0.5393 0.2713 286.7462)',
    'oklch(0.9393 0.0288 266.368)',
    'oklch(0.954 0.0063 255.4755)',
    'oklch(0.9702 0 0)',
  ],
  'mocha-mousse': [
    'oklch(0.6083 0.0623 44.3588)',
    'oklch(0.8502 0.0389 49.0874)',
    'oklch(0.7473 0.0387 80.5476)',
    'oklch(0.8502 0.0389 49.0874)',
  ],
  'elegant-luxury': [
    'oklch(0.465 0.147 24.9381)',
    'oklch(0.9619 0.058 95.6174)',
    'oklch(0.9625 0.0385 89.0943)',
    'oklch(0.9431 0.0068 53.4442)',
  ],
}

const ALL_PROVIDERS: AIProviderType[] = ['openai', 'grok', 'google']

interface SettingsViewProps {
  onNavigate: (tab: TabId) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function resizeImageToDataUrl(file: File, maxPx = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SettingsView({ onNavigate: _ }: SettingsViewProps) {
  const { t } = useTranslation()

  // AI store
  const { configs, activeProvider, upsertConfig, removeConfig, reorderConfig, setActiveProvider } =
    useAIStore()

  // Settings store
  const {
    stealthEnabled,
    debugMode,
    setStealthEnabled,
    setDebugMode,
    downloadFolder,
    fileNamePrefix,
    includeDate,
    savedFolderPath,
    setDownloadFolder,
    setFileNamePrefix,
    setIncludeDate,
    setSavedFolderPath,
  } = useSettingsStore()

  // Business store
  const {
    logoDataUrl,
    companyName,
    nif,
    address,
    phone,
    email,
    setLogo,
    setCompanyName,
    setNif,
    setAddress,
    setPhone,
    setEmail,
  } = useBusinessStore()

  const { theme, setTheme, mode, toggleMode } = useTheme()

  // Runtime store (developer-only)
  const { mode: runtimeMode, setMode: setRuntimeMode } = useRuntimeStore()

  // Local UI state
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>(
    {} as Record<AIProviderType, boolean>,
  )
  const [testing, setTesting] = useState<AIProviderType | null>(null)
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProvider, setNewProvider] = useState<AIProviderType>('grok')
  const [newApiKey, setNewApiKey] = useState('')
  const [newModel, setNewModel] = useState('')
  const [themeOpen, setThemeOpen] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)

  // Available providers not yet added
  const addedProviders = configs.map((c) => c.provider)
  const availableToAdd = ALL_PROVIDERS.filter((p) => !addedProviders.includes(p))

  async function handleTestConnection(provider: AIProviderType) {
    setTesting(provider)
    await testAIConnection(provider)
    setTesting(null)
  }

  function handleAddProvider() {
    if (!newApiKey.trim()) return
    upsertConfig({
      provider: newProvider,
      apiKey: newApiKey.trim(),
      model: newModel || DEFAULT_MODELS[newProvider],
      enabled: true,
      status: 'untested',
    })
    setNewApiKey('')
    setNewModel('')
    setAddingProvider(false)
    // Reset to first available
    if (availableToAdd.length > 1)
      setNewProvider(availableToAdd.find((p) => p !== newProvider) ?? availableToAdd[0])
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512)
      setLogo(dataUrl)
    } catch {
      /* ignore */
    }
    e.target.value = ''
  }

  async function handlePickFolder() {
    try {
      // showDirectoryPicker is available in modern browsers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
      setSavedFolderPath(handle.name as string)
      setDownloadFolder(handle.name as string)
    } catch {
      // User cancelled or API not available – fall back to manual input
    }
  }

  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority)

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">{t('settings.title')}</h2>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 1. AI CONFIGURATION ━━━━━━━━ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            {t('settings.ai.title')}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t('settings.ai.description')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider list */}
          {sortedConfigs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('settings.ai.noProviders')}
            </p>
          )}

          {sortedConfigs.map((cfg, idx) => {
            const isActive = cfg.provider === activeProvider
            const isTesting = testing === cfg.provider
            const showKey = showKeys[cfg.provider] ?? false

            return (
              <div
                key={cfg.provider}
                className={`rounded-xl border p-3 space-y-3 transition-colors ${
                  isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-2">
                  <span className="text-base">{PROVIDER_ICONS[cfg.provider]}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{PROVIDER_LABELS[cfg.provider]}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('settings.ai.priority')} {idx + 1}{' '}
                      {isActive ? `· ${t('settings.ai.active')}` : ''}
                    </p>
                  </div>
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                      cfg.status === 'connected'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : cfg.status === 'failed'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {cfg.status === 'connected' ? (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        OK
                      </>
                    ) : cfg.status === 'failed' ? (
                      <>
                        <XCircle className="w-2.5 h-2.5" />
                        Error
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                  {/* Reorder + remove */}
                  <div className="flex gap-0.5 ml-1">
                    <button
                      onClick={() => reorderConfig(cfg.provider, 'up')}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => reorderConfig(cfg.provider, 'down')}
                      disabled={idx === sortedConfigs.length - 1}
                      className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeConfig(cfg.provider)}
                      className="w-6 h-6 rounded flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Model */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">{t('settings.ai.model')}</Label>
                    <Select
                      value={cfg.model}
                      onValueChange={(model) => upsertConfig({ ...cfg, model })}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS[cfg.provider].map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <Label className="text-[10px]">{t('settings.ai.enabled')}</Label>
                      <div className="mt-2.5">
                        <Switch
                          checked={cfg.enabled}
                          onCheckedChange={(enabled) => upsertConfig({ ...cfg, enabled })}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs mb-0.5"
                      onClick={() => setActiveProvider(cfg.provider)}
                      disabled={isActive}
                    >
                      {isActive ? t('settings.ai.active') : t('settings.ai.use')}
                    </Button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <Label className="text-[10px]">{t('settings.ai.apiKey')}</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={cfg.apiKey}
                      onChange={(e) =>
                        upsertConfig({ ...cfg, apiKey: e.target.value, status: 'untested' })
                      }
                      placeholder={
                        cfg.provider === 'openai'
                          ? 'sk-…'
                          : cfg.provider === 'grok'
                            ? 'xai-…'
                            : 'AIza…'
                      }
                      className="pr-9 h-8 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys((p) => ({ ...p, [cfg.provider]: !showKey }))}
                      className="absolute right-0 top-0 h-full w-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Test button */}
                <Button
                  onClick={() => handleTestConnection(cfg.provider)}
                  disabled={!cfg.apiKey || isTesting}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                >
                  {isTesting ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : cfg.status === 'connected' ? (
                    <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-500" />
                  ) : cfg.status === 'failed' ? (
                    <XCircle className="w-3 h-3 mr-1.5 text-destructive" />
                  ) : null}
                  {t('settings.ai.testConnection')}
                </Button>
              </div>
            )
          })}

          {/* Add provider form */}
          {availableToAdd.length > 0 &&
            (addingProvider ? (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
                <p className="text-xs font-medium flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  {t('settings.ai.addProvider')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">{t('settings.ai.provider')}</Label>
                    <Select
                      value={newProvider}
                      onValueChange={(v) => {
                        setNewProvider(v as AIProviderType)
                        setNewModel('')
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToAdd.map((p) => (
                          <SelectItem key={p} value={p} className="text-xs">
                            {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">{t('settings.ai.model')}</Label>
                    <Select
                      value={newModel || DEFAULT_MODELS[newProvider]}
                      onValueChange={setNewModel}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS[newProvider].map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">{t('settings.ai.apiKey')}</Label>
                  <Input
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder={t('settings.ai.apiKeyPlaceholder')}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={handleAddProvider}
                    disabled={!newApiKey.trim()}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {t('common.add')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => {
                      setAddingProvider(false)
                      setNewApiKey('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAddingProvider(true)
                  setNewProvider(availableToAdd[0])
                }}
                className="w-full h-9 rounded-xl border border-dashed border-primary/40 text-xs text-primary/70 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('settings.ai.addProvider')}
              </button>
            ))}

          {/* Failover notice */}
          {sortedConfigs.length > 1 && (
            <div className="rounded-lg bg-muted/60 px-3 py-2 flex items-start gap-2">
              <span className="text-sm mt-0.5">🔄</span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  {t('settings.ai.failoverNotice')}
                </span>{' '}
                {t('settings.ai.failoverDescription')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2. BUSINESS PROFILE ━━━━━━━━ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {t('settings.business.title')}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t('settings.business.description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Logo upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('settings.business.logo')}</Label>
            <div className="flex items-center gap-3">
              <div
                className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 ${
                  logoDataUrl ? 'border-primary/40' : 'border-border'
                }`}
              >
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoDataUrl
                    ? t('settings.business.changeLogo')
                    : t('settings.business.uploadLogo')}
                </Button>
                {logoDataUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => setLogo('')}
                  >
                    {t('settings.business.removeLogo')}
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {t('settings.business.logoHint')}
                </p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">{t('settings.business.companyName')}</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp S.L."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.business.nif')}</Label>
              <Input
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="B12345678"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.business.phone')}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">{t('settings.business.address')}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle Mayor 1, 28001 Madrid"
                className="h-8 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">{t('settings.business.email')}</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@empresa.com"
                type="email"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                {t('settings.business.emailHint')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3. STEALTH & DEBUG ━━━━━━━━━ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('settings.stealth.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{t('settings.stealth.stealthMode')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.stealth.stealthDescription')}
              </p>
            </div>
            <Switch checked={stealthEnabled} onCheckedChange={setStealthEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{t('settings.debug.debugMode')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.debug.debugDescription')}
              </p>
            </div>
            <Switch checked={debugMode} onCheckedChange={setDebugMode} />
          </div>
        </CardContent>
      </Card>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RUNTIME ENVIRONMENT (debug only) */}
      {debugMode && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              {t('settings.runtime.title')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t('settings.runtime.description')}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              [
                {
                  id: 'simulation' as RuntimeMode,
                  labelKey: 'settings.runtime.simulation',
                  descKey: 'settings.runtime.simulationDesc',
                  color: 'text-blue-400',
                },
                {
                  id: 'staging' as RuntimeMode,
                  labelKey: 'settings.runtime.staging',
                  descKey: 'settings.runtime.stagingDesc',
                  color: 'text-yellow-400',
                },
                {
                  id: 'production' as RuntimeMode,
                  labelKey: 'settings.runtime.production',
                  descKey: 'settings.runtime.productionDesc',
                  color: 'text-red-400',
                },
              ] as const
            ).map(({ id, labelKey, descKey, color }) => (
              <button
                key={id}
                onClick={() => setRuntimeMode(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  runtimeMode === id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    runtimeMode === id ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${runtimeMode === id ? color : ''}`}>
                    {t(labelKey)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t(descKey)}</p>
                </div>
                {runtimeMode === id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
            {runtimeMode === 'production' && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-[11px] text-red-400">
                  {t('settings.runtime.productionWarning')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4. EXPORT & DOWNLOADS ━━━━━━ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-primary" />
            {t('settings.export.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Folder picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('settings.export.folder')}</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={savedFolderPath || downloadFolder}
                  onChange={(e) => {
                    setSavedFolderPath('')
                    setDownloadFolder(e.target.value)
                  }}
                  placeholder="Vibe Informes"
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 px-3 text-xs gap-1.5 shrink-0"
                onClick={handlePickFolder}
                title="Seleccionar carpeta"
              >
                <Folder className="w-3.5 h-3.5" />
                {t('settings.export.selectFolder')}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {savedFolderPath
                ? t('settings.export.folderSelected', { name: savedFolderPath })
                : t('settings.export.folderHint')}
            </p>
          </div>

          {/* File prefix */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('settings.export.prefix')}</Label>
            <Input
              value={fileNamePrefix}
              onChange={(e) => setFileNamePrefix(e.target.value)}
              placeholder="informe-vibe"
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              {t('settings.export.prefixHint', {
                preview: `${fileNamePrefix || 'informe-vibe'}-cliente-campaña-2026-03-17.pdf`,
              })}
            </p>
          </div>

          {/* Include date */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{t('settings.export.includeDate')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.export.folderHint')}</p>
            </div>
            <Switch checked={includeDate} onCheckedChange={setIncludeDate} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5. THEME (accordion, last) ━━ */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          onClick={() => setThemeOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{t('settings.theme.title')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleMode()
              }}
              className="h-7 gap-1.5 text-xs"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  Dark
                </>
              )}
            </Button>
            {themeOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {themeOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              {THEME_IDS.map((id) => {
                const def = THEME_DEFINITIONS[id as ThemeId]
                const swatches = THEME_SWATCHES[id as ThemeId]
                const isActive = theme === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id as ThemeId)}
                    className={`relative text-left rounded-lg border-2 p-3 transition-all ${
                      isActive
                        ? 'border-primary bg-accent'
                        : 'border-border bg-card hover:border-muted-foreground'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex gap-1 mb-2">
                      {swatches.map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-card-foreground'}`}
                    >
                      {def.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {def.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
