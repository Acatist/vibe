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
  Zap,
  RefreshCcw,
  Minus,
  ShieldCheck,
  Shield,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Switch } from '@components/ui/switch'
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
import type { FormFallbackProfile } from '@core/types/contact.types'
import { useTheme } from '@hooks/useTheme'
import { useEnergy } from '@hooks/useEnergy'
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
    formFallbackProfile,
    setFormFallbackProfile,
  } = useSettingsStore()

  // Helper: update a single field in the fallback profile
  function setFallback<K extends keyof FormFallbackProfile>(key: K, value: FormFallbackProfile[K]) {
    setFormFallbackProfile({ ...formFallbackProfile, [key]: value })
  }

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

  // Energy (developer-only)
  const {
    energy,
    energyPercent,
    isInfinite,
    refill: refillEnergy,
    reset: resetEnergy,
    setInfinite,
    consume: consumeEnergy,
  } = useEnergy()

  // Local UI state
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>(
    {} as Record<AIProviderType, boolean>,
  )
  const [testing, setTesting] = useState<AIProviderType | null>(null)
  const [addingProvider, setAddingProvider] = useState(false)
  const [newProvider, setNewProvider] = useState<AIProviderType>('grok')
  const [newApiKey, setNewApiKey] = useState('')
  const [newModel, setNewModel] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ai: true })
  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

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

  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t('settings.title')}</h2>

      <div className="space-y-1.5">

        {/* ── 1. AI Configuration ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('ai')}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t('settings.ai.title')}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.ai ? 'rotate-180' : ''}`}
            />
          </button>
          {openSections.ai && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
              <p className="text-[11px] text-muted-foreground">{t('settings.ai.description')}</p>

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
                    <div className="flex items-center gap-2">
                      <span className="text-base">{PROVIDER_ICONS[cfg.provider]}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{PROVIDER_LABELS[cfg.provider]}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t('settings.ai.priority')} {idx + 1}{' '}
                          {isActive ? `· ${t('settings.ai.active')}` : ''}
                        </p>
                      </div>
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
                          <><CheckCircle2 className="w-2.5 h-2.5" />OK</>
                        ) : cfg.status === 'failed' ? (
                          <><XCircle className="w-2.5 h-2.5" />Error</>
                        ) : '—'}
                      </span>
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
                            cfg.provider === 'openai' ? 'sk-…' : cfg.provider === 'grok' ? 'xai-…' : 'AIza…'
                          }
                          className="pr-9 h-8 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys((p) => ({ ...p, [cfg.provider]: !showKey }))}
                          className="absolute right-0 top-0 h-full w-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

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
                        onClick={() => { setAddingProvider(false); setNewApiKey('') }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingProvider(true); setNewProvider(availableToAdd[0]) }}
                    className="w-full h-9 rounded-xl border border-dashed border-primary/40 text-xs text-primary/70 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('settings.ai.addProvider')}
                  </button>
                ))}

              {sortedConfigs.length > 1 && (
                <div className="rounded-lg bg-muted/60 px-3 py-2 flex items-start gap-2">
                  <span className="text-sm mt-0.5">🔄</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">{t('settings.ai.failoverNotice')}</span>{' '}
                    {t('settings.ai.failoverDescription')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Perfil de Empresa ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('business')}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t('settings.business.title')}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.business ? 'rotate-180' : ''}`}
            />
          </button>
          {openSections.business && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">{t('settings.business.description')}</p>

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
                      {logoDataUrl ? t('settings.business.changeLogo') : t('settings.business.uploadLogo')}
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
                    <p className="text-[10px] text-muted-foreground">{t('settings.business.logoHint')}</p>
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="border-t border-border/40" />

              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">{t('settings.business.companyName')}</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp S.L." className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('settings.business.nif')}</Label>
                  <Input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="B12345678" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('settings.business.phone')}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34 600 000 000" className="h-8 text-xs" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">{t('settings.business.address')}</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle Mayor 1, 28001 Madrid" className="h-8 text-xs" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">{t('settings.business.email')}</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hola@empresa.com" type="email" className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground">{t('settings.business.emailHint')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Perfil de Formulario ───────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('formProfile')}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Perfil de Formulario</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.formProfile ? 'rotate-180' : ''}`}
            />
          </button>
          {openSections.formProfile && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground">
                Datos complementarios para rellenar automáticamente campos adicionales en
                formularios web: departamento, país, sector, tamaño de empresa y más.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cargo / Puesto</Label>
                  <Input value={formFallbackProfile.cargo} onChange={(e) => setFallback('cargo', e.target.value)} placeholder="Business Development" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Departamento por defecto</Label>
                  <Input value={formFallbackProfile.departamento} onChange={(e) => setFallback('departamento', e.target.value)} placeholder="general" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">País</Label>
                  <Input value={formFallbackProfile.pais} onChange={(e) => setFallback('pais', e.target.value)} placeholder="España" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Región / Provincia</Label>
                  <Input value={formFallbackProfile.region} onChange={(e) => setFallback('region', e.target.value)} placeholder="Madrid" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ciudad</Label>
                  <Input value={formFallbackProfile.ciudad} onChange={(e) => setFallback('ciudad', e.target.value)} placeholder="Madrid" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sector / Industria</Label>
                  <Input value={formFallbackProfile.industria} onChange={(e) => setFallback('industria', e.target.value)} placeholder="Tecnología" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tamaño de empresa</Label>
                  <Select value={formFallbackProfile.tamanoEmpresa} onValueChange={(v) => setFallback('tamanoEmpresa', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1-10', '11-50', '51-200', '201-500', '501-1000', '+1000'].map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Idioma preferido</Label>
                  <Select value={formFallbackProfile.idioma} onValueChange={(v) => setFallback('idioma', v as 'es' | 'en')}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es" className="text-xs">🇪🇸 Español</SelectItem>
                      <SelectItem value="en" className="text-xs">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fuente de referencia</Label>
                  <Input value={formFallbackProfile.fuenteReferencia} onChange={(e) => setFallback('fuenteReferencia', e.target.value)} placeholder="Búsqueda web" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo de consulta</Label>
                  <Input value={formFallbackProfile.motivoConsulta} onChange={(e) => setFallback('motivoConsulta', e.target.value)} placeholder="Consulta comercial" className="h-8 text-xs" />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground">Relleno automático seguro.</span>{' '}
                  Estos datos se usan para cubrir campos extra en formularios web (sector, país,
                  departamento…). Información sensible como DNI, contraseñas o datos bancarios
                  NUNCA se rellena automáticamente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Stealth & Comportamiento ──────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('stealth')}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t('settings.stealth.title')}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.stealth ? 'rotate-180' : ''}`}
            />
          </button>
          {openSections.stealth && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{t('settings.stealth.stealthMode')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.stealth.stealthDescription')}</p>
                </div>
                <Switch checked={stealthEnabled} onCheckedChange={setStealthEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{t('settings.debug.debugMode')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.debug.debugDescription')}</p>
                </div>
                <Switch checked={debugMode} onCheckedChange={setDebugMode} />
              </div>
            </div>
          )}
        </div>

        {/* ── 5. Entorno de Ejecución (debug only) ─────────────────────────── */}
        {debugMode && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => toggle('runtime')}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t('settings.runtime.title')}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.runtime ? 'rotate-180' : ''}`}
              />
            </button>
            {openSections.runtime && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">{t('settings.runtime.description')}</p>
                {(
                  [
                    { id: 'simulation' as RuntimeMode, labelKey: 'settings.runtime.simulation', descKey: 'settings.runtime.simulationDesc', color: 'text-blue-400' },
                    { id: 'staging' as RuntimeMode, labelKey: 'settings.runtime.staging', descKey: 'settings.runtime.stagingDesc', color: 'text-yellow-400' },
                    { id: 'production' as RuntimeMode, labelKey: 'settings.runtime.production', descKey: 'settings.runtime.productionDesc', color: 'text-red-400' },
                  ] as const
                ).map(({ id, labelKey, descKey, color }) => (
                  <button
                    key={id}
                    onClick={() => setRuntimeMode(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      runtimeMode === id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${runtimeMode === id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${runtimeMode === id ? color : ''}`}>{t(labelKey)}</p>
                      <p className="text-[11px] text-muted-foreground">{t(descKey)}</p>
                    </div>
                    {runtimeMode === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                ))}
                {runtimeMode === 'production' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-400">{t('settings.runtime.productionWarning')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 6. Energía — Debug (debug only) ──────────────────────────────── */}
        {debugMode && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => toggle('energy')}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Energía — Debug</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {isInfinite ? '∞' : `${energyPercent}%`}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.energy ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
            {openSections.energy && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {isInfinite ? '∞ modo infinito activo' : `${energy.current} / ${energy.max} unidades · ${energyPercent}%`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => refillEnergy(energy.max)}>
                    <RefreshCcw className="w-3 h-3" />Rellenar al máximo
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => consumeEnergy('scrapeUrl', 100)} disabled={energy.current < 100}>
                    <Minus className="w-3 h-3" />−100
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => consumeEnergy('scrapeUrl', 500)} disabled={energy.current < 500}>
                    <Minus className="w-3 h-3" />−500
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => resetEnergy()}>
                    Reset
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">Modo infinito</p>
                  <Button size="sm" variant={isInfinite ? 'default' : 'outline'} className="text-xs h-7 px-3" onClick={() => setInfinite(!isInfinite)}>
                    {isInfinite ? '∞ Activo' : 'Activar ∞'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 7. Exportación ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('export')}
          >
            <div className="flex items-center gap-2">
              <FolderDown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t('settings.export.title')}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.export ? 'rotate-180' : ''}`}
            />
          </button>
          {openSections.export && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('settings.export.folder')}</Label>
                <div className="relative">
                  <Folder className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={savedFolderPath || downloadFolder}
                    onChange={(e) => { setSavedFolderPath(''); setDownloadFolder(e.target.value) }}
                    placeholder="Vibe Informes"
                    className="h-9 pl-8 text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {savedFolderPath ? t('settings.export.folderSelected', { name: savedFolderPath }) : t('settings.export.folderHint')}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('settings.export.prefix')}</Label>
                <Input value={fileNamePrefix} onChange={(e) => setFileNamePrefix(e.target.value)} placeholder="informe-vibe" className="h-9 text-xs" />
                <p className="text-[10px] text-muted-foreground">
                  {t('settings.export.prefixHint', { preview: `${fileNamePrefix || 'informe-vibe'}-cliente-campaña-2026-03-17.pdf` })}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{t('settings.export.includeDate')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.export.folderHint')}</p>
                </div>
                <Switch checked={includeDate} onCheckedChange={setIncludeDate} />
              </div>
            </div>
          )}
        </div>

        {/* ── 8. Apariencia ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            onClick={() => toggle('theme')}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t('settings.theme.title')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); toggleMode() }}
                className="h-7 gap-1.5 text-xs"
              >
                {mode === 'dark' ? (
                  <><Sun className="w-3.5 h-3.5" />Light</>
                ) : (
                  <><Moon className="w-3.5 h-3.5" />Dark</>
                )}
              </Button>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.theme ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
          {openSections.theme && (
            <div className="border-t border-border px-4 pb-4 pt-3">
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
                        isActive ? 'border-primary bg-accent' : 'border-border bg-card hover:border-muted-foreground'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex gap-1 mb-2">
                        {swatches.map((color, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-card-foreground'}`}>
                        {def.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{def.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
