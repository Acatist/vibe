# Vibe Reach — Documentación Técnica de Desarrollo

> **Versión:** 1.3.0  
> **Última actualización:** 18 de marzo de 2026  
> **Stack:** Chrome Extension MV3 · React 19 · TypeScript 5.8 · Tailwind CSS v4 · Zustand v5 · Vite

---

## Tabla de Contenidos

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Proyecto](#3-arquitectura-del-proyecto)
4. [Estructura de Directorios](#4-estructura-de-directorios)
5. [Manifest y Configuración de Extensión](#5-manifest-y-configuración-de-extensión)
6. [Sistema de Temas (UI)](#6-sistema-de-temas-ui)
7. [Sistema de Internacionalización (i18n)](#7-sistema-de-internacionalización-i18n)
8. [Layout y Navegación del Sidepanel](#8-layout-y-navegación-del-sidepanel)
9. [Módulo de Energía](#9-módulo-de-energía)
10. [Módulo de IA](#10-módulo-de-ia)
11. [Motor Stealth (Comportamiento Humano)](#11-motor-stealth-comportamiento-humano)
12. [Vistas del Sidepanel](#12-vistas-del-sidepanel)
13. [Sistema de Entornos de Runtime](#13-sistema-de-entornos-de-runtime)
14. [Motor de Campaña](#14-motor-de-campaña)
15. [Motor de Afinidad](#15-motor-de-afinidad)
16. [Servicio de Scraping (Strategy Pattern)](#16-servicio-de-scraping-strategy-pattern)
17. [ScrapingOrchestrator — Scraping Real de Google](#17-scrapingorchestrator--scraping-real-de-google)
18. [Servicio de Outreach (Strategy Pattern)](#18-servicio-de-outreach-strategy-pattern)
19. [Gestión de Estado (Stores)](#19-gestión-de-estado-stores)
20. [Tipos del Dominio](#20-tipos-del-dominio)
21. [Servicios](#21-servicios)
22. [Background Service Worker](#22-background-service-worker)
23. [Tests](#23-tests)
24. [Comandos de Desarrollo](#24-comandos-de-desarrollo)
25. [Historial de Desarrollo](#25-historial-de-desarrollo)
26. [Decisiones de Diseño y Convenciones](#26-decisiones-de-diseño-y-convenciones)
27. [Roadmap y Trabajo Pendiente](#27-roadmap-y-trabajo-pendiente)

---

## 1. Visión General del Proyecto

**Vibe Reach** es una extensión de Chrome (Manifest V3) diseñada como herramienta de outreach inteligente asistida por IA. Su objetivo principal es:

1. **Descubrir** páginas web y contactos afines al perfil del usuario mediante scraping automatizado.
2. **Analizar** la afinidad temática entre el usuario y los contactos encontrados usando IA.
3. **Generar** campañas de outreach personalizadas y enviar mensajes de presentación.
4. **Emular comportamiento humano** durante la automatización para evitar detección (Motor Stealth).

### Flujo de trabajo principal

```
Usuario define criterios → IA analiza y genera informe de campaña
→ Extensión scrapea webs afines → IA verifica afinidad por página
→ Encuentra contactos relevantes → Rellena formulario / envía email
→ Lista contactos descubiertos → Usuario gestiona campañas desde sidepanel
```

### Superficies de la extensión

| Superficie         | Archivo           | Propósito                                                      |
| ------------------ | ----------------- | -------------------------------------------------------------- |
| **Side Panel**     | `src/sidepanel/`  | Interfaz principal de gestión (React SPA)                      |
| **Popup**          | `src/popup/`      | Acceso rápido (actualmente desactivado en favor del sidepanel) |
| **Options**        | `src/options/`    | Ajustes avanzados en página completa                           |
| **Content Script** | `src/content/`    | Inyectado en páginas web para scraping y automatización        |
| **Background SW**  | `src/background/` | Service Worker MV3: gestión de alarmas, mensajes, side panel   |

---

## 2. Stack Tecnológico

### Producción

| Tecnología                 | Versión                      | Uso                                                      |
| -------------------------- | ---------------------------- | -------------------------------------------------------- |
| React                      | 19.1.0                       | Framework UI                                             |
| TypeScript                 | 5.8.3                        | Tipado estático                                          |
| Tailwind CSS               | 4.2.1                        | Estilos utility-first                                    |
| Zustand                    | 5.0.11                       | Gestión de estado global                                 |
| Vite                       | (via `@vitejs/plugin-react`) | Bundler y dev server                                     |
| `@crxjs/vite-plugin`       | 2.0.3                        | Integración Chrome Extension + Vite                      |
| lucide-react               | 0.577.0                      | Iconografía                                              |
| react-i18next              | 16.5.8                       | Internacionalización                                     |
| react-markdown             | 10.1.0                       | Renderización de informes IA en Markdown                 |
| `@radix-ui/*`              | varios                       | Primitivas UI accesibles (Tooltip, Dialog, Select, etc.) |
| `class-variance-authority` | 0.7.1                        | Variantes de componentes                                 |
| `tailwind-merge`           | 3.5.0                        | Merge seguro de clases Tailwind                          |
| jspdf                      | 4.2.0                        | Exportación a PDF (preparado)                            |

### Desarrollo

| Herramienta        | Uso                               |
| ------------------ | --------------------------------- |
| Vitest             | Tests unitarios                   |
| Playwright         | Tests E2E                         |
| ESLint + Prettier  | Linting y formateo                |
| Husky + commitlint | Git hooks y convención de commits |

---

## 3. Arquitectura del Proyecto

```
Browser Extension (MV3)
│
├── Background Service Worker      ← Gestión de mensajes, alarmas, side panel
│   └── Comunica via chrome.runtime.sendMessage
│
├── Side Panel (React SPA)         ← UI principal
│   ├── AppShell (layout)
│   │   ├── Header
│   │   ├── Navigation (6 tabs)
│   │   └── View activa (DashboardView / ContactsView / ...)
│   │
│   ├── Stores (Zustand)           ← Estado global persistido en chrome.storage
│   │   ├── ai.store       (proveedor, apiKey, modelo)
│   │   ├── energy.store   (energía actual, consumo de acciones)
│   │   ├── theme.store    (tema activo, modo claro/oscuro)
│   │   ├── language.store (idioma UI: en/es)
│   │   ├── contacts.store
│   │   ├── campaign.store
│   │   ├── investigation.store
│   │   ├── reports.store
│   │   └── runtime.store  (modo de entorno: simulation/staging/production)
│   │
│   └── Servicios                  ← Lógica de negocio (sin UI)
│       ├── ai.service      (fachada sobre AIProvider)
│       ├── energy.service  (consumo y recarga de energía)
│       ├── session.service (gestión de sesiones de automatización)
│       ├── stealth.service (interfaz al StealthEngine)
│       ├── runtime.service (modo activo y capabilities del entorno)
│       ├── scraping/       (Strategy Pattern: simulation/staging/production)
│       └── outreach/       (Strategy Pattern: simulation/staging/production)
│
├── Content Script                 ← Inyectado en webs
│   └── Módulos de automatización (actions, dom, navigation)
│
├── Motores                        ← Lógica de ejecución autónoma
│   ├── StealthEngine    (CursorEngine, TypingEngine, SessionEngine)
│   ├── CampaignEngine   (orquestador del pipeline — 5 pasos)
│   └── AffinityEngine   (puntuación de afinidad IA + heurística)
│
└── Config                         ← Configuraciones del sistema
    ├── runtime.config   (matriz de capabilities por entorno)
    ├── energy.config
    └── stealth.config
```

---

## 4. Estructura de Directorios

```
vibe/
├── docs/                          ← Documentación del proyecto
│   └── vibe.md                    ← Este documento
├── public/
│   └── logo.png
├── src/
│   ├── assets/                    ← Recursos estáticos (SVGs)
│   ├── automation/                ← Módulos de automatización web
│   │   ├── actions/               ← Acciones (click, scroll, fill...)
│   │   ├── dom/                   ← Helpers de manipulación DOM
│   │   └── navigation/            ← Navegación entre páginas
│   ├── background/
│   │   └── index.ts               ← Service Worker principal
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       ← Contenedor principal del sidepanel
│   │   │   ├── Header.tsx         ← Cabecera (logo + selector idioma)
│   │   │   └── Navigation.tsx     ← Barra de navegación (6 tabs)
│   │   └── ui/                    ← Componentes UI reutilizables (shadcn-like)
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── EnergyBar.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── ThemeProvider.tsx
│   │       ├── ThemeSelector.tsx
│   │       └── tooltip.tsx
│   ├── config/                    ← Configuraciones del sistema
│   │   ├── energy.config.ts
│   │   ├── extension.config.ts
│   │   ├── runtime.config.ts      ← Matriz de capabilities por entorno
│   │   └── stealth.config.ts
│   ├── content/                   ← Content script (inyectado en webs)
│   │   └── main.tsx
│   ├── core/
│   │   ├── config/
│   │   │   └── theme.config.ts    ← Definiciones y aplicación de temas
│   │   ├── constants/
│   │   │   ├── actions.ts         ← Costes de energía por acción
│   │   │   ├── affinity.ts        ← Categorías, idiomas, países para investigación
│   │   │   ├── extension.ts       ← Nombres de alarmas y constantes
│   │   │   └── profiles.ts        ← Nombres de perfiles de comportamiento
│   │   └── types/                 ← Tipos TypeScript del dominio
│   │       ├── affinity.types.ts  ← AffinityResult, AffinityInput, AffinityClassification
│   │       ├── ai.types.ts
│   │       ├── automation.types.ts
│   │       ├── campaign.types.ts
│   │       ├── campaign-engine.types.ts ← CampaignProgress, CampaignExecutionResult
│   │       ├── contact.types.ts
│   │       ├── energy.types.ts
│   │       ├── extension.types.ts
│   │       ├── investigation.types.ts
│   │       ├── message.types.ts
│   │       ├── report.types.ts    ← (campo simulation: SimulationReportData añadido)
│   │       ├── runtime.types.ts   ← RuntimeMode, RuntimeCapabilities
│   │       └── stealth.types.ts
│   ├── engine/
│   │   ├── stealth/               ← Motor de comportamiento humano
│   │   │   ├── StealthEngine.ts   ← Punto de entrada (fachada)
│   │   │   ├── cursor.engine.ts   ← Movimiento de ratón Bézier
│   │   │   ├── typing.engine.ts   ← Escritura humana con errores
│   │   │   ├── session.engine.ts  ← Gestión de sesiones y fatiga
│   │   │   └── index.ts
│   │   ├── affinity/              ← Motor de puntuación de afinidad
│   │   │   ├── affinity.engine.ts ← scoreAffinity() + heurística de fallback
│   │   │   └── index.ts
│   │   └── campaign/              ← Motor de orquestación de campañas
│   │       ├── campaign.engine.ts ← executeCampaign() — pipeline de 5 pasos
│   │       └── index.ts
│   ├── hooks/                     ← React hooks personalizados
│   │   ├── useEnergy.ts
│   │   ├── useSession.ts
│   │   └── useTheme.ts
│   ├── i18n/                      ← Traducciones
│   │   ├── en.json
│   │   ├── es.json
│   │   └── index.ts
│   ├── lib/
│   │   └── utils.ts               ← Función cn() (clsx + tailwind-merge)
│   ├── modules/                   ← Módulos de funcionalidad (extensibles)
│   │   └── example-module/
│   ├── options/                   ← Página de opciones completa
│   ├── popup/                     ← Popup (preparado, subordinado al sidepanel)
│   ├── profiles/                  ← Perfiles de comportamiento stealth
│   │   ├── normal-user.ts
│   │   ├── power-user.ts
│   │   └── slow-user.ts
│   ├── providers/
│   │   └── ai/
│   │       └── ai.provider.ts     ← Implementaciones de proveedores IA
│   ├── services/                  ← Servicios de negocio
│   │   ├── ai.service.ts
│   │   ├── energy.service.ts
│   │   ├── logger.service.ts      ← (prefijo de runtime inyectado: [SIMULATION]/[STAGING]/...)
│   │   ├── message.service.ts
│   │   ├── runtime.service.ts     ← getMode(), isSimulation(), getCapabilities()
│   │   ├── session.service.ts
│   │   ├── stealth.service.ts
│   │   ├── storage.service.ts
│   │   ├── scraping/              ← Strategy Pattern (3 implementaciones) + Orchestrator
│   │   │   ├── scraping.interface.ts
│   │   │   ├── scraping.simulation.ts
│   │   │   ├── scraping.staging.ts
│   │   │   ├── scraping.production.ts
│   │   │   ├── scraping.factory.ts
│   │   │   ├── scraping.orchestrator.ts  ← Scraping real Google (Background SW)
│   │   │   └── index.ts
│   │   └── outreach/              ← Strategy Pattern (3 implementaciones)
│   │       ├── outreach.interface.ts
│   │       ├── outreach.simulation.ts
│   │       ├── outreach.staging.ts
│   │       ├── outreach.production.ts
│   │       ├── outreach.factory.ts
│   │       └── index.ts
│   ├── sidepanel/                 ← SPA principal del side panel
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── views/
│   │       ├── DashboardView.tsx
│   │       ├── InvestigationView.tsx
│   │       ├── ContactsView.tsx
│   │       ├── CampaignsView.tsx
│   │       ├── HistoryView.tsx
│   │       ├── ReportsView.tsx
│   │       └── SettingsView.tsx
│   ├── store/                     ← Stores Zustand
│   │   ├── ai.store.ts
│   │   ├── campaign.store.ts
│   │   ├── contacts.store.ts
│   │   ├── energy.store.ts
│   │   ├── investigation.store.ts
│   │   ├── language.store.ts
│   │   ├── reports.store.ts
│   │   ├── runtime.store.ts       ← useRuntimeStore (mode, setMode)
│   │   ├── session.store.ts
│   │   ├── settings.store.ts
│   │   └── theme.store.ts
│   ├── styles/
│   │   ├── globals.css            ← Tokens de color OKLCH + definición de temas
│   │   └── themes/                ← JSONs de definición de cada tema
│   │       ├── twitter.json
│   │       ├── midnight.json
│   │       ├── forest.json
│   │       ├── ocean.json
│   │       ├── sunset.json
│   │       └── minimal.json
│   └── utils/                     ← Utilidades generales
│       ├── bezier.ts              ← Curvas Bézier para movimiento de cursor
│       ├── random.ts              ← Generadores de números aleatorios
│       └── timing.ts              ← Helpers de timing y delays
├── tests/                         ← Tests
│   ├── automation/
│   ├── e2e/
│   ├── services/
│   └── stealth/
├── .vscode/
│   └── settings.json              ← TypeScript SDK workspace version
├── manifest.config.ts             ← Configuración del manifest MV3
├── vite.config.ts
├── tsconfig.app.json
├── tailwind.config.ts
└── package.json
```

---

## 5. Manifest y Configuración de Extensión

### `manifest.config.ts`

```typescript
{
  manifest_version: 3,
  name: 'Vibe Reach — AI Investigative Outreach',
  version: '1.0.0',
  action: {
    default_icon: { 48: 'public/logo.png' }
    // SIN default_popup — se abre directamente el side panel
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html'
  },
  permissions: ['storage', 'tabs', 'alarms', 'scripting', 'activeTab', 'sidePanel'],
  host_permissions: ['https://*/*', 'http://*/*'],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  options_ui: { page: 'src/options/index.html', open_in_tab: true },
  content_scripts: [{ js: ['src/content/main.tsx'], matches: ['https://*/*'] }]
}
```

### Comportamiento al hacer clic en el icono

- `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` — configurado en el Service Worker.
- `chrome.action.onClicked` dispara `chrome.sidePanel.open({ tabId })` directamente.
- **No hay diálogo de selección** (Popup vs Side Panel) porque el `default_popup` fue eliminado del manifest.

---

## 6. Sistema de Temas (UI)

### Arquitectura

El sistema de temas usa **Tailwind CSS v4** con tokens OKLCH definidos en `src/styles/globals.css` mediante bloques `@theme inline`. Cada tema aplica sus variables CSS al `:root` (modo claro) o `.dark` (modo oscuro).

### Temas disponibles

| ID               | Nombre         | Descripción                          |
| ---------------- | -------------- | ------------------------------------ |
| `twitter`        | Twitter        | Azul social media, limpio y oscuro   |
| `perpetuity`     | Perpetuity     | Estética terminal retro, monoespacio |
| `cosmic-night`   | Cosmic Night   | Violeta profundo, palateta estelar   |
| `violet-bloom`   | Violet Bloom   | Violeta audaz con bordes redondeados |
| `mocha-mousse`   | Mocha Mousse   | Tonos cálidos café terrosos          |
| `elegant-luxury` | Elegant Luxury | Dorado premium y ámbar rico          |

### Cómo se aplica un tema

1. `useThemeStore.setTheme(themeId)` actualiza el store y llama a `applyTheme()`.
2. `applyTheme()` establece `data-theme="<id>"` y `data-mode="dark|light"` en `document.documentElement`.
3. Tailwind y los bloques `@theme` en `globals.css` responden a estos atributos.

### Modo claro/oscuro

- Se controla mediante la clase `.dark` en `<html>` y el atributo `data-mode`.
- Toggle disponible en Settings mediante `useThemeStore.toggleMode()`.

### Variables de color

Las variables siguen el patrón `--color-<token>` donde los tokens incluyen:
`primary`, `primary-foreground`, `secondary`, `background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `border`, `input`, `ring`, `destructive`, `sidebar-*`.

---

## 7. Sistema de Internacionalización (i18n)

### Configuración

- **Librería:** `react-i18next` + `i18next`
- **Idiomas soportados:** Español (`es`) e Inglés (`en`)
- **Archivos:** `src/i18n/en.json` y `src/i18n/es.json`
- **Store:** `useLanguageStore` persiste el idioma activo en `chrome.storage.local`

### Cobertura i18n

Todas las vistas principales usan `useTranslation()` con `t()` calls. Las secciones cubiertas son:

| Namespace             | Secciones                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `nav.*`               | Tabs de navegación                                                                                       |
| `dashboard.*`         | Métricas y acciones rápidas                                                                              |
| `investigation.*`     | Formulario completo, tipos de contacto, filtros, tooltips, energía                                       |
| `contacts.*`          | Tabla, categorías, acciones CRUD                                                                         |
| `campaigns.*`         | Tabs, estados, contadores, canales                                                                       |
| `history.*`           | Secciones de detalle (investigación, contactos, envíos, timeline)                                        |
| `reports.*`           | Generación de informes, selector de campaña, PDFs, análisis                                              |
| `settings.ai.*`       | Configuración multi-proveedor, failover, estados                                                         |
| `settings.business.*` | Perfil de empresa (logo, NIF, teléfono, email, dirección)                                                |
| `settings.export.*`   | Configuración de exportación (carpeta, prefijo, fecha)                                                   |
| `settings.runtime.*`  | Selector de entorno de runtime (simulation/staging/production); visible solo cuando `debugMode === true` |
| `common.*`            | Acciones genéricas (guardar, cancelar, eliminar, etc.)                                                   |

### Selector de idioma

Ubicado en el `Header`, es un `DropdownMenu` con flags emoji (🇺🇸 / 🇪🇸).

### Idioma del informe IA

El campo `reportLanguage` en `CampaignBrief` se mapea desde el código de idioma UI (`es` → `Spanish`, `en` → `English`) mediante el objeto `LOCALE_NAMES`, instruyendo explícitamente a la IA que genere el informe en ese idioma.

---

## 8. Layout y Navegación del Sidepanel

### AppShell (`src/components/layout/AppShell.tsx`)

Contenedor raíz del sidepanel. Estructura:

```
<div className="flex flex-col h-screen">
  <Header />
  <Navigation activeTab onTabChange />
  <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <main className="p-4 min-h-full flex flex-col animate-fade-in">
      <ActiveView onNavigate={setActiveTab} />
    </main>
  </div>
</div>
```

- El scrollbar está **oculto visualmente** pero funcional (`scrollbar-width:none` + webkit).
- La vista activa se monta via `VIEW_MAP[activeTab]`, un mapa de `TabId → React.ComponentType`.
- Cada cambio de tab aplica `key={activeTab}` para re-montar con animación fade-in.

### Navigation (`src/components/layout/Navigation.tsx`)

Barra de 6 tabs icono-only debajo del Header:

| Tab ID      | Icono             | Vista                               |
| ----------- | ----------------- | ----------------------------------- |
| `dashboard` | `LayoutDashboard` | DashboardView (→ InvestigationView) |
| `contacts`  | `Users`           | ContactsView                        |
| `campaigns` | `Send`            | CampaignsView                       |
| `history`   | `Clock`           | HistoryView                         |
| `reports`   | `BarChart3`       | ReportsView                         |
| `settings`  | `Settings`        | SettingsView                        |

- Los botones son `flex-1`, estilos pill (`rounded-lg`).
- Activo: `bg-primary text-primary-foreground shadow-sm`
- Hover: `hover:bg-muted/60`
- El tab `dashboard` también se activa cuando `activeTab === 'investigation'` (proxy).
- `investigation` como TabId existe internamente pero no tiene botón en la nav.

### Header (`src/components/layout/Header.tsx`)

- Izquierda: icono `Radio` + nombre de app + tagline (desde i18n).
- Derecha: dropdown selector de idioma con flags emoji.

---

## 9. Módulo de Energía

Sistema de cuota que limita las acciones de automatización para simular comportamiento natural y evitar abusos.

### Configuración (`src/config/energy.config.ts`)

```typescript
{
  maxEnergy: 1000,
  refillAmount: 100,      // Unidades recargadas por intervalo
  refillInterval: 3600000, // 1 hora en ms
  infiniteMode: false,
  debugMode: false,
  persistState: true
}
```

### Costes de acciones (`src/core/constants/actions.ts`)

Cada acción de automatización tiene un coste en unidades de energía:

| Acción             | Coste | Descripción                                                                          |
| ------------------ | ----- | ------------------------------------------------------------------------------------ |
| `click`            | 1     | Clic en elemento                                                                     |
| `keypress`         | 0.5   | Pulsación de tecla                                                                   |
| `scroll`           | 0.5   | Scroll de página                                                                     |
| `scrape`           | 5     | Scraping mediante `ScrapingService` (strategy)                                       |
| `scrapeUrl`        | **1** | **Visita de URL individual en scraping real de Google (10 páginas = 1% de energía)** |
| `formFill`         | 10    | Rellenar formulario                                                                  |
| `submitForm`       | 20    | Enviar formulario                                                                    |
| `search`           | 3     | Búsqueda en buscador                                                                 |
| `navigate`         | 2     | Navegación entre páginas                                                             |
| `captchaAvoidance` | 50    | Detección/bypass de CAPTCHA                                                          |

> **Nota scrapeUrl:** Con `maxEnergy = 1000`, cada `scrapeUrl` cuesta 1 unidad. El usuario consume 1% de energía por cada 10 páginas visitadas durante el scraping real.

### UI del módulo de energía (en InvestigationView)

Diseño de tres zonas:

**Izquierda — Anillo SVG circular:**

- Radio: 34px, circunferencia ~213px
- `strokeDashoffset` calculado en base a `displayPercent`
- Color nativo del tema (`currentColor` + `text-primary`)
- Porcentaje en texto en el centro

**Centro — Info:**

- Título "Vibe Reach"
- Eslogan/subtítulo rotativo
- Badge de tier (`Standard` / `Enhanced` / `Pro` / `Expert` / `Master` / `Elite` / `Legendary` según % con `bonusPercent`)
- Botón compra simulada (+10%) y botón Recargar

**Derecha — Badges LED (3 apilados):**

- `Search` (búsqueda activa)
- `Bot` (IA conectada)
- `Shield` (stealth activo)
- Cada badge: `border text-[10px]`, colores de estado verde/amarillo/rojo

**Abajo — Power bar:**

- Icono `Zap` + etiqueta de energía + barra de progreso + label "%"

### Hook `useEnergy`

```typescript
const { energy, energyPercent, isInfinite, consume, refill } = useEnergy()
```

Puente entre el `EnergyStore` (Zustand) y el `EnergyService` (lógica de negocio), con sincronización bidireccional vía `chrome.runtime.sendMessage`.

---

## 10. Módulo de IA

### Proveedores soportados

| Proveedor      | Endpoint                                   | Modelos disponibles                                                          |
| -------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **OpenAI**     | `api.openai.com/v1/chat/completions`       | GPT-4o, GPT-4o mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo, o1, o1-mini, o3-mini |
| **Grok (xAI)** | `api.x.ai/v1/chat/completions`             | Grok 3, Grok 3 mini, Grok 2, Grok 2 mini                                     |
| **Google AI**  | `generativelanguage.googleapis.com/v1beta` | Gemini 2.0 Flash, 2.0 Pro, 1.5 Pro, 1.5 Flash                                |

### Interface AIProvider

```typescript
interface AIProvider {
  analyzeCampaign(brief: CampaignBrief): Promise<AIResponse<CampaignReport>>
  analyzePrompt(prompt: string, consistency: number): Promise<AIResponse<AIAnalysisResult>>
  generateMessages(contact: Contact, context: string): Promise<AIResponse<AIMessageResult>>
  generateSearchTargets(brief: CampaignBrief): Promise<AIResponse<TargetDiscoveryResult>>
  evaluate(prompt: string): Promise<AIResponse<string>> // completación raw sin wrappers estructurales
  testConnection(): Promise<AIResponse<{ model: string }>>
}
```

> **`evaluate()`** fue añadido para resolver un bug crítico en el Motor de Afinidad: éste llamaba a `analyzePrompt()` que inyecta estructura JSON conflictiva con el scoring de afinidad. `evaluate()` devuelve la respuesta raw del modelo sin ningún wrapper de prompt adicional.

### CampaignBrief

Estructura que describe los parámetros de una campaña:

```typescript
interface CampaignBrief {
  contactType: 'corporate' | 'individual' | 'institutional'
  affinityCategory: string // e.g. "Tecnología"
  affinitySubcategory: string // e.g. "Inteligencia Artificial"
  language: string // e.g. "Spanish"
  country: string // e.g. "España"
  consistency: number // 1-10 precisión de búsqueda
  description: string // texto libre del usuario
  reportLanguage: string // idioma del informe generado
}
```

### Informe de campaña (Markdown)

La IA genera un informe estructurado con secciones:

1. Executive Summary
2. Objetivo y Análisis
3. Perfil de Contacto Ideal (con tabla)
4. Estrategia de Búsqueda y Descubrimiento
5. Evaluación de Relevancia de Afinidad (con tabla de puntuaciones)
6. Proceso de Ejecución (4 fases)
7. Resultados Esperados (con tabla de métricas)
8. Recomendaciones Estratégicas

El informe se renderiza con `react-markdown` y renderers personalizados para tipografía consistente con el tema.

### Store de IA (`useAIStore`)

Multi-proveedor con sistema de prioridad y failover automático:

```typescript
// Estado
{
  configs: AIProviderConfig[],    // lista ordenada por prioridad
  activeProvider: AIProviderType,
}

// Acciones
upsertConfig(cfg)          // añadir/actualizar proveedor
removeConfig(provider)     // eliminar proveedor
setConfigStatus(p, status) // actualizar estado de conexión
reorderConfig(p, dir)      // subir/bajar prioridad
setActiveProvider(p)       // cambiar proveedor activo

// Selectores (usados con useAIStore(selector) para evitar re-renders)
export const selectActiveConfig = (s) => s.configs.find(c => c.provider === s.activeProvider)
export const selectApiKey = (s) => s.configs.find(c => c.provider === s.activeProvider)?.apiKey ?? ''
```

> **Correción de bug:** Las propiedades getters (`get apiKey()`, `get provider()`) en el objeto de estado Zustand se evaluaban en el momento del `set()`, produciendo snapshots obsoletos. Se eliminaron los getters y se reemplazaron por selectores funcionales exportados.

---

## 11. Motor Stealth (Comportamiento Humano)

### Propósito

Emular comportamiento humano durante la automatización web para evitar detección por sistemas anti-bot.

### Componentes

#### StealthEngine (`src/engine/stealth/StealthEngine.ts`)

Fachada principal que compone los tres sub-motores:

```typescript
const engine = StealthEngine.create('normal-user')
await engine.cursor.moveTo(element)
await engine.typing.humanType(input, 'texto')
await engine.session.simulateSession({ durationMinutes: 10 })
```

#### CursorEngine (`cursor.engine.ts`)

- Genera trayectorias de ratón con curvas **Bézier cúbicas** con puntos de control aleatorios.
- Parametrizable: `tension`, `jitter`, `overshoot`, `steps`.
- Despacha eventos `mousemove`, `mousedown`, `mouseup`, `click` en elementos DOM reales.
- Velocidad influenciada por el `cursorSpeedMultiplier` del perfil activo.

#### TypingEngine (`typing.engine.ts`)

- Simula escritura humana con WPM configurable por perfil (`wpmRange`).
- Implementa tipos de errores tipográficos: tecla adyacente, doble pulsación, transposición, tecla perdida, fat-finger.
- `thinkingPauseRate`: pausa de "pensamiento" entre palabras.
- Pausas largas en comas, puntos, signos de exclamación.
- Corrección de errores: backspace + reescritura.

#### SessionEngine (`session.engine.ts`)

- Gestiona sesiones de automatización con micro-pauses y long breaks.
- Simula fatiga progresiva (`fatigueFactor`) que reduce la velocidad con el tiempo.
- Tracks: `totalActiveMs`, `idleMs`, `breakCount`, `isFatigued`.

### Perfiles de comportamiento

| Perfil        | WPM    | Velocidad cursor | Tasa errores | Descripción                   |
| ------------- | ------ | ---------------- | ------------ | ----------------------------- |
| `normal-user` | 55–80  | 1.0x             | 5%           | Usuario promedio de internet  |
| `power-user`  | 80–120 | 1.3x             | 3%           | Usuario avanzado, rápido      |
| `slow-user`   | 30–50  | 0.7x             | 8%           | Usuario lento, muchos errores |

### Utilities (`src/utils/`)

- **`bezier.ts`**: Implementación de curvas Bézier cúbicas para trayectorias de cursor.
- **`random.ts`**: Generadores: `randomBetween(min, max)`, `randomBool(probability)`, `gaussianRandom(mean, std)`.
- **`timing.ts`**: `sleep(ms)`, `randomDelay(min, max)`, `humanDelay(baseMs)`.

---

## 12. Vistas del Sidepanel

### DashboardView (`views/DashboardView.tsx`)

**Proxy** — Renderiza directamente `<InvestigationView onNavigate={onNavigate} />`.  
El tab Dashboard y el formulario de investigación son la misma superficie.

---

### InvestigationView (`views/InvestigationView.tsx`)

Vista central del flujo de trabajo. Tiene cuatro fases principales:

#### Fase `form` (formulario de campaña)

Organizado en tarjetas y secciones:

**Módulo de Energía (Card 1)**

- Anillo SVG de progreso (izquierda)
- Info central: slogan + badge de tier + botones compra/recarga
- LED badges de estado (derecha)
- Power bar (abajo)

**Selector de tipo de contacto (sin card)**

- 3 botones: Empresa (`Building2`), Particular (`User`), Institucional (`Landmark`)
- Activo: `border-primary bg-primary/10`

**Filtros de campaña (Card 2)**

- `Select` de categoría de afinidad (10 categorías) y subcategoría (5-7 por categoría)
- `Select` de idioma del contacto (17 idiomas) y país/región (25 opciones)
- `Slider` de consistencia (1-10) con `InfoTip` tooltip explicativo
- Todos los campos tienen `TooltipProvider` + `InfoTip` con descripciones

**Detalles de la investigación (Card 3)**

- `Textarea` flexible (min 120px) para descripción libre
- Botón CTA "Generar Informe" (llama a la IA)

#### Fase `analyzing` (spinners)

- Icono `Sparkles` animado con borde spinner giratorio
- Skeletons de carga animados
- Texto i18n "Analizando..."

#### Fase `report` (informe generado + configuración de scraping)

- Botón "← Volver" para regresar al formulario
- Informe renderizado con `react-markdown` + renderers personalizados
- **Slider de objetivo de contactos** (100–10,000, step 100):
  - Badge con el número seleccionado en tiempo real
  - Aviso de energía insuficiente si `targetScrapeCount > energy.current`
  - Envuelto en `TooltipProvider` (requerido para `InfoTip`)
- Botón CTA "Buscar Contactos en Internet" → lanza `handleStartScraping()`
- Botón secundario "Saltar → ver contactos" → navega directamente a Contactos

#### Fase `scraping` (scraping en curso)

- Icono `Globe` animado con spinner
- Título adaptativo: "Buscando en Internet..." / "Pausado — clic en Reanudar"
- **Tarjeta de progreso:**
  - `{pagesScanned} / {targetCount}` con `<Progress>` bar
  - URL actual en proceso (con icono pulsante)
  - Contador de contactos encontrados en tiempo real
- **Controles Pausar / Reanudar / Cancelar:**
  - Pausar (visible cuando `status === 'running'`) → envía `SCRAPING_PAUSE` al background
  - Reanudar (visible cuando `status === 'paused'`) → envía `SCRAPING_RESUME` al background
  - Cancelar (siempre visible) → envía `SCRAPING_CANCEL` y vuelve a fase `report`

#### Listener de mensajes del orchestrator

```typescript
// useEffect registrado al montar el componente
chrome.runtime.onMessage.addListener((msg) => {
  SCRAPING_PROGRESS  → actualiza barra de progreso y status
  SCRAPING_CONTACT   → crea Contact, añade a useContactsStore + useInvestigationStore
  SCRAPING_COMPLETE  → navega automáticamente a "contacts"
  SCRAPING_ERROR     → muestra error, vuelve a fase "report"
})
```

Los contactos se añaden **uno a uno** en tiempo real al store según llegan del background.

#### Fase `error`

- Mensaje de error con descripción
- Botón para intentar de nuevo

---

### ContactsView (`views/ContactsView.tsx`)

Vista de gestión de contactos descubiertos por scraping.

#### Layout

Tabla expandible (acordeón) con los contactos.

**Cabecera de tabla:**

- Columna "Empresa" (icono `User2` + texto)
- Columna "Categoría"
- Columna de flecha expand

**Fila de tabla:**

- Nombre de empresa (texto `xs font-medium`)
- URL en verde (`text-emerald-500`) con icono `ExternalLink`, enlace real `_blank`
- Badge de categoría con colores por tipo
- Chevron expand/collapse

**Acordeón expandido:**
Al hacer clic en una fila se despliega el detalle:

```
┌─ Rol         ─┬─ Región ──────────────┐
│               │                        │
├─ Especialización ─────────────────────┤
├─ Email (enlace mailto) ───────────────┤
├─ Tags temáticos (pills) ──────────────┤
├─ Índice de Afinidad (con ⓘ tooltip) ──┤
└─ [Visitar sitio]  [Mensaje ▼] ────────┘
```

**Compositor de mensaje (sub-acordeón):**
Al pulsar "Mensaje" se despliega:

- Cabecera: `MessageSquarePlus` + email del destinatario
- `Input` de asunto
- `Textarea` de cuerpo del mensaje (72px min)
- Contador de caracteres en tiempo real
- Botón "Enviar" (deshabilitado si hay campos vacíos; muestra "✓ Enviado" 3s)

#### Datos mock

5 contactos de demostración para desarrollo UI:

1. TechInsight Media (Periodismo, España, 87%)
2. EcoFund Global (ONG, Europa, 74%)
3. Transparency Watch EU (Investigación, UE, 92%)
4. Open Justice Foundation (Asesoría Legal, Internacional, 68%)
5. DataDriven Research Institute (Think Tank, Global, 81%)

#### CategoryBadge

Badge de píldora por categoría con clases de color específicas:

- Periodismo → azul
- ONG → verde
- Investigación → púrpura
- Asesoría Legal → naranja
- Think Tank → cian

---

### SettingsView (`views/SettingsView.tsx`)

Gestión de configuración de la extensión. Organizado en tarjetas. Todos los textos usan `t()` para i18n.

**Configuración de IA (multi-proveedor):**

- Lista ordenable de proveedores configurados (OpenAI / Grok / Google)
- Cada proveedor: modelo, API Key (toggle), estado (conectado/error), habilitado/deshabilitado
- Reordenar prioridad (flechas arriba/abajo), eliminar proveedor
- Botón "Probar conexión" → llama a `testAIConnection(provider)`
- Formulario "Añadir proveedor" para providers no configurados
- Aviso de failover automático cuando hay >1 proveedor

**Perfil de Empresa (`useBusinessStore`):**

- Logo: subir (resize a 512px max), cambiar, eliminar. Se almacena como dataURL.
- Campos: nombre de empresa, NIF/CIF, teléfono, dirección, email
- Los datos se aplican automáticamente en PDFs y cabeceras de informes

**Sigilo y Depuración:**

- Switch de modo sigilo (comportamiento humano)
- Switch de modo depuración (logging detallado)

**Entorno de Runtime (developer-only):**

- Selector de modo: Simulation / Staging / Production (radio buttons tipo card)
- Visible únicamente cuando `debugMode === true`
- Al seleccionar `production` se muestra un badge de advertencia
- Persiste en `useRuntimeStore` → `sef:runtime`

**Exportación y Descargas (`useSettingsStore`):**

- Selector de carpeta vía `showDirectoryPicker()` o input manual
- Prefijo de nombre de archivo (preview dinámico)
- Switch para incluir fecha ISO en el nombre de archivo

**Selección de Tema:**

- Acordeón desplegable con grid de temas disponibles
- Cada tema: swatches de colores + nombre + descripción
- Botón toggle modo claro/oscuro

---

### CampaignsView (`views/CampaignsView.tsx`)

Vista de gestión de campañas. Conectada a `useCampaignStore`.

- **Tabs:** Todas / En curso / Completadas (filtro por estado)
- **Datos:** Usa campañas reales del store; muestra datos de demostración solo si el store está vacío
- **Cards** por campaña: nombre, canal (badge con color), estado, progreso (contactados/total)
- **Acciones:** Pausar, reanudar, detener campañas en curso
- **i18n:** Todos los textos usan `t()` (`campaigns.title`, `campaigns.count`, `campaigns.tabAll`, etc.)

---

### HistoryView (`views/HistoryView.tsx`)

Vista de historial de campañas terminadas. Conectada a `useCampaignStore`, `useContactsStore`, `useReportsStore`.

- **Datos reales:** Filtra campañas con status `completed` o `failed`. Construye `HistoryRecord` desde datos reales vía `campaignToHistory()`.
- **Fallback:** Muestra demo data solo si no hay campañas finalizadas.
- **Stats resumen:** Campañas completadas, contactos totales, mensajes enviados.
- **Detalle expandible** con secciones:
  - **Investigación:** Prompt, modelo IA, duración, fuentes analizadas
  - **Contactos:** Score promedio/máximo, categorías encontradas, descubiertos
  - **Envíos:** Enviados, fallidos, respondieron, tasa de respuesta, asunto
  - **Timeline:** Lista de eventos con timestamps
- **i18n:** Todos los textos usan `t()` (`history.count`, `history.investigation`, etc.)

---

### ReportsView (`views/ReportsView.tsx`)

Vista de generación y gestión de informes PDF. Conectada a `useReportsStore`, `useCampaignStore`, `useContactsStore`, `useSettingsStore`, `useBusinessStore`.

**Flujo de generación:**

1. Botón "Nuevo informe" → selector de campaña (campañas reales del store, o demo si vacío)
2. Campo "Cliente" (destinatario del informe) → aparece como "Preparado para:" en PDF
3. `handleGenerate()` → calcula stats con `getCampaignStats(campaign, contacts)` → persiste en `useReportsStore` → cierra formulario

**Generación de PDF (`jsPDF`):**

- `downloadPDF(report, businessProfile)`: Informe de campaña multi-página
  - Portada: logo (si existe), marca empresa (o "VIBE REACH"), info negocio (NIF, tel, email), cliente
  - Métricas: contactos, enviados, respondidos, fallidos, score
  - Categorías: tabla con nombre, count, score por categoría
  - Pie de página con marca dinámica
- `downloadInvestigationPDF(report, businessProfile)`: Informe de análisis IA
  - Misma integración de datos de empresa
  - Renderiza markdown del análisis de investigación

**Configuración de archivos:**

- `fileNamePrefix` y `includeDate` se leen de `useSettingsStore`
- Formato: `{prefix}-{cliente}-{campaña}[-{fecha}].pdf`

**Persistencia:**

- Los informes se guardan en `useReportsStore` con `addReport(Omit<Report, 'id'>)`
- Se pueden eliminar individualmente (`deleteReport(id)`)

**i18n:** Todos los textos usan `t()` (`reports.count`, `reports.generatePdf`, etc.)

---

## 13. Sistema de Entornos de Runtime

El sistema soporta tres entornos de ejecución que controlan el comportamiento de todos los servicios sin introducir lógica condicional dispersa en el código.

### RuntimeMode

```typescript
export type RuntimeMode = 'simulation' | 'staging' | 'production'
```

### Matriz de Capabilities

| Capacidad            | Simulation     | Staging   | Production   |
| -------------------- | -------------- | --------- | ------------ |
| `canScrapeReal`      | ❌ (mock data) | ✅        | ✅           |
| `canSendEmail`       | ❌             | ✅        | ✅           |
| `canSubmitForm`      | ❌             | ✅        | ✅           |
| `canPostExternal`    | ❌             | ❌        | ✅           |
| `enableStealth`      | ❌             | ✅        | ✅           |
| `enableRateLimiting` | ❌             | ✅        | ✅           |
| `logPrefix`          | `SIMULATION`   | `STAGING` | `PRODUCTION` |

### Store de Runtime (`useRuntimeStore`)

Persiste el modo activo en `chrome.storage.local` con clave `sef:runtime`. Valor por defecto: `'simulation'`.

```typescript
const { mode, setMode } = useRuntimeStore()
```

### RuntimeService API

Punto único de consulta — los servicios y factories leen el modo siempre a través de esta interfaz, nunca del store directamente.

```typescript
import { getMode, isSimulation, getCapabilities, getLogPrefix } from '@services/runtime.service'
```

### Prefijo de log

El `LoggerService` inyecta automáticamente el prefijo de entorno en **todos los logs**:

```
[SIMULATION][SEF:CampaignEngine] Starting campaign "Demo"
[STAGING][SEF:Outreach:Staging] Rate limiter: 8/10 tokens remaining
[PRODUCTION][SEF:Outreach:Production] Email sent to contact@example.com
```

### Panel de control de entorno (developer-only)

Visible en `SettingsView` únicamente cuando `debugMode === true`. Muestra tres opciones tipo card (Simulation / Staging / Production) con descripción de cada modo. Al seleccionar `production` se añade un badge de advertencia en rojo.

> Las extensiones de Chrome no exponen `NODE_ENV`. El modo de runtime se controla exclusivamente a través de `useRuntimeStore` y el panel de developer en Settings.

---

## 14. Motor de Campaña

El motor de campaña orquesta el pipeline completo de outreach en 5 pasos secuenciales.

### `executeCampaign()`

```typescript
async function executeCampaign(
  campaign: Campaign,
  targetUrls: string[],
  campaignDescription: string,
  targetCategory: string,
  targetSubcategory: string,
  onProgress?: ProgressCallback,
): Promise<CampaignExecutionResult>
```

### Pipeline de 5 pasos

```
1. discover   → ScrapingService.discoverContacts() para cada URL
               → persiste contactos en useContactsStore

2. evaluate   → AffinityEngine.scoreAffinity() para cada contacto
               → actualiza relevanceScore en useContactsStore

3. generate   → AIProvider.generateMessages() para cada contacto
               → persiste mensajes en useCampaignStore

4. outreach   → OutreachService.sendEmail() / submitForm() / sendLinkedInMessage()
               → actualiza status de OutreachMessage en store

5. report     → compila CampaignExecutionResult
               → si simulated === true: auto-crea informe en useReportsStore
```

El motor **nunca comprueba el modo de runtime directamente** — delega en los factories de scraping y outreach para obtener la implementación correcta para el entorno activo.

### Informes de simulación

Cuando `isSimulation() === true`, el motor genera automáticamente un `Report` con un campo `simulation: SimulationReportData` que resume las acciones que se habrían ejecutado en producción (emails, formularios, energía estimada, duración).

### `ProgressCallback`

```typescript
type ProgressCallback = (progress: CampaignProgress) => void
```

Permite que la UI (p.ej. `CampaignsView`) renderice el paso actual del pipeline en tiempo real.

---

## 15. Motor de Afinidad

### `scoreAffinity(input)`

Evalúa la afinidad entre un contacto y los objetivos de la campaña usando IA, con fallback heurístico.

```typescript
async function scoreAffinity(input: AffinityInput): Promise<AffinityResult>
async function scoreAffinityBatch(inputs: AffinityInput[]): Promise<AffinityResult[]>
```

### Flujo de scoring

1. **Intento IA:** `AIProvider.evaluate()` con prompt de scoring que solicita `{"score": N, "reasoning": "..."}`. Se usa `evaluate()` (completación raw) en lugar de `analyzePrompt()` para evitar conflicto con el prompt estructural del sistema multi-proveedor.
2. **Parse JSON:** extrae `score` (0–100) y `reasoning` del response mediante regex `/{[\s\S]*}/`.
3. **Fallback heurístico:** si la IA falla o no devuelve JSON válido, calcula el overlap de keywords entre los tópicos del contacto y el descriptor de la campaña.

Clasificación del score:

- `high` → score ≥ 70
- `medium` → score 40–69
- `low` → score < 40

La IA funciona en todos los entornos (simulation, staging, production); solo los servicios de outreach y scraping cambian de implementación.

---

## 16. Servicio de Scraping (Strategy Pattern)

### Interface

```typescript
interface ScrapingService {
  discoverContacts(url: string): Promise<ScrapedContact[]>
  detectForms(url: string): Promise<DetectedForm[]>
  extractMetadata(url: string): Promise<PageMetadata>
}
```

**Tipos asociados:** `ScrapedContact`, `DetectedForm`, `FormField`, `PageMetadata`.

### Implementaciones

| Implementación              | Modo         | Comportamiento                                                                           |
| --------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `SimulationScrapingService` | `simulation` | Devuelve 5 contactos mock con latencia simulada. Sin requests reales                     |
| `StagingScrapingService`    | `staging`    | Delega a `ProductionScrapingService` + logs de timing para depuración                    |
| `ProductionScrapingService` | `production` | Fetch real + DOMParser. Extrae emails (regex), mailtos, metadatos y campos de formulario |

### Factory

```typescript
import { createScrapingService } from '@services/scraping'

const scraper = createScrapingService() // devuelve la impl correcta para el modo activo
```

El factory cachea la instancia y la invalida automáticamente si el modo cambia entre llamadas.

---

## 17. ScrapingOrchestrator — Scraping Real de Google

**Archivo:** `src/services/scraping/scraping.orchestrator.ts`

El `ScrapingOrchestrator` es el núcleo del sistema de scraping real. Se ejecuta en el **Background Service Worker** (no en el sidepanel) y orquesta todo el ciclo de vida de una sesión de scraping.

### Arquitectura

```
Side Panel                    Background SW                    Chrome Tab (visible)
──────────                    ─────────────                    ──────────────────────
[SCRAPING_START] ──────────→  ScrapingOrchestrator.start()
                               ├─ chrome.tabs.create()  ──────→  Tab abierto (usuario lo ve)
                               ├─ Fase Google: navega a
                               │  google.com/search?q=...  ───→  Página Google cargada
                               │  executeScript(_extractGoogleResults)
                               ├─ Fase Contactos: visita
                               │  cada URL descubierta  ──────→  Página empresa cargada
                               │  executeScript(_extractPageContacts)
                               │  energyService.consume('scrapeUrl')
[SCRAPING_PROGRESS] ←──────── │  chrome.runtime.sendMessage()
[SCRAPING_CONTACT]  ←──────── │  (por cada contacto extraído)
[SCRAPING_COMPLETE] ←──────── └─ fin del loop
```

### Flujo de ejecución

1. **Inicio** — `start(params)`: crea una pestaña visible (`chrome.tabs.create`), construye 4 variantes de query desde el brief de campaña.
2. **Fase Google** — Por cada variante de query, pagina `google.com/search?q=…&start=N&num=10` y extrae los resultados mediante `chrome.scripting.executeScript()` con la función `_extractGoogleResults()`.
3. **Detección de bloqueo** — `_isBlockedPage()` detecta CAPTCHA, recaptcha y páginas de consentimiento de Google. Si se detecta, la sesión se **pausa automáticamente**.
4. **Fase Contactos** — Visita cada URL descubierta, inyecta `_extractPageContacts()` que extrae:
   - Emails vía `a[href^="mailto:"]` + regex sobre texto visible
   - Nombre de organización vía `og:site_name`, `<title>`, dominio
   - Descripción y keywords de metadatos
   - Enlace a página de contacto
5. **Sub-página de contacto** — Si no hay emails en la raíz, navega automáticamente a `/contact` o página similar.
6. **Energía** — `energyService.consume('scrapeUrl')` por cada URL visitada. Si se agota la energía, el scraping se detiene limpiamente.
7. **Streaming** — Cada contacto encontrado se envía inmediatamente al sidepanel via `chrome.runtime.sendMessage(SCRAPING_CONTACT)`.

### Funciones inyectadas en los tabs (via `executeScript`)

Estas funciones son **autocontenidas** (sin closures sobre variables externas) para poder ser serializada y ejecutadas en el contexto del tab:

| Función                   | Propósito                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `_extractGoogleResults()` | Extrae hasta 10 resultados de una SERP de Google. Soporta múltiples selectores de A/B testing de Google |
| `_isBlockedPage()`        | Detecta CAPTCHA (`#captcha-form`, `.g-recaptcha`), "unusual traffic", páginas de consentimiento EU      |
| `_extractPageContacts()`  | Extrae emails, nombre de org, descripción, keywords, enlace de contacto de cualquier página web         |

### Variantes de query

Para maximizar la diversidad de URLs, se generan automáticamente **4 variantes** a partir del brief:

```typescript
;[
  `{subcategoría} {categoría} {país} {tipología} email contact`,
  `{subcategoría} {categoría} {país} {tipología} contact us email`,
  `{query_libre} {país} "@" contact`,
  `{subcategoría} {categoría} {país} mailto email`,
]
```

### Control de sesión

```typescript
scrapingOrchestrator.start(params) // abre tab, inicia loop
scrapingOrchestrator.pause() // detiene el loop en el siguiente tick
scrapingOrchestrator.resume() // relanza el loop
scrapingOrchestrator.cancel() // cancela y cierra el tab
```

Si el usuario **cierra manualmente el tab**, la sesión se cancela automáticamente via `chrome.tabs.onRemoved`.

### Delays anti-detección

Entre cada navegación se aplican delays aleatorios:

- Entre resultados de Google: 1000–2000 ms
- Entre páginas de contacto: 1500–3000 ms
- Después de cargar una SERP: 800–1500 ms

### Tipos de mensajes de scraping (`src/core/types/message.types.ts`)

```typescript
enum MessageType {
  SCRAPING_START = 'SCRAPING_START',
  SCRAPING_PAUSE = 'SCRAPING_PAUSE',
  SCRAPING_RESUME = 'SCRAPING_RESUME',
  SCRAPING_CANCEL = 'SCRAPING_CANCEL',
  SCRAPING_PROGRESS = 'SCRAPING_PROGRESS', // emitido por background → sidepanel
  SCRAPING_CONTACT = 'SCRAPING_CONTACT', // emitido por background → sidepanel
  SCRAPING_COMPLETE = 'SCRAPING_COMPLETE', // emitido por background → sidepanel
  SCRAPING_ERROR = 'SCRAPING_ERROR', // emitido por background → sidepanel
}
```

**Payload de `SCRAPING_START`:**

```typescript
{
  invId: string // ID de la investigación activa
  query: string // texto libre del usuario
  targetCount: number // objetivo de contactos (100–10000)
  affinityCategory: string
  affinitySubcategory: string
  country: string
  language: string
  contactType: string
}
```

**Payload de `SCRAPING_PROGRESS`:**

```typescript
{
  invId: string
  phase: 'google' | 'contacts'
  currentUrl: string
  urlsFound: number
  contactsFound: number
  targetCount: number
  pagesScanned: number
  energyLeft: number
  status: 'running' | 'paused' | 'cancelled' | 'complete' | 'error'
}
```

### Permisos requeridos (manifest)

```json
"permissions": ["tabs", "scripting"],
"host_permissions": ["https://*/*", "http://*/*"]
```

- `scripting` → para `chrome.scripting.executeScript()`
- `tabs` → para `chrome.tabs.create()`, `onUpdated`, `onRemoved`

---

## 18. Servicio de Outreach (Strategy Pattern)

### Interface

```typescript
interface OutreachService {
  sendEmail(contact: Contact, subject: string, body: string): Promise<OutreachResult>
  submitForm(url: string, formData: Record<string, string>): Promise<OutreachResult>
  sendLinkedInMessage(contact: Contact, message: string): Promise<OutreachResult>
}

interface OutreachResult {
  success: boolean
  simulated: boolean // true cuando no se ejecutó ninguna acción real
  error?: string
}
```

### Implementaciones

| Implementación              | Modo         | Comportamiento                                                                                   |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `SimulationOutreachService` | `simulation` | Registra la acción en el log. Retorna `{ success: true, simulated: true }`. Sin efectos externos |
| `StagingOutreachService`    | `staging`    | Rate limiter tipo token bucket (10 acciones/min). Delega a producción si hay token disponible    |
| `ProductionOutreachService` | `production` | Ejecuta acciones reales + consume energía. **TODO:** integración SMTP y LinkedIn API             |

### Factory

```typescript
import { createOutreachService } from '@services/outreach'

const outreach = createOutreachService() // devuelve la impl correcta para el modo activo
```

El factory cachea la instancia y la invalida automáticamente si el modo cambia entre llamadas.

---

## 19. Gestión de Estado (Stores)

Todos los stores usan **Zustand v5** con middleware `persist` y storage adaptado a `chrome.storage.local`.

### Patrón de storage

```typescript
storage: createJSONStorage(() => ({
  getItem: async (key) => {
    const result = await chrome.storage.local.get(key)
    return (result[key] as string | null) ?? null
  },
  setItem: async (key, value) => {
    await chrome.storage.local.set({ [key]: value })
  },
  removeItem: async (key) => {
    await chrome.storage.local.remove(key)
  },
}))
```

### Stores y sus claves de persistencia

| Store                   | Clave                | Estado persistido                                                                       |
| ----------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `useAIStore`            | `vibe-reach:ai`      | configs[], activeProvider                                                               |
| `useEnergyStore`        | `sef:energy`         | current, max, lastRefillTime, isInfinite, totalConsumed                                 |
| `useThemeStore`         | `sef:theme`          | themeId, mode                                                                           |
| `useLanguageStore`      | `sef:language`       | language                                                                                |
| `useContactsStore`      | `sef:contacts`       | contacts[]                                                                              |
| `useCampaignStore`      | `sef:campaigns`      | campaigns[]                                                                             |
| `useInvestigationStore` | `sef:investigations` | investigations[]                                                                        |
| `useReportsStore`       | `sef:reports`        | reports[] (Report[])                                                                    |
| `useSettingsStore`      | `sef:settings`       | stealthEnabled, debugMode, downloadFolder, fileNamePrefix, includeDate, savedFolderPath |
| `useBusinessStore`      | `sef:business`       | logoDataUrl, companyName, nif, address, phone, email                                    |
| `useRuntimeStore`       | `sef:runtime`        | mode (RuntimeMode), setMode                                                             |

---

## 20. Tipos del Dominio

### Contact

```typescript
interface Contact {
  id: string
  name: string
  role: string
  organization: string
  email: string
  website: string
  contactPage: string
  specialization: string
  topics: string[]
  region: string
  recentArticles: string[]
  category: ContactCategory // 'journalist' | 'ngo' | 'researcher' | ...
  relevanceScore: number // 0-100
  investigationId: string
}
```

### Investigation

```typescript
interface Investigation {
  id: string
  prompt: string
  consistency: number
  status: 'idle' | 'analyzing' | 'planned' | 'executing' | 'enriching' | 'complete' | 'error'
  plan: InvestigationPlan | null
  contactIds: string[]
  createdAt: number
  completedAt: number | null
  error: string | null
}
```

### Campaign

```typescript
interface Campaign {
  id: string
  name: string
  investigationId: string
  prompt: string
  status: 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'failed'
  contactIds: string[]
  messages: OutreachMessage[]
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}
```

### OutreachMessage

```typescript
interface OutreachMessage {
  contactId: string
  emailSubject: string
  emailBody: string
  contactFormMessage: string
  followUpMessage: string
  channel: 'email' | 'contactForm' | 'professionalMessaging'
  status: 'pending' | 'sent' | 'failed'
  sentAt: number | null
  error: string | null
}
```

### Report (`report.types.ts`)

```typescript
type ReportChannel = 'email' | 'contactForm' | 'professionalMessaging'

interface CategoryStat {
  name: string
  count: number
  avgScore: number
}

interface Report {
  id: string
  campaignId: string
  campaignName: string
  clientName: string
  channel: ReportChannel
  campaignType: string
  subject: string
  period: string
  contactCount: number
  sentCount: number
  failedCount: number
  responseCount: number
  responseRate: number
  avgScore: number
  highScore: number
  lowScore: number
  createdAt: string // ISO date string
  categories: CategoryStat[]
  downloadFolder: string
  fileNamePrefix: string
  includeDate: boolean
  investigationMarkdown?: string // AI analysis markdown
}
```

### BusinessProfile (`business.types.ts`)

```typescript
interface BusinessProfile {
  logoDataUrl: string
  companyName: string
  nif: string
  address: string
  phone: string
  email: string
}
```

### AffinityResult (`affinity.types.ts`)

```typescript
type AffinityClassification = 'low' | 'medium' | 'high'

interface AffinityResult {
  score: number // 0-100
  classification: AffinityClassification
  reasoning: string
}

interface AffinityInput {
  contactName: string
  contactSpecialization: string
  contactTopics: string[]
  campaignDescription: string
  targetCategory: string
  targetSubcategory: string
}
```

### RuntimeCapabilities (`runtime.types.ts`)

```typescript
type RuntimeMode = 'simulation' | 'staging' | 'production'

interface RuntimeCapabilities {
  canSendEmail: boolean
  canSubmitForm: boolean
  canPostExternal: boolean
  canScrapeReal: boolean
  enableStealth: boolean
  enableRateLimiting: boolean
  logPrefix: string // 'SIMULATION' | 'STAGING' | 'PRODUCTION'
}
```

### SimulationReportData (`report.types.ts`)

Campo opcional `simulation?` añadido a la interfaz `Report`:

```typescript
interface SimulationReportData {
  pagesVisited: number
  contactsDiscovered: number
  highAffinityCount: number
  emailsWouldSend: number
  formsWouldSubmit: number
  estimatedEnergyCost: number
  estimatedDurationMs: number
}
```

### Tipos del Motor de Campaña (`campaign-engine.types.ts`)

```typescript
interface CampaignProgress {
  step: 'discover' | 'evaluate' | 'generate' | 'outreach' | 'report'
  totalSteps: number // siempre 5
  currentStep: number // 0-based
  label: string
}

interface CampaignExecutionResult {
  campaignId: string
  contacts: ScrapedContact[]
  highAffinityCount: number
  outreachResults: ContactOutreachResult[]
  energyUsage: EnergyUsage
  durationMs: number
  simulated: boolean
}
```

---

## 21. Servicios

### `ai.service.ts`

Fachada sobre `AIProvider`. Instancia el proveedor correcto según `useAIStore` y delega llamadas.

```typescript
export function getAIProvider(): AIProvider
// Devuelve la instancia del proveedor activo con apiKey y model del store
```

### `energy.service.ts`

Clase singleton `EnergyService`:

- `consume(action, customCost?)` → deduce energía, devuelve `EnergyConsumeResult`
- `refill(amount?)` → recarga `refillAmount` o cantidad específica
- `reset()` → restaura a `maxEnergy`
- `setInfinite(bool)` → activa/desactiva modo ilimitado
- `getState()` → estado actual como `EnergyState`

### `session.service.ts`

Gestión de sesiones de automatización. Integra con `SessionEngine` del motor stealth.

### `stealth.service.ts`

Interfaz al `StealthEngine`. Gestiona el perfil activo y expone métodos de `cursor`, `typing`, y `session`.

### `storage.service.ts`

Wrapper tipado sobre `chrome.storage.local` con métodos `get<T>`, `set`, `remove`.

### `message.service.ts`

`MessageService` con patrón pub/sub sobre `chrome.runtime.sendMessage`:

- `on(type, handler)` — registra handler
- `send(type, payload)` — envía mensaje al SW
- `broadcast(type, payload)` — envía a todos los tabs y side panel

### `logger.service.ts`

Logger estructurado con prefijo de módulo. Inyecta automáticamente el prefijo del entorno de runtime activo en **todos** los mensajes:

```typescript
const log = Logger.create('MiModulo')
log.info('mensaje')
// → [SIMULATION][SEF:MiModulo] mensaje
```

### `runtime.service.ts`

Punto único de consulta para el entorno de runtime. Los servicios y factories leen el modo siempre a través de esta interfaz; nunca acceden directamente al store.

```typescript
getMode(): RuntimeMode             // 'simulation' | 'staging' | 'production'
getCapabilities(): RuntimeCapabilities
isSimulation(): boolean
isStaging(): boolean
isProduction(): boolean
getLogPrefix(): string             // 'SIMULATION' | 'STAGING' | 'PRODUCTION'
```

Los servicios de `scraping` y `outreach` aplican el Strategy Pattern y se documentan en las secciones [16](#16-servicio-de-scraping-strategy-pattern) y [17](#17-servicio-de-outreach-strategy-pattern).

---

## 22. Background Service Worker

**Archivo:** `src/background/index.ts`

### Responsabilidades

1. **Inicialización** al instalar/actualizar/arrancar el navegador.
2. **Handlers de mensajes** para Energy, Session, Stealth, Ping y **Scraping**.
3. **Alarmas** periódicas:
   - `ENERGY_REFILL` — cada 60 minutos: recarga energía y hace broadcast.
   - `SESSION_CLEANUP` — cada 5 minutos: limpieza de sesiones.
   - `HEARTBEAT` — cada 30 segundos: mantiene el SW activo.
4. **Side Panel** — abre automáticamente al hacer clic en el icono de la barra.
5. **Eventos de tab** — log de activación, carga y cierre de pestañas.
6. **First install** — abre la página de opciones al instalar por primera vez.

### Handlers de scraping

Registrados en `registerMessageHandlers()` via el singleton `scrapingOrchestrator`:

```typescript
import { scrapingOrchestrator } from '@services/scraping/scraping.orchestrator'

messageService.on(MessageType.SCRAPING_START, (payload) => scrapingOrchestrator.start(payload))
messageService.on(MessageType.SCRAPING_PAUSE, () => scrapingOrchestrator.pause())
messageService.on(MessageType.SCRAPING_RESUME, () => scrapingOrchestrator.resume())
messageService.on(MessageType.SCRAPING_CANCEL, () => scrapingOrchestrator.cancel())
```

El orchestrator emite los mensajes de vuelta al sidepanel directamente via `chrome.runtime.sendMessage()` (no usa `messageService.broadcast` para evitar enviar a todas las pestañas).

---

## 23. Tests

### Estructura

```
tests/
├── setup.ts                      ← Configuración global Vitest
├── automation/
│   └── actions.test.ts
├── e2e/
│   └── stealth.spec.ts           ← Tests Playwright
├── services/
│   ├── energy.service.test.ts
│   ├── logger.service.test.ts
│   ├── outreach.factory.test.ts  ← Factory devuelve clase correcta por modo
│   ├── outreach.simulation.test.ts ← SimulationOutreachService (resultados simulados)
│   ├── runtime.service.test.ts   ← getMode, isSimulation, capabilities, log prefix
│   ├── scraping.factory.test.ts  ← Factory devuelve clase correcta por modo
│   └── storage.service.test.ts
└── stealth/
    ├── bezier.test.ts
    ├── cursor.engine.test.ts
    └── typing.engine.test.ts
```

> **Estado actual:** 11 archivos de test · 48 tests · todos en verde ✅

### Comandos

```bash
npm test                  # Vitest run (una vez)
npm run test:watch        # Vitest en modo watch
npm run test:coverage     # Con reporte de cobertura
npm run test:e2e          # Playwright E2E
```

---

## 24. Comandos de Desarrollo

```bash
# Desarrollo
npm run dev               # Vite dev server con HMR

# Build
npm run build             # tsc + vite build + zip de la carpeta dist/

# Calidad de código
npm run lint              # ESLint
npm run lint:fix          # Auto-fix
npm run format            # Prettier
npm run format:check      # Verificar formato

# Tests
npm test
npm run test:watch
npm run test:coverage
npm run test:e2e
```

### Instalar la extensión en Chrome

1. `npm run build` → genera `dist/` y un ZIP en `release/`
2. Abrir `chrome://extensions`
3. Activar "Modo desarrollador"
4. "Cargar sin empaquetar" → seleccionar la carpeta `dist/`
5. Hacer clic en el icono en la barra → se abre directamente el Side Panel

### Configuración de VS Code

`.vscode/settings.json` establece TypeScript SDK del workspace para que el editor use TypeScript 5.8.3 (en lugar del bundled de VS Code):

```json
{ "typescript.tsdk": "node_modules/typescript/lib" }
```

> **Importante:** Al abrir el proyecto, VS Code pedirá seleccionar la versión de TypeScript. Seleccionar **"Use Workspace Version (5.8.3)"** para evitar errores de tipos false-positive con React 19 + `@types/react@19`.

---

## 25. Historial de Desarrollo

### Fase 1 — Fundación del proyecto

**Lo que se construyó:**

- Scaffolding inicial con Vite + React + TypeScript + `@crxjs/vite-plugin`
- Manifest MV3 con todas las superficies (popup, sidepanel, options, content script, background SW)
- Sistema de tipos dominio completo (`contact.types`, `energy.types`, `stealth.types`, etc.)
- Motor Stealth completo: `CursorEngine` (Bézier), `TypingEngine` (errores tipográficos), `SessionEngine` (fatiga y pausas)
- Tres perfiles de comportamiento: `normal-user`, `power-user`, `slow-user`
- Energy system: service, store, config, costes por acción
- Servicios base: logger, storage, message, session
- Background Service Worker con alarmas y handlers de mensajes

### Fase 2 — Sistema de UI y Temas

**Lo que se construyó:**

- Librería de componentes UI estilo shadcn (badge, button, card, dialog, dropdown, input, label, progress, select, separator, skeleton, slider, switch, table, tabs, textarea, tooltip, scroll-area)
- Sistema de temas OKLCH con 6 temas: Twitter, Perpetuity, Cosmic Night, Violet Bloom, Mocha Mousse, Elegant Luxury
- `ThemeProvider` + `ThemeSelector` + `useThemeStore` con persistencia
- Layout principal: `AppShell` → `Header` + `Navigation` + vistas
- **Corrección crítica:** tokens de color Tailwind v4 con `@theme inline` para resolver transparencias en componentes Radix UI

### Fase 3 — Internacionalización y Settings

**Lo que se construyó:**

- Sistema i18n completo con `react-i18next` (inglés + español)
- Selector de idioma en Header (dropdown con flags emoji)
- `SettingsView` rediseñado como página de configuración con tarjetas
- Cards de selección de tema en Settings (con swatches de color)
- Módulo AI Store: `useAIStore` con `provider`, `apiKey`, `model`, `connectionStatus`
- Selector de modelo de IA en Settings (8 modelos OpenAI, 4 Grok, 4 Google)
- `AIProvider` interface con 3 implementaciones (OpenAI, Grok, Google)

### Fase 4 — InvestigationView y formulario de campaña

**Lo que se construyó:**

- Rediseño completo de `InvestigationView` con 3 fases: form → analyzing → report
- Archivos de constantes `affinity.ts`: 10 categorías × 5-7 subcategorías, 17 idiomas, 25 países
- Formulario de campaña con `CampaignBrief`: tipo de contacto, afinidad, idioma, país, consistencia, descripción
- Módulo de energía visual: anillo SVG + LED badges + power bar
- Generación de informe de campaña con IA (prompt detallado con 8 secciones estructuradas)
- Renderización Markdown del informe con `react-markdown` y renderers personalizados
- Campo `reportLanguage` en `CampaignBrief` para forzar idioma del informe según UI
- `DashboardView` como proxy a `InvestigationView`

### Fase 5 — Navegación y pulido

**Lo que se construyó:**

- Rediseño de `Navigation`: 6 tabs icono-only, `flex-1`, pill style (`rounded-lg`), activo `bg-primary`
- Eliminado tab `investigation` de la nav (accesible via dashboard)
- Scrollbar ocultado visualmente: `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
- Eliminación del color ladder en el módulo de energía → colores nativos del tema (`text-primary`)

### Fase 6 — Correcciones TypeScript

**Problema resuelto:** 756 errores de compilación en VS Code causados por:

1. `React.FC` en tipo de array de iconos sin importar `React`
2. VS Code usando TypeScript bundled (antiguo) incompatible con `@types/react@19`

**Soluciones:**

1. Cambiado tipo de icono a `LucideIcon` (importado de `lucide-react`)
2. Añadido `"jsxImportSource": "react"` en `tsconfig.app.json`
3. Creado `/.vscode/settings.json` con `"typescript.tsdk": "node_modules/typescript/lib"`

### Fase 7 — Side Panel directo (sin diálogo)

**Problema resuelto:** Chrome mostraba un diálogo de selección (Popup vs Side Panel) al hacer clic en el icono.

**Solución:**

1. Eliminado `default_popup` del `manifest.config.ts`
2. Cambiado `openPanelOnActionClick: false` → `true` en el Service Worker
3. Añadido `chrome.action.onClicked` listener para `chrome.sidePanel.open({ tabId })`

### Fase 8 — ContactsView rediseñada

**Lo que se construyó:**

- Vista de contactos completamente rediseñada con 5 datos mock de demostración
- Tabla expandible (acordeón inline): empresa + URL verde + categoría badge + expand
- Accordion body: grid de datos, email clicable, tags temáticos, barra de afinidad con tooltip
- `ScoreBar` con icono `Star`, barra de progreso, porcentaje y tooltip explicativo `ⓘ`
- `CategoryBadge` con colores codificados por tipo (azul/verde/púrpura/naranja/cian)
- Compositor de mensaje como sub-acordeón bajo botón "Mensaje":
  - Input de asunto + Textarea de cuerpo
  - Contador de caracteres en tiempo real
  - Botón Enviar (deshabilitado si vacío, feedback "✓ Enviado")

### Fase 9 — Sistema de Informes, conexión de stores e i18n completo

**Lo que se construyó / corrigió:**

- Tipo `Report` unificado: eliminados `ReportData` e `InformeRecord` redundantes. Nuevo tipo plano con todos los campos necesarios (stats, categorías, config).
- `useReportsStore.addReport()` acepta `Omit<Report, 'id'>` en lugar de campos individuales.
- `ReportsView` reescrita:
  - Selector de campaña conectado a `useCampaignStore` (campañas reales, demo solo si store vacío)
  - `getCampaignStats(campaign, contacts)` calcula estadísticas reales desde datos del store
  - Campo "Cliente" para destinatario del informe (aparece como "Preparado para:" en PDF)
  - Informes se persisten en `useReportsStore` (no `useState` local)
  - PDFs integran datos de empresa (`useBusinessStore`): logo, companyName, NIF, teléfono, email
  - `fileNamePrefix`, `includeDate` leídos de `useSettingsStore`
  - Análisis de investigación (markdown) incluido como pestaña y en PDF separado
- `HistoryView` conectada a stores reales: `useCampaignStore`, `useContactsStore`, `useReportsStore`. Función `campaignToHistory()` construye records desde campañas reales (status completed/failed).
- `CampaignsView` limpiada: datos mock solo como fallback (if store empty).
- `SettingsView` i18n completa: todas las cadenas hardcoded reemplazadas por `t()` calls.
- `InvestigationView` i18n: tipos de contacto, "Recargar", "Potencia de envío" usan `t()`.
- `en.json` y `es.json` reescritos: ~300 líneas cada uno con ~80 nuevas keys cubriendo todas las vistas.
- Documentación técnica (`docs/vibe.md`) actualizada con todos los cambios.

### Fase 10 — Arquitectura de Entornos de Runtime

**Lo que se construyó:**

- **`RuntimeMode` y `RuntimeCapabilities`** (`src/core/types/runtime.types.ts`): tipo union `'simulation' | 'staging' | 'production'` e interfaz de capabilities con 7 campos.
- **`RUNTIME_CAPABILITIES`** (`src/config/runtime.config.ts`): matriz de configuración por entorno. Modo por defecto: `'simulation'`.
- **`useRuntimeStore`** (`src/store/runtime.store.ts`): store Zustand persistido en `sef:runtime`. Expone `mode` y `setMode`.
- **`RuntimeService`** (`src/services/runtime.service.ts`): 6 funciones exportadas (`getMode`, `getCapabilities`, `isSimulation`, `isStaging`, `isProduction`, `getLogPrefix`). Punto único de consulta para el entorno activo.
- **Servicio de scraping — Strategy Pattern** (`src/services/scraping/`): interfaz `ScrapingService`, 3 implementaciones (`simulation` mock, `staging` delega+timing, `production` fetch real+DOMParser), factory con caché de instancia.
- **Servicio de outreach — Strategy Pattern** (`src/services/outreach/`): interfaz `OutreachService` con `sendEmail`, `submitForm`, `sendLinkedInMessage`. 3 implementaciones (`simulation` solo logs, `staging` rate limiter token bucket, `production` acciones reales), factory con caché.
- **Motor de afinidad** (`src/engine/affinity/affinity.engine.ts`): `scoreAffinity()` — scoring IA vía `AIProvider.evaluate()` con fallback heurístico de keyword-overlap.
- **Motor de campaña** (`src/engine/campaign/campaign.engine.ts`): `executeCampaign()` — pipeline de 5 pasos (discover → evaluate → generate → outreach → report). Genera informe de simulación automáticamente cuando `isSimulation() === true`.
- **Tipos de campaña-motor** (`src/core/types/campaign-engine.types.ts`): `CampaignProgress`, `CampaignExecutionResult`, `ContactOutreachResult`, `EnergyUsage`.
- **Tipos de afinidad** (`src/core/types/affinity.types.ts`): `AffinityResult`, `AffinityInput`, `AffinityClassification`.
- **`SimulationReportData`** añadido a `src/core/types/report.types.ts` como campo opcional `simulation?` en `Report`.
- **Logger actualizado** (`src/services/logger.service.ts`): prefijo de entorno inyectado en todos los mensajes (`[SIMULATION]`, `[STAGING]`, `[PRODUCTION]`).
- **`SettingsView` actualizada** (`src/sidepanel/views/SettingsView.tsx`): selector de entorno (radio cards) visible solo cuando `debugMode === true`. Incluye advertencia al seleccionar `production`.
- **`CampaignsView` actualizada** (`src/sidepanel/views/CampaignsView.tsx`): `handleSend()` invoca `executeCampaign()` del motor de campaña.
- **i18n** (`en.json`, `es.json`): añadidas keys `settings.runtime.*` para el panel de developer.
- **4 nuevos archivos de test**: `runtime.service.test.ts` (6 tests), `outreach.factory.test.ts` (3), `scraping.factory.test.ts` (3), `outreach.simulation.test.ts` (3). Total: 48 tests en 11 archivos — todos en verde ✅.
- **Build verificado**: `npx vite build` exitoso en 5.16s sin warnings.

---

### Fase 11 — Auditoría de código y correcciones críticas

**Problema:** Revisión completa del código para detectar funciones incompletas, inconsistencias de nombres entre archivos y errores de flujo.

**Bugs encontrados y corregidos:**

1. **AffinityEngine — método IA incorrecto**
   - **Bug:** `affinity.engine.ts` llamaba a `provider.analyzePrompt()`, que inyecta un prompt estructural JSON conflictiente con el prompt de scoring de afinidad.
   - **Solución:** Añadido método `evaluate(prompt): Promise<AIResponse<string>>` a la interfaz `AIProvider` y las 3 implementaciones (OpenAI, Grok, Google). `scoreAffinity()` ahora llama a `provider.evaluate()` + regex para extraer el JSON.

2. **AIStore — getters obsoletos en Zustand**
   - **Bug:** Propiedades `get apiKey()`, `get provider()`, `get model()` en el objeto de estado Zustand se evaluaban como snapshots estáticos en cada llamada a `set()`, produciendo valores siempre desactualizados.
   - **Solución:** Eliminados todos los getters. Añadidos selectores funcionales exportados: `selectActiveConfig` y `selectApiKey`. `InvestigationView` actualizado a `useAIStore(selectApiKey)`.

3. **Factories — assert no-null incorrecto**
   - **Bug:** `scraping.factory.ts` y `outreach.factory.ts` retornaban `cached` que TypeScript no podía narrowar a non-null tras el switch exhaustivo.
   - **Solución:** `return cached!` con non-null assertion.

**Resultado:** Build limpio, 48/48 tests en verde.

---

### Fase 12 — Sistema de scraping real con Google

**Objetivo:** Implementar scraping real visible en el navegador desde el panel lateral.

**Lo que se construyó:**

#### Tipos e infraestructura de mensajes

- **`ActionCostKey`** extendido con `'scrapeUrl'` (1 unidad = 10 páginas / 1% energía).
- **`ACTION_COSTS`** actualizado con `scrapeUrl: 1`.
- **8 nuevos `MessageType`s:** `SCRAPING_START`, `SCRAPING_PAUSE`, `SCRAPING_RESUME`, `SCRAPING_CANCEL`, `SCRAPING_PROGRESS`, `SCRAPING_CONTACT`, `SCRAPING_COMPLETE`, `SCRAPING_ERROR`.
- **`MessagePayloadMap`** completado con tipos detallados para cada mensaje de scraping.

#### ScrapingOrchestrator (`src/services/scraping/scraping.orchestrator.ts`)

Nuevo servicio singleton en background SW:

- Abre y gestiona **un tab visible** en Chrome (`chrome.tabs.create`) — el usuario ve cada página cargarse en tiempo real.
- **Fase Google:** pagina `google.com/search` con 4 variantes de query, extrae URLs via `chrome.scripting.executeScript(_extractGoogleResults)`.
- **Detección de CAPTCHA/consentimiento:** pausa automática.
- **Fase contactos:** visita cada URL, extrae emails + metadatos via `_extractPageContacts()`. Fallback a subpágina `/contact` si no hay emails en raíz.
- **Energía:** `energyService.consume('scrapeUrl')` por URL; se detiene limpiamente si se agota.
- **Streaming:** envía `SCRAPING_CONTACT` al sidepanel por cada contacto, `SCRAPING_PROGRESS` por cada página.
- **Cierre de tab:** auto-cancela si el usuario cierra manualmente el tab.
- **Delays anti-bot:** jitter de 800–3000 ms entre navegaciones.

#### Background Service Worker

- Importa el singleton `scrapingOrchestrator`.
- Registra 4 handlers: `SCRAPING_START/PAUSE/RESUME/CANCEL`.

#### InvestigationView — rediseño del flujo de scraping

- **`handleStartScraping()`** reescrito: envía `SCRAPING_START` via `messageService.send()` en lugar de llamar a `createScrapingService()` directamente.
- **`useEffect` listener:** `chrome.runtime.onMessage.addListener()` con guard `typeof chrome !== 'undefined'`. Procesa `SCRAPING_PROGRESS`, `SCRAPING_CONTACT`, `SCRAPING_COMPLETE`, `SCRAPING_ERROR`.
- **Contactos en tiempo real:** cada `SCRAPING_CONTACT` crea un `Contact` y lo añade a `useContactsStore` + `useInvestigationStore` inmediatamente.
- **Slider de objetivo:** `<Slider min={100} max={10000} step={100}>` en la fase `report`, antes del botón de inicio. Muestra aviso si `targetCount > energy.current`.
- **Controles Pausar/Reanudar/Cancelar:** en la fase `scraping`, botones contextuales según `scrapingStatus`.
- **Estado adaptativo:** título cambia a "Pausado — Clic en Reanudar" cuando `status === 'paused'`.

#### Correcciones adicionales

- **ErrorBoundary:** `getDerivedStateFromError` captura el mensaje de error; `componentDidCatch` escribe el stack al `console.error`; el error se muestra visualmente bajo el botón "Reintentar".
- **`Tooltip must be used within TooltipProvider`:** La fase `report` de `InvestigationView` fue envuelta con `<TooltipProvider>` porque el slider de objetivo incluye un `<InfoTip>`.
- **Vite config:** Añadido `build.chunkSizeWarningLimit: 600` para eliminar el warning de chunks >500 kB.

#### i18n

Nuevas claves añadidas a `en.json` y `es.json`:

| Clave                              | EN                             | ES                               |
| ---------------------------------- | ------------------------------ | -------------------------------- |
| `investigation.targetCountLabel`   | Contact Target                 | Objetivo de Contactos            |
| `investigation.targetCountTooltip` | tooltip energía                | tooltip energía                  |
| `investigation.pauseScraping`      | Pause                          | Pausar                           |
| `investigation.resumeScraping`     | Resume                         | Reanudar                         |
| `investigation.cancelScraping`     | Cancel                         | Cancelar                         |
| `investigation.scrapingPaused`     | Paused — Click Resume          | Pausado — Clic en Reanudar       |
| `investigation.energyWarning`      | Only `{{available}}` energy... | Solo `{{available}}` unidades... |

---

## 26. Decisiones de Diseño y Convenciones

### Convenciones de código

- **Componentes:** PascalCase, archivos `.tsx`
- **Hooks:** camelCase con prefijo `use`, archivos `.ts`
- **Stores:** camelCase con prefijo `use` + sufijo `Store`
- **Tipos:** PascalCase en archivos `*.types.ts`
- **Servicios:** camelCase con sufijo `Service`, instancia singleton exportada
- **Constantes:** SCREAMING_SNAKE_CASE

### Alias de paths (tsconfig)

```
@/*        → src/*
@core/*    → src/core/*
@engine/*  → src/engine/*
@services/* → src/services/*
@hooks/*   → src/hooks/*
@components/* → src/components/*
@store/*   → src/store/*
@utils/*   → src/utils/*
@config/*  → src/config/*
```

### Principios de UI

- **Sin scroll visible** — scrollbar funcional pero invisible
- **Colores nativos del tema** — todos los componentes usan variables CSS del tema activo (`text-primary`, `bg-primary`, etc.), nunca colores hardcoded
- **Tooltips en elementos complejos** — `TooltipProvider` + `InfoTip` en campos que necesitan explicación
- **Datos mock para desarrollo** — `ContactsView` usa datos de demostración como fallback cuando el store de contactos está vacío; los contactos reales se poblan via `ScrapingOrchestrator`
- **Tailwind v4** — usar `@theme inline` en `globals.css` para todos los tokens de color; no usar `tailwind.config.ts` para colores custom

### Seguridad

- Las API Keys se almacenan en `chrome.storage.local` (aislado por extensión, no accesible desde web)
- No se registran API Keys en el logger
- Los `host_permissions` cubren `https://*/*` para permitir scraping; restringir en producción si aplica
- Requests a APIs de IA son directos desde el side panel (no pasan por un proxy propio)

### Arquitectura de Entornos de Runtime

- **Strategy Pattern** — cada servicio con efectos externos (`scraping`, `outreach`) tiene tres implementaciones (`simulation`, `staging`, `production`). El código consumidor nunca comprueba el modo directamente.
- **Factory Pattern** — `createScrapingService()` y `createOutreachService()` resuelven la implementación correcta en un único punto. Las instancias se cachean y se invalidan automáticamente cuando cambia el modo.
- **Sin `NODE_ENV`** — las extensiones de Chrome no exponen `process.env`. El modo de runtime se controla exclusivamente a través de `useRuntimeStore` (persistido en `chrome.storage.local`) y del panel de developer en `SettingsView`.
- **Prefijo de log automático** — `LoggerService` inyecta `[SIMULATION]`, `[STAGING]` o `[PRODUCTION]` en todos los mensajes, facilitando la depuración multi-entorno.

---

## 27. Roadmap y Trabajo Pendiente

### Completado (Fases 1–10)

- [x] Sistema de entornos de runtime con Strategy Pattern (simulation/staging/production)
- [x] Motor de campaña `executeCampaign()` con pipeline de 5 pasos
- [x] Motor de afinidad con scoring IA + fallback heurístico por overlap de keywords
- [x] Servicio de scraping con 3 implementaciones (simulation/staging/production)
- [x] Servicio de outreach con 3 implementaciones (simulation/staging/production)
- [x] Panel de control de entorno en `SettingsView` (visible solo en modo debug)
- [x] Generación automática de informes de simulación al finalizar campaña
- [x] Logger con prefijo de entorno inyectado en todos los logs
- [x] 48 tests en 11 archivos de test — todos en verde

### Completado (Fase 11 — Auditoría)

- [x] `evaluate()` añadido a `AIProvider` interface + 3 implementaciones
- [x] `affinity.engine.ts` corregido: usa `provider.evaluate()` en lugar de `provider.analyzePrompt()`
- [x] `ai.store.ts`: eliminados getters obsoletos de Zustand; añadidos selectores `selectActiveConfig` + `selectApiKey`
- [x] Factories: aserciones non-null `cached!` en `scraping.factory.ts` y `outreach.factory.ts`

### Completado (Fase 12 — Scraping Real)

- [x] `ScrapingOrchestrator` implementado en background SW (tab visible, paginación Google, extracción de contactos)
- [x] 8 `MessageType` SCRAPING\_\* con `MessagePayloadMap` completo
- [x] 4 handlers de scraping en Background SW (`START/PAUSE/RESUME/CANCEL`)
- [x] `InvestigationView` reescrita: slider 100–10,000 contactos, controles pausa/reanudar/cancelar, listener en tiempo real
- [x] Fix `Tooltip must be used within TooltipProvider` (fase `report` envuelta en `<TooltipProvider>`)
- [x] `ErrorBoundary` mejorado con visualización del error y `componentDidCatch`
- [x] 7 nuevas keys i18n (en + es) para controles de scraping
- [x] `build.chunkSizeWarningLimit: 600` en Vite config

### Inmediato

- [ ] Integrar `ProductionOutreachService` con SMTP real y LinkedIn API
- [ ] Feedback visual en `CampaignsView` del progreso de `executeCampaign()` (paso a paso)
- [ ] Conectar motor de afinidad real al pipeline de scraping para scoring automático de contactos

### Medio plazo

- [ ] Detección avanzada de CAPTCHA con pausa guiada al usuario
- [ ] Sistema de cola de campañas con estado `queued → running → completed`
- [ ] Soporte más idiomas en i18n (actuales: `en`, `es`)
- [ ] Exportación de contactos a CSV/Excel

### Largo plazo

- [ ] Dashboard real con métricas de campañas (contactos descubiertos, tasa de respuesta)
- [ ] Modo de preview antes de enviar mensajes
- [ ] Gestión de follow-ups automáticos
- [ ] Soporte para LinkedIn y otras redes profesionales
- [ ] Panel de analytics de outreach

---

_Documentación generada el 18 de marzo de 2026 · Vibe Reach v1.3.0_
