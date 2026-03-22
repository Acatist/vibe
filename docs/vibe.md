# Vibe Reach — Documentación Técnica de Desarrollo

> **Versión:** 2.0.0  
> **Última actualización:** 22 de marzo de 2026  
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

> Fases implementadas: 1–18 · Build limpio · 48 tests en verde ✅

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

### Scrollbars temáticos

Todos los scrollbars de la extensión son **visibles y teñidos automáticamente** por el tema activo. El bloque de estilos se define en `src/styles/globals.css` fuera de `@layer base` (para tener mayor especificidad en el contexto de la extensión):

```css
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: oklch(var(--border)) oklch(var(--muted));
}

/* Chromium / Chrome Extension (único motor relevante) */
::-webkit-scrollbar        { width: 6px; height: 6px; }
::-webkit-scrollbar-track  { background: oklch(var(--muted)); border-radius: 999px; }
::-webkit-scrollbar-thumb  { background: oklch(var(--border)); border-radius: 999px;
                              border: 1px solid oklch(var(--muted)); }
::-webkit-scrollbar-thumb:hover { background: oklch(var(--primary));
                                   border-color: oklch(var(--primary)); }
::-webkit-scrollbar-corner { background: oklch(var(--muted)); }
```

| Elemento | Variable CSS | Aspecto |
|---|---|---|
| Track (fondo) | `--muted` | Carril tenue |
| Thumb (pastilla) | `--border` | Handle sutil |
| Thumb hover | `--primary` | Acento del tema |

Al cambiar de tema o de modo claro/oscuro, los scrollbars se actualizan automáticamente sin JavaScript.

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
  <div className="flex-1 overflow-y-auto">
    <main className="p-4 min-h-full flex flex-col">
      <div key={activeTab} className="animate-fade-in flex flex-col flex-1">
        <ErrorBoundary>
          <ActiveView onNavigate={setActiveTab} />
        </ErrorBoundary>
      </div>
    </main>
  </div>
</div>
```

- Los scrollbars son **visibles y temáticos** (ver sección 6 — Scrollbars temáticos).
- `<main>` está **permanentemente montado** con `min-h-full` — el contenedor de scroll nunca ve un estado vacío y no parpadea al cambiar de tab.
- La vista activa se monta via `VIEW_MAP[activeTab]`, un mapa de `TabId → React.ComponentType`.
- `key={activeTab}` se aplica al `<div>` interior (no a `<main>`) para re-montar solo el contenido con animación fade-in sin recrear el scroll container.

#### Listener global de mensajes de scraping

`AppShell` aloja el listener de mensajes de scraping porque **persiste en el árbol React** incluso cuando el usuario navega entre vistas. Si el listener estuviera en `InvestigationView`, se desmontaría al navegar a `ContactsView` y se perderían todos los mensajes del orchestrator.

```typescript
// useEffect registrado al montar AppShell (una sola vez, sin dependencias)
chrome.runtime.onMessage.addListener((msg) => {
  const { type, payload: p } = msg

  SCRAPING_PROGRESS → si status ‘running’/‘paused’: setLiveScrapingProgress({ pagesScanned, ... })
                    → si status terminal: setLiveScrapingDone()
                    → siempre: useEnergyStore.setState({ current: p.energyLeft })

  SCRAPING_CONTACT  → construye Contact desde p.contact + activeBrief del store
                    → addContacts([contact]) en useContactsStore
                    → addContactIds(p.invId, [contact.id]) en useInvestigationStore

  SCRAPING_COMPLETE → setScrapeStatus(p.invId, 'done')
                    → completeInvestigation(p.invId)
                    → setLiveScrapingDone()
                    → setLastFinishReason(p.finishReason)

  SCRAPING_ERROR    → setScrapeStatus(p.invId, 'error')
                    → setLiveScrapingDone()
})
```

En el mismo `useEffect` se envía `ENERGY_GET` al background para sincronizar el nivel real de energía en cuanto el sidepanel monta (sin esperar al primer broadcast de scraping).

`activeBrief` (`{ affinityCategory, affinitySubcategory, contactType }`) se lee via `useInvestigationStore.getState().activeBrief` (fuera del render loop) para construir los objetos `Contact` en el handler de `SCRAPING_CONTACT`.

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

### Hook `useEnergy` (`src/hooks/useEnergy.ts`)

```typescript
const { energy, energyPercent, isInfinite, consume, refill } = useEnergy()
```

En cada montaje, `useEnergy` envía `ENERGY_GET` al background SW para obtener el nivel real de energía. Esto hace que el anillo y la barra reflejen el estado correcto al abrir el sidepanel, sin esperar al primer broadcast de scraping.

El store ya **no usa persist middleware** ni acopla al `EnergyService` local (que antes actúa como fuente de verdad en el sidepanel y siempre valía 1000). La fuente de verdad es únicamente el `EnergyService` del Background SW.

#### Arquitectura de sincronización de energía

```
Background SW (EnergyService)          Side Panel (useEnergyStore)
─────────────────────────────          ──────────────────────────
consumir por scrapeUrl           ───→  useEnergyStore.setState({ current: energyLeft })
  (vía SCRAPING_PROGRESS broadcast)         ↑
                                       ENERGY_GET en mount
                                       (AppShell + useEnergy)
Refill/Reset/Consume desde UI     ───→ messageService.send() → handler background
  (optimistic update local)              → _syncFromBackground() para confirmar
```

Mutaciones desde la UI (botón Recargar, etc.) actualizan el store optimistamente Y envían el mensaje correspondiente al background. Tras la respuesta, se re-sincroniza el estado exacto.

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

Vista central del flujo de trabajo. Fases: `form` → `analyzing` → modal de informe → navega a `ContactsView`.

#### Fase `form` (formulario de campaña)

**Módulo de Energía (Card 1)** — anillo SVG + badges LED + power bar (igual que antes).

**Selector de tipo de contacto** — 3 botones: Empresa, Particular, Institucional.

**Modos de scraping (sin card, inline):**

- `fast` — heurística local, sin llamadas a IA por página, threshold bajo.
- `precise` — scoring IA por candidato + pre-seeding de URLs target vía `generateSearchTargets()`, threshold alto.

**Filtros de campaña (Card 2)** — categoría, subcategoría, idioma, país, slider consistencia.

**Detalles y opciones (Card 3):**

- `Textarea` de descripción libre.
- Toggle `generateReport` — si activo, se genera informe IA antes de iniciar el scraping.
- Slider de objetivo de contactos (100–10,000 step 100) con aviso de energía insuficiente.

**Botón CTA `handleAcceptAndContinue()`:**

- Si `generateReport = true` → llama a `handleAnalyze()` → abre modal de informe.
- Si `generateReport = false` → crea `invId` directamente → llama a `handleStartScraping(invId)`.

#### Fase `analyzing` (spinner)

Ícono `Sparkles` con borde giratorio + skeletons de carga + texto i18n.

#### Modal de informe (`reportModalOpen`)

Diálogo que se abre sobre la vista actual (no sustituye la vista) con:

- Informe renderizado con `react-markdown` + renderers personalizados.
- Footer con botón secundario "Cancelar" y botón primario "Iniciar búsqueda" → llama a `handleStartScraping(currentInvIdRef.current)`.

#### `handleStartScraping(invId)`

```typescript
async function handleStartScraping(invId: string) {
  setActiveBrief({ affinityCategory, affinitySubcategory, contactType }) // para AppShell listener
  setScrapeStatus(invId, 'running')

  // Actualiza el store inmediatamente — no espera al primer broadcast
  setLiveScrapingProgress({ status: 'running', contactsFound: 0, currentUrl: '', total: ..., pagesScanned: 0 })

  const result = await messageService.send(MessageType.SCRAPING_START, { invId, ... })

  if (!result?.success) {
    setError(...)
    setScrapeStatus(invId, 'idle')
    setLiveScrapingDone()
    return
  }

  onNavigate('contacts') // navega a ContactsView donde está el progreso en tiempo real
}
```

> El listener de mensajes ya **no vive en `InvestigationView`** — fue movido a `AppShell` para que persista al navegar a `ContactsView`.

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

Vista de gestión de contactos descubiertos por scraping. Conectada a `useContactsStore`, `useInvestigationStore` y `useCampaignStore`.

#### Tarjeta de progreso en vivo

Mostrada en la parte superior cuando `liveScrapingStatus !== 'idle'`:

```
┌─ [ Globe animado ] Rastreando la web…          N contactos ─┐
│ Páginas analizadas     {livePagesScanned} / {maxPagesScanned} │
│ [=========================================──────────]     │
│ [ search icon ] https://url-actual.com...           │
│ [  Pausar  ]  [  Cancelar  ]                         │
└──────────────────────────────────────────────────┘
```

- **`livePagesScanned`** — dato real del orchestrator (antes se mostraba `contactsFound × 3`, corregido).
- **`maxPagesScanned`** = `min(targetCount × 5, 500)` — igual que la fórmula del orchestrator.
- **Pause/Resume/Cancel** envían `SCRAPING_PAUSE/RESUME/CANCEL` via `messageService.send()`.
- Estado pausado muestra "Rastreo pausado" con botón "Continuar" en lugar de "Pausar".

#### Banner de razón de finalización

Si `lastFinishReason` es distinto de `null` o `'target-reached'`, muestra un banner naranja con el motivo:

| Razón               | Mensaje                                                         |
| ------------------- | --------------------------------------------------------------- |
| `energy-exhausted`  | El rastreo se detuvo porque se agotó la energía.                |
| `queries-exhausted` | Se agotaron todas las búsquedas sin alcanzar el objetivo.       |
| `stalled`           | El rastreo se detuvo inesperadamente. Puedes intentar de nuevo. |
| `max-pages`         | Se alcanzó el límite de páginas sin cubrir el objetivo.         |

#### Layout de contactos

- **Tabs Relevantes / Otros:** separa contactos con `discarded: false` de `discarded: true`.
- **Contactos reales** del `useContactsStore` filtrados por `investigationId === currentId`.
- **Fallback mock** (5 contactos de demo) cuando el store está vacío.
- Acordeón con empresa, URL, email, rol, región, topics, `ScoreBar`, compositor de mensaje.
- Botón "Crear Campaña" abre un modal que llama a `createCampaign()` y navega a `CampaignsView`.

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

Gestión de configuración de la extensión. **Todos los módulos están organizados como acordeones** independientes (`rounded-xl border border-border overflow-hidden`). Sin `<Separator>` entre secciones, separados por `space-y-1.5`. Todos los textos usan `t()` para i18n.

#### Estado de acordeones

```typescript
const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ai: true })
const toggle = (key: string) =>
  setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
```

- Estado inicial: solo la sección **IA** abierta, el resto colapsado.
- Cada cabecera de acordeón muestra un `ChevronDown` que rota 180° (`transition-transform duration-200 rotate-180`) cuando la sección está abierta.

#### 8 secciones en orden

| Sección | Icono | Clave estado | Visible |
|---|---|---|---|
| IA | `Bot` | `openSections.ai` | Siempre |
| Perfil de Empresa | `Building2` | `openSections.business` | Siempre |
| Perfil de Formulario | `Shield` | `openSections.formProfile` | Siempre |
| Stealth | `ShieldCheck` | `openSections.stealth` | Siempre |
| Entorno de Ejecución | `Monitor` | `openSections.runtime` | Solo si `debugMode === true` |
| Energía | `Zap` | `openSections.energy` | Solo si `debugMode === true` |
| Exportación | `FolderDown` | `openSections.export` | Siempre |
| Apariencia | `Palette` | `openSections.theme` | Siempre |

**IA (`useAIStore`):**

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

**Perfil de Formulario (`useSettingsStore.formFallbackProfile`):**

- Editor de `FormFallbackProfile`: cargo, departamento, país, región, ciudad, industria, tamaño empresa, fuente de referencia, motivo de consulta, idioma
- Valores por defecto automáticos vía `DEFAULT_FALLBACK_PROFILE`
- Usado por `form.submit.engine.ts` para rellenar automáticamente campos de formularios en producción

**Stealth:**

- Switch de modo sigilo (comportamiento humano)
- Switch de modo depuración (logging detallado)

**Entorno de Ejecución (developer-only, `debugMode === true`):**

- Selector de modo: Simulation / Staging / Production (radio buttons tipo card)
- Al seleccionar `production` se muestra un badge de advertencia
- Persiste en `useRuntimeStore` → `sef:runtime`

**Energía (developer-only, `debugMode === true`):**

- Información del nivel actual de energía y controles de recarga/reset para pruebas

**Exportación (`useSettingsStore`):**

- Selector de carpeta vía `showDirectoryPicker()` o input manual
- Prefijo de nombre de archivo (preview dinámico)
- Switch para incluir fecha ISO en el nombre de archivo

**Apariencia:**

- Grid de temas disponibles con swatches de colores + nombre + descripción
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

- **Datos reales:** Filtra campañas con status `completed` o `failed` o `paused`. Construye `HistoryRecord` desde datos reales vía `campaignToHistory()`.
- **Fallback demo:** Muestra `DEMO_HISTORY` solo si no hay campañas finalizadas. Las entradas demo ocultas por el usuario (via `hiddenDemoIds`) se excluyen del render sin afectar al store.
- **Badge DEMO:** Cuando se muestran datos de demostración, aparece una etiqueta `demo` junto al contador de registros.
- **Stats resumen:** Campañas completadas, contactos totales, mensajes enviados.

#### Acciones de borrado

| Acción | Comportamiento |
| --- | --- |
| **Eliminar todo** (icono `Trash2` en cabecera) | Muestra confirmación inline `¿Eliminar todo? / Sí, borrar`. Para datos reales: `deleteCampaign(id)` + `deleteReport(id)` de cada informe asociado para todos los registros. Para datos demo: oculta todos en `hiddenDemoIds` (estado local). |
| **Eliminar registro** (icono `Trash2` en cada card) | Mismo comportamiento pero solo para ese registro. `stopPropagation()` evita que abra/cierre el acordeón. |

#### Diseño de cards

Cada card tiene **cabecera compacta** y **contenido expandible**:

**Cabecera:**
- Nombre de la campaña + badge de estado (`Completada` / `Fallida` / `Pausada`) con colores por tipo
- pill de canal con color por tipo (`✉ Email` azul · `💼 LinkedIn` cian · `🌐 Web` esmeralda)
- Fechas y duración en texto compacto
- Fila de stats: contactos · enviados · respuestas (solo si > 0)
- Botón `Trash2` + chevron a la derecha

**Contenido expandido — 4 secciones (pills de navegación):**

| Sección | Contenido |
| --- | --- |
| **Investigación** | Prompt completo en caja, modelo IA, duración, fuentes analizadas (si hay) |
| **Contactos** | Grid 3× (descubiertos, score medio, score máximo) + tabla de categorías con barra de progreso por categoría |
| **Envíos** | Barra de progreso enviados/total, tasa de respuesta como barra, asunto del mensaje, badge de informes generados |
| **Timeline** | Lista dot-line connector con emoji, texto y fecha; colores por tipo (`success`=primary, `error`=destructive, `info`=muted) |

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

## 17. ScrapingOrchestrator — Motor de Scraping Multi-Motor

**Archivos:**

- `src/services/scraping/scraping.orchestrator.ts` — Orquestador principal (Background SW)
- `src/services/scraping/scraping.scorer.ts` — Evaluador de candidatos (heurístico + IA)

El `ScrapingOrchestrator` es el núcleo del sistema de scraping real. Se ejecuta **exclusivamente en el Background Service Worker** y orquesta todo el ciclo de vida de una sesión de scraping real con cuatro motores de búsqueda.

### Arquitectura general

```
Side Panel                    Background SW                    Chrome Tab (fondo)
──────────                    ─────────────                    ──────────────────
[SCRAPING_START] ──────────→  ScrapingOrchestrator.start()
                               ├─ chrome.tabs.create(active:false) → Tab oculto
                               ├─ Fase seeding (precise): AI seed URLs
                               ├─ Loop principal:
                               │   _fetchNextSearchPage()  ─────→ Google/DDG/Bing/Yahoo
                               │   executeScript(extractor)       SERP cargada
                               │   _extractWithSubpageProbing() → Página empresa
                               │   scoreHeuristic / scoreWithAI
                               │   energyService.consume('scrapeUrl')
[SCRAPING_PROGRESS] ←──────── │  broadcast por cada página
[SCRAPING_CONTACT]  ←──────── │  broadcast por cada candidato (aceptado o descartado)
[SCRAPING_COMPLETE] ←──────── └─ fin del loop → _finishRun()
```

### Motores de búsqueda (round-robin)

| Motor        | URL base                          | Extractor                     |
| ------------ | --------------------------------- | ----------------------------- |
| `google`     | `google.com/search?q=…&start=N`   | `_extractGoogleResults()`     |
| `duckduckgo` | `html.duckduckgo.com/html/?q=…`   | `_extractDuckDuckGoResults()` |
| `bing`       | `bing.com/search?q=…&first=N`     | `_extractBingResults()`       |
| `yahoo`      | `search.yahoo.com/search?p=…&b=N` | `_extractYahooResults()`      |

- Se itera en round-robin: si un motor devuelve bloqueo (CAPTCHA), se marca `blocked` y se salta.
- Si devuelve 0 resultados, se marca `exhausted` y se salta.
- Cuando todos los motores estan bloqueados/agotados para la variante actual, se pasa a la siguiente variante de query y se resetean los motores.

### Variantes de query (`_buildQueryVariants`)

Se generan **12 variantes** a partir del brief para maximizar la diversidad de URLs:

```typescript
;[
  `{sub} {cat} {país} {tipología} email contact`,
  `{sub} {cat} {país} {tipología} contact us`,
  `{sub} {cat} "contact" "email" {país}`,
  `{sub} {typeLabel} directory {país}`,
  `list of {sub} {typeLabel} {país}`,
  `top {sub} {typeLabel} {país}`,
  `{query_libre} {país} email`,
  `{query_libre} contact {tipología}`,
  `{sub} {país} association members`,
  `{sub} {país} network`,
  `"{sub}" {país} contact email`,
  `{sub} {cat} site:.{tld}`,
]
```

### Deduplicación triple capa + historial persistente

#### ScrapingHistory (persistente entre sesiones)

```typescript
class ScrapingHistory {
  // Persiste en chrome.storage.local
  STORAGE_KEY_DOMAINS = 'vibe:scraped-domains'
  STORAGE_KEY_EMAILS  = 'vibe:scraped-emails'

  hasDomain(url) / addDomain(url)
  hasEmail(email) / addEmail(email)
  save()  // llamado cada 10 páginas + al finalizar la sesión
}
```

#### Dedup por URL (triple check)

En cada iteración se verifica:

1. `s.visitedUrls.has(normUrl)` — Set en sesión actual
2. `history.hasDomain(normUrl)` — historial persistente entre sesiones
3. `isBlockedDomain(url)` — lista negra de dominios (redes sociales, buscadores, etc.)

#### Dedup por email

1. `s.seenEmails.has(e)` — Set en sesión actual
2. `history.hasEmail(e)` — historial persistente entre sesiones

### Flujo de ejecución del loop principal (`_run`)

```
1. [Precise] _fetchAISeedTargets() → AI genera hasta 20 URLs semilla
2. while (running && contactsFound < target && pagesScanned < maxPages && errors < MAX):
   a. urlQueue vacía → _fetchNextSearchPage() (round-robin engines)
   b. pop url → triple dedup check
   c. _consumeEnergy('scrapeUrl')
   d. _navigateTo(url) → _runInTab(_isBlockedPage)
   e. [SERP] _runInTab(_humanScrollSerp) + _delay + _runInTab(_humanHoverSerpResults)
   f. [SERP] _runInTab(extractor) → _enqueueUrls(results)
   g. [Página] _extractWithSubpageProbing(url) → tries /contact, /about, /team, /impressum...
   h. freshEmails = filter seenEmails/history
   i. _evaluateAndAccept(url, pageData) → scoreHeuristic/scoreWithAI
   j. score ≥ threshold → _broadcastContact(contact, discarded:false)
      score < threshold → _broadcastContact(contact, discarded:true)
   k. fatigue delay + micro-break probabilístico
   l. history.save() cada 10 iteraciones
3. Watchdog 45s: si no avanza, fuerza finishReason='stalled'
4. _finishRun() → _broadcastProgress (status:complete) + _broadcastComplete + _closeTab(3s delay)
```

### ScrapingScorer (`scraping.scorer.ts`)

Evalúa cada candidato y decide si se acepta o descarta:

#### Scoring heurístico (`scoreHeuristic`) — modo `fast`

| Señal                                   | Puntos máx |
| --------------------------------------- | ---------- |
| Nombre/dominio contiene términos target | +30        |
| Meta description solapan con brief      | +20        |
| Meta keywords solapan con brief         | +15        |
| TLD coincide con país del brief         | +10        |
| Tipo de contacto detectado en texto     | +10        |
| Tiene página de contacto                | +10        |
| Email específico (no genérico)          | +5 / -5    |
| Dominio spam (redes sociales, dirs)     | -20        |

#### Scoring IA (`scoreWithAI`) — modo `precise`

1. Calcula heurístico como baseline.
2. Llama a `AIProvider.evaluate(prompt)` solicitando JSON `{"score": N, "reasoning": "..."}`.
3. Blended: `score = AI×0.7 + heuristic×0.3`.
4. Fallback a heurístico si IA falla.

#### Umbral de aceptación (`getAcceptanceThreshold`)

```typescript
// base: 35 (fast) | 50 (precise)
// offset: (consistency - 5) × 5  →  consistency 1 = -20, consistency 10 = +25
threshold = clamp(base + offset, 10, 90)
```

### Humanización con SessionEngine

El orchestrator integra `SessionEngine` del motor stealth para simular comportamiento humano:

- **Delays escalados por fatiga:** a medida que pasa el tiempo de sesión, los delays aumentan (1500–3000ms frescos → 2500–5000ms fatigados).
- **Micro-breaks probabilísticos:** cada `microBreakInterval` minutos (definido en el perfil de stealth), hace una pausa de `microBreakDuration` milisegundos.
- **Scroll y hover en SERPs:** antes de extraer URLs de una página de resultados, `_humanScrollSerp()` y `_humanHoverSerpResults()` simulan lectura humana.
- **Cooldown entre variantes:** pausa 3–7 segundos al cambiar de variante de query.

### Funciones inyectadas en tabs (self-contained, sin closures)

| Función                       | Propósito                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `_extractGoogleResults()`     | Extrae URLs de SERP Google. Soporta múltiples selectores de A/B testing.                      |
| `_extractDuckDuckGoResults()` | Extrae URLs de SERP DuckDuckGo HTML.                                                          |
| `_extractBingResults()`       | Extrae URLs de SERP Bing.                                                                     |
| `_extractYahooResults()`      | Extrae URLs de SERP Yahoo.                                                                    |
| `_humanScrollSerp()`          | Scroll a posición aleatoria 30–70% de la página (simula lectura).                             |
| `_humanHoverSerpResults()`    | Despacha `mouseover`/`mouseenter` en 2–3 resultados aleatorios visibles.                      |
| `_isBlockedPage()`            | Detecta CAPTCHA, reCAPTCHA, "unusual traffic", páginas de consentimiento EU, "Access Denied". |
| `_extractPageContacts()`      | Extrae emails, org name, descripción, keywords, enlace de contacto de cualquier página web.   |

### Control de sesión

```typescript
scrapingOrchestrator.start(params) // crea tab background, inicia loop
scrapingOrchestrator.pause() // detiene el loop en el siguiente tick
scrapingOrchestrator.resume() // relanza el loop (reset lastBreakAt)
scrapingOrchestrator.cancel() // cancela y cierra el tab inmediatamente
scrapingOrchestrator.getStatus() // 'idle' | 'running' | 'paused' | 'cancelled' | 'complete' | 'error'
```

Si el usuario **cierra manualmente el tab**, `chrome.tabs.onRemoved` cancela la sesión automáticamente.

### ScrapingSession (estado interno)

```typescript
interface ScrapingSession extends ScrapingStartParams {
  tabId: number
  status: ScrapingStatus
  urlQueue: string[] // URLs pendientes de visitar
  visitedUrls: Set<string> // dedup sesión (normalized)
  seenEmails: Set<string> // dedup emails sesión
  contactsFound: number // aceptados (score ≥ threshold)
  discardedCount: number // rechazados (score < threshold)
  pagesScanned: number // páginas de contacto visitadas
  energyConsumed: number
  acceptThreshold: number // calculado por getAcceptanceThreshold()
  engines: Record<SearchEngine, EngineState> // blocked, exhausted, page
  engineOrder: SearchEngine[]
  currentEngineIdx: number
  queryVariants: string[] // 12 variantes
  currentVariantIdx: number
  seedUrls: string[] // AI-seeded (precise mode)
  _saveCounter: number
}
```

### Razones de finalización (`FinishReason`)

| Razón               | Condición                                   |
| ------------------- | ------------------------------------------- |
| `target-reached`    | `contactsFound >= targetCount`              |
| `energy-exhausted`  | `energyService.consume()` devuelve `false`  |
| `queries-exhausted` | Todas las variantes y motores agotados      |
| `max-pages`         | `pagesScanned >= min(targetCount × 5, 500)` |
| `stalled`           | Watchdog: sin progreso por 45 segundos      |

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
  scrapingMode: 'fast' | 'precise'
  consistency: number // 1-10, controla el umbral de aceptación
}
```

**Payload de `SCRAPING_PROGRESS`:**

```typescript
{
  invId: string
  phase: 'seeding' | 'google' | 'contacts'
  currentUrl: string
  urlsFound: number // tamaño de visitedUrls.size
  contactsFound: number // aceptados
  discardedCount: number // rechazados por scoring
  targetCount: number
  pagesScanned: number // páginas de contacto visitadas (no SERPs)
  energyLeft: number
  status: 'running' | 'paused' | 'cancelled' | 'complete' | 'error'
}
```

**Payload de `SCRAPING_CONTACT`:**

```typescript
{
  invId: string
  contact: {
    name, email, role, organization, website, contactPage,
    specialization, topics, region,
    discoveryScore: number           // 0–100
    classification: 'high'|'medium'|'low'
    matchSignals: string[]
    discarded?: boolean              // true si score < threshold
  }
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

El `MessageComposer` de `ContactsView` delega exclusivamente en `createOutreachService()` para el canal email. Nunca abre `mailto:` directamente, garantizando que el modo simulación intercepta el envío correctamente.

### Sistema de Seguridad de Formularios (`form.field.resolver.ts`)

La capa de seguridad de formularios protege el envío automático mediante tres componentes:

#### `FormFallbackProfile` (tipo en `contact.types.ts`)

Perfil extendido de datos complementarios, persistido en `useSettingsStore.formFallbackProfile`:

```typescript
export interface FormFallbackProfile {
  cargo: string           // Cargo / Job title
  departamento: string    // Departamento por defecto para dropdowns
  pais: string            // País (e.g. "España")
  region: string          // Región / Provincia
  ciudad: string          // Ciudad
  industria: string       // Sector / Industria
  tamanoEmpresa: string   // Tamaño empresa (e.g. "1-10", "11-50")
  fuenteReferencia: string // Fuente de referencia / cómo nos encontró
  motivoConsulta: string  // Motivo de consulta por defecto
  idioma: 'es' | 'en'    // Idioma preferido
}
```

Todos los campos tienen valores por defecto sensatos (`DEFAULT_FALLBACK_PROFILE`) para que el sistema funcione sin configuración.

#### `assessFormRisk()` — Clasificación de campos

Analiza los `formFields` detectados durante el scraping y clasifica el riesgo:

| Clasificación | Campos | Acción |
|---|---|---|
| `safe`    | Nombre, email, cargo, país, departamento, sector... | Auto-fill |
| `review`  | Presupuesto, captcha, newsletter | Skip o aviso |
| `blocked` | DNI/NIF, IBAN/tarjeta, contraseña, CV/adjunto, fecha nacimiento, género | NUNCA auto-fill |

#### Catálogo completo de campos cubiertos

**Campos de texto/email cubiertos (`resolveValue()` en form.submit.engine.ts):**
- `nombre` / `first name` / `vorname` / `tu nombre`
- `apellido` / `last name` / `surname` → usa nombre de empresa (B2B)
- `email` / `correo` / `e-mail`
- `empresa` / `company` / `organization` / `razón social`
- `telefono` / `phone` / `móvil` / `tel` / `whatsapp`
- `asunto` / `subject` / `tema` → AI-generated subject
- `mensaje` / `message` / `consulta` / `descripción` → AI-generated body
- `cargo` / `job title` / `position` / `puesto` / `role`
- `departamento` / `department` / `dept` / `área`
- `website` / `web` / `url` / `página web`
- `país` / `country` / `nation`
- `región` / `region` / `provincia` / `state`
- `ciudad` / `city` / `localidad`
- `industria` / `industry` / `sector`
- `tamaño empresa` / `company size` / `employees`
- `cómo nos encontró` / `referral source` / `fuente`
- `motivo consulta` / `inquiry reason` / `contact reason`
- `idioma` / `language`

**Dropdowns (`resolveSelectValue()`) ahora con matching inteligente:**
- **País:** busca la opción que coincida con `pais` del perfil (soporta variantes España/Spain/ES)
- **Región/Provincia:** busca opción que coincida con `region`
- **Ciudad:** busca opción que coincida con `ciudad`
- **Industria:** busca match de `industria`; fallback a "tech/tecnología"
- **Tamaño empresa:** busca match de `tamanoEmpresa`; fallback a rango micro
- **Idioma:** usa el código de idioma del perfil
- **Departamento:** usa `departamento`; fallback a "other/general/consulta"
- **Motivo consulta:** usa `motivoConsulta`; fallback genérico

#### `FORM_SUBMIT_START.formData` — Tipo expandido

```typescript
formData: {
  // Core identity & message
  nombre?: string; apellido?: string; email?: string
  empresa?: string; telefono?: string; asunto?: string; mensaje: string
  // Extended fallback profile
  cargo?: string; departamento?: string; website?: string
  pais?: string; region?: string; ciudad?: string
  industria?: string; tamanoEmpresa?: string
  fuenteReferencia?: string; motivoConsulta?: string; idioma?: string
}
```

En `ContactsView.handleSend()`, el objeto `formData` se construye combinando:
1. **Business Profile** (`useBusinessStore`) — nombre, email, empresa, teléfono
2. **AI content** — asunto y mensaje generados por IA
3. **FormFallbackProfile** (`useSettingsStore.formFallbackProfile`) — todos los campos extendidos

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

| Store                   | Clave                      | Estado persistido                                                                                     |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `useAIStore`            | `vibe-reach:ai`            | configs[], activeProvider                                                                             |
| `useEnergyStore`        | — _no persiste_            | Solo caché en memoria; la fuente de verdad es el `EnergyService` del Background SW                    |
| `useThemeStore`         | `sef:theme`                | themeId, mode                                                                                         |
| `useLanguageStore`      | `sef:language`             | language                                                                                              |
| `useContactsStore`      | `vibe-reach:contacts`      | contacts[]                                                                                            |
| `useCampaignStore`      | `sef:campaigns`            | campaigns[]                                                                                           |
| `useInvestigationStore` | `vibe-reach:investigation` | investigations[], currentId, lastAnalysisMarkdown, lastFinishReason (los campos live no se persisten) |
| `useReportsStore`       | `sef:reports`              | reports[] (Report[])                                                                                  |
| `useSettingsStore`      | `sef:settings`             | stealthEnabled, debugMode, downloadFolder, fileNamePrefix, includeDate, savedFolderPath, **formFallbackProfile**               |
| `useBusinessStore`      | `sef:business`             | logoDataUrl, companyName, nif, address, phone, email                                                  |
| `useRuntimeStore`       | `sef:runtime`              | mode (RuntimeMode), setMode                                                                           |

### Estado vivo de scraping en `useInvestigationStore`

Campos **no persistidos** (excluídos via `partialize`):

```typescript
activeBrief: ActiveBrief | null // brief para que AppShell construya Contact desde SCRAPING_CONTACT
liveScrapingStatus: 'idle' | 'running' | 'paused'
liveContactsFound: number
liveCurrentUrl: string
liveScrapingTotal: number
livePagesScanned: number // páginas reales visitadas (del orchestrator)
```

Actions: `setActiveBrief()`, `setLiveScrapingProgress({ pagesScanned, ... })`, `setLiveScrapingDone()`.

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
  discarded?: boolean // true cuando score < acceptThreshold (contacto baja relevancia)
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

1. **Inicialización** — `init()` se llama **incondicionalmente al arranque del módulo** (primera línea ejecutable) para garantizar que los handlers se registren en cada wakeup del Service Worker MV3. En MV3, el SW puede ser terminado por Chrome tras ~30s de inactividad; la próxima vez que llega un mensaje, el SW se despierta limpio y sin handlers registrados si dependemos solo de `onInstalled` / `onStartup`.
2. **Handlers de mensajes** para Energy, Session, Stealth, Ping y Scraping.
3. **Alarmas** periódicas:
   - `ENERGY_REFILL` — cada 60 minutos: recarga energía y hace broadcast `ENERGY_UPDATED`.
   - `SESSION_CLEANUP` — cada 5 minutos: limpieza de sesiones.
   - `HEARTBEAT` — cada 30 segundos: mantiene el SW activo.
4. **Side Panel** — abre automáticamente al hacer clic en el icono de la barra.
5. **First install** — abre la página de opciones al instalar por primera vez.

```typescript
// Patrón correcto: init() en el top-level del módulo
init().catch((e) => log.error('Init failed', e))

chrome.runtime.onInstalled.addListener(/* solo abre options en install */)
chrome.runtime.onStartup.addListener(/* log únicamente */)
```

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
- Scrollbar ocultado visualmente en esta fase: `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` _(reemplazado en Fase 17 por scrollbars temáticos)_
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

### Fase 13 — Motor de scraping multi-motor + humanización + ScrapingScorer

**Objetivo:** Convertir el scraping de Google-only a un sistema de 4 motores, añadir scoring real de candidatos y humanización completa.

**Lo que se construyó:**

- **Multi-motor round-robin:** `Google`, `DuckDuckGo` (HTML-only), `Bing`, `Yahoo`. Cada motor tiene su extractor específico inyectado via `executeScript`. Si un motor es bloqueado (CAPTCHA), se salta; si está agotado (0 resultados), se salta. Cuando todos los motores están agotados para una variante, se pasa a la siguiente.
- **12 variantes de query:** `_buildQueryVariants()` genera combinaciones diversas (directorio, lista, contactos, red, site:TLD, etc.) para maximizar la cobertura de URLs únicas.
- **`ScrapingHistory`** — clase que persiste dominios y emails ya scraped en `chrome.storage.local` entre sesiones. Guarda cada 10 páginas y al finalizar. Evita que la misma empresa o email aparezca dos veces aunque el usuario haga múltiples campañas.
- **Dedup triple capa:** `visitedUrls` (sesión) + `ScrapingHistory.hasDomain` (persistente) + `isBlockedDomain` (lista negra).
- **`ScrapingScorer` (`scraping.scorer.ts`):** módulo independiente con `scoreHeuristic()` (sin IA, rápido) y `scoreWithAI()` (blended 70/30 IA+heurístico), más `getAcceptanceThreshold(consistency, mode)`.
- **Contactos descartados:** si el score < threshold, el contacto se crea con `discarded: true` y se envía igualmente via `SCRAPING_CONTACT` para que el usuario los vea en la pestaña "Otros" de `ContactsView`.
- **`SCRAPING_COMPLETE` payload:** incluye `finishReason` para mostrar banner explicativo en `ContactsView`.
- **Sondeo de subpáginas:** `_extractWithSubpageProbing()` prueba `/contact`, `/contacto`, `/about`, `/about-us`, `/team`, `/impressum`, `/kontakt` si la página raíz no tiene emails.
- **Watchdog timer:** `setInterval(10s)` que fuerza `finishReason='stalled'` si no hay progreso en 45 segundos.
- **Humanización con `SessionEngine`:**
  - Delays escalados por fatiga: `1500–3000ms` frescos → `2500–5000ms` fatigados.
  - Micro-breaks probabilísticos según `shouldTakeBreak(timeSinceBreak)` del perfil stealth.
  - `_humanScrollSerp()` + `_humanHoverSerpResults()` antes de extraer URLs de cada SERP.
  - Cooldown 3–7 segundos entre variantes de query.
- **Tab en background:** `chrome.tabs.create({ active: false })` — el tab de scraping ya no roba el foco del usuario.
- **`ScrapingStartParams`** ampliado con `scrapingMode` y `consistency`.
- **`SCRAPING_PROGRESS` payload** ampliado con `discardedCount`, `pagesScanned`, `phase: 'seeding'|'google'|'contacts'`.

---

### Fase 14 — Refactor del flujo de investigación + Listener global en AppShell

**Objetivo:** Hacer el flujo más ágil y que el listener persista al navegar entre vistas.

**Lo que se construyó / refactorizó:**

- **Modal de informe:** en lugar de una fase `report` completa que reemplazaba la vista, el informe se muestra ahora en un `Dialog` (`reportModalOpen`) superpuesto sobre el formulario. El usuario puede cancelar y volver al formulario sin perder el estado.
- **Toggle `generateReport`:** el usuario puede optar por saltar el informe IA e ir directamente al scraping. Si `false`, `handleAcceptAndContinue()` crea el `invId` y llama a `handleStartScraping()` sin pasar por `handleAnalyze()`.
- **Modos de scraping en el formulario:** las tarjetas `fast` y `precise` se movieron de la fase `report` al propio formulario (Card 2), junto al resto de filtros.
- **Listener movido a `AppShell`:** el `chrome.runtime.onMessage` handler ya no vive en `InvestigationView` (que se desmonta al navegar) sino en `AppShell` donde persiste durante toda la sesión del sidepanel.
- **`activeBrief` en `useInvestigationStore`:** almacena `{ affinityCategory, affinitySubcategory, contactType }` justo antes de enviar `SCRAPING_START`. El listener de `AppShell` lo lee vía `useInvestigationStore.getState().activeBrief` para inferir la categoría del contacto al construir el objeto `Contact`.
- **`useInvestigationStore` — campos live:** añadidos `liveScrapingStatus`, `liveContactsFound`, `liveCurrentUrl`, `liveScrapingTotal`, `livePagesScanned`, `lastFinishReason`. Excluidos de `partialize` (no persisten).
- **`ContactsView` — tarjeta de progreso en vivo:** muestra el estado de scraping en tiempo real con `liveScrapingStatus`, URL actual, páginas analizadas y botones Pausar/Reanudar/Cancelar.
- **`ContactsView` — tabs Relevantes / Otros:** separa contactos con `discarded: false` de `discarded: true`. Los totales se muestran en los tabs.
- **`ContactsView` — banner de fin:** si `lastFinishReason` está definido y no es `target-reached`, muestra un banner naranja con el motivo.
- **`InvestigationView` — eliminada la fase `scraping`:** toda la UI de progreso se movió a `ContactsView` y `AppShell`. `InvestigationView` ya solo tiene las fases `form` y `analyzing`.

---

### Fase 15 — Correcciones críticas del sistema de scraping

**Problemas identificados y resueltos:**

1. **SW no inicializado en cada wakeup** — El Background SW de MV3 se termina a los ~30s de inactividad. Al despertar, `onInstalled`/`onStartup` no se disparan, por lo que `registerMessageHandlers()` nunca se llamaba → `SCRAPING_START` llegaba sin handler → el scraping fallaba silenciosamente. **Fix:** `init()` en el top-level del módulo background.

2. **Sin broadcast inicial de progreso** — Tras `start()` crear la sesión y llamar `_run()` de forma fire-and-forget, el sidepanel no recibía ningún mensaje hasta que se completaba la primera navegación a Google (~5–20 segundos). La tarjeta de progreso no aparecía. **Fix:** `this._broadcastProgress()` inmediatamente después de crear `this.session`.

3. **Bug en `SCRAPING_PROGRESS` con status terminal** — `_finishRun()` envía un `SCRAPING_PROGRESS` con `status: 'complete'` antes de `SCRAPING_COMPLETE`. El handler de `AppShell` convertía cualquier status no-`'paused'` a `'running'`, haciendo que la tarjeta mostrara "Rastreando…" tras finalizar. **Fix:** solo llamar `setLiveScrapingProgress` cuando `status === 'running' | 'paused'`; para cualquier status terminal, llamar `setLiveScrapingDone()`.

4. **Sin feedback inmediato ni manejo de errores en `handleStartScraping`** — `InvestigationView` no actualizaba el store hasta que llegaba el primer broadcast. Además, si `messageService.send()` fallaba, navegaba a ContactsView de todas formas sin mostrar el error. **Fix:** `setLiveScrapingProgress()` optimista al inicio + check `result.success` con rollback a `setLiveScrapingDone()` si hay error.

5. **Tab de scraping activo robaba el foco** — `chrome.tabs.create({ active: true })` desplazaba al usuario a la pestaña de scraping. **Fix:** `active: false`.

---

### Fase 16 — Corrección del contador de páginas y el módulo de energía

**Problema 1 — Contador de páginas incorrecto:**

`ContactsView` mostraba `liveContactsFound × 3` como proxy. Con 1 contacto aceptado y 17 descartados, mostraba "aprox. 3 / 150" aunque se hubieran escaneado 18+ páginas. El orchestrator incluye `pagesScanned` en cada `SCRAPING_PROGRESS` pero el store nunca lo capturaba.

**Fix:** Añadido `livePagesScanned: number` al store, `setLiveScrapingProgress` acepta `pagesScanned?`, AppShell lo propaga. `ContactsView` muestra `{livePagesScanned} / {min(targetCount × 5, 500)}` — la misma fórmula que usa el orchestrator para `maxPagesScanned`.

**Problema 2 — Energía siempre al 100%:**

Dos bugs interactuando:

- **Colisión de clave de storage:** `EnergyService` del background persiste en `sef:energy_state` como `EnergyState` plano. `useEnergyStore` (con Zustand persist) también usaba `sef:energy_state` pero en formato `{ "state": {...}, "version": 0 }`. Ninguno podía leer el formato del otro → el sidepanel siempre rehydrataba con el default (1000/1000 = 100%).
- **`syncFromService()` sobreescribía el valor real:** `useEnergy` se suscribía a `energyService.onChange()` — pero éste es el `EnergyService` local del sidepanel, que siempre vale 1000. Cualquier evento (como pulsar Recargar) disparaba `onChange` y restauraba el store a 1000, borrando el valor correcto recibido via `SCRAPING_PROGRESS`.

**Fix:**

- `useEnergyStore` reescrito sin `persist` middleware ni acoplamiento al `EnergyService` local. Es una caché en memoria pura.
- Todas las mutaciones (refill, reset, setInfinite, consume) envían el mensaje correspondiente al background SW y después re-sincronizan con `ENERGY_GET`.
- `useEnergy` hook: elimina la suscripción `onChange`. Hace `ENERGY_GET` en mount para obtener el nivel real.
- `AppShell`: también hace `ENERGY_GET` en mount (cobertura paralela).
- `SCRAPING_PROGRESS` broadcasts siguen actualizando `useEnergyStore.setState({ current: energyLeft })` en tiempo real.

---

### Fase 17 — Pulido UX: scrollbars temáticos, SettingsView acordeón y corrección de parpadeo

**Objetivo:** Mejorar la coherencia visual de la extensión con scrollbars que respetan el tema activo, refactorizar Settings a acordeones para reducir la carga visual y eliminar el parpadeo del scrollbar al cambiar de tab.

**Scrollbars temáticos (`globals.css`):**

- Eliminadas las clases Tailwind `[scrollbar-width:none]` y `[&::-webkit-scrollbar]:hidden` de `AppShell`.
- Añadido bloque CSS global en `src/styles/globals.css` con reglas WebKit + Firefox que usan las variables OKLCH del tema activo:
  - Track → `--muted`, Thumb → `--border`, Thumb hover → `--primary`
  - Ancho 6px, bordes redondeados (`border-radius: 999px`)
- Los scrollbars se adaptan automáticamente a cualquier tema y a los modos claro/oscuro sin JavaScript.

**SettingsView — refactor a acordeones:**

- Eliminados: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Separator`, `ChevronUp` de SettingsView.
- Estado `themeOpen: boolean` → `openSections: Record<string, boolean>` con función `toggle(key: string)` genérica.
- Estado inicial: `{ ai: true }` — sección IA abierta por defecto, resto colapsado.
- 8 secciones acordeón con `rounded-xl border border-border overflow-hidden` y `ChevronDown` rotando 180°.
- Separación entre acordeones: `space-y-1.5` (sin `<Separator>` ni `<hr>`).

**Corrección del parpadeo del scrollbar al cambiar de tab (`AppShell.tsx`):**

- **Causa raíz:** `key={activeTab}` en `<main>` provocaba que React destruyera y recreara el contenedor de scroll en cada cambio de tab. El instante de estado vacío (sin contenido) causaba que `overflow-y-auto` eliminara la scrollbar y luego la volviera a mostrar → parpadeo visual.
- **Intento fallido:** Cambiar a `overflow-y-scroll` reservaba espacio pero dejaba el track permanentemente visible incluso sin contenido.
- **Solución definitiva:**
  - `<main>` permanece montado (sin `key`) con `min-h-full` → el scroll container nunca ve un estado vacío.
  - `key={activeTab}` movido al `<div>` interior → solo el contenido de la vista se remonta con animación.
  - `overflow-y-auto` preservado → track solo aparece cuando hay contenido que desborda realmente.

**Archivos modificados:**
- `src/styles/globals.css` — bloque scrollbar añadido
- `src/components/layout/AppShell.tsx` — estructura main/inner-div
- `src/sidepanel/views/SettingsView.tsx` — acordeones completos

### Fase 18 — Auditoría completa y mejoras del motor (v2.0)

**Objetivo:** Auditoría exhaustiva del sistema, corrección de bugs críticos, creación de nuevos stores de memoria, mejoras en los motores de afinidad/scraping/campaña, y nuevos componentes UI para revisión y métricas.

**Quick Fixes (F1):**

- `truncated-text.tsx`: `break-words` → `break-all` (Tailwind v4 lint fix)
- `DevTestPanel.tsx`: `z-[2147483640]` → `z-2147483640`, `max-w-[260px]` → `max-w-65` (Tailwind v4 syntax)
- `ai.service.ts`: Guard en `getAIProvider()` — `if (sorted.length === 0) throw Error(...)` evita crash cuando no hay proveedores configurados
- `AppShell.tsx`: `DevTestPanel` solo se renderiza cuando `debugMode === true` (antes era siempre visible)

**Data Layer (F2):**

- `OutreachStatus` tipo granular: `'pending' | 'mailto-opened' | 'form-submitted' | 'linkedin-queued' | 'sent' | 'failed'` — reemplaza el ambiguo `'pending' | 'sent' | 'failed'`
- `CampaignStatus`: nuevo estado `'awaiting-review'` — la campaña se pausa tras generar mensajes si `campaign.requiresApproval === true`
- `contacts.store.ts`: Dedup reescrito — de email/hostname a firma form-centric (`contactFormUrl + organization + name`). Dos contactos de la misma org con formularios distintos NO son duplicados.
- **Nuevo store** `domain.memory.store.ts` (`DomainMemoryRecord`): historial por dominio — `contactsDiscovered`, `outreachAttempted`, `formSubmissions`, `emailsOpened`, `lastContactDate`. Persistido en `chrome.storage.local`.
- **Nuevo store** `form.patterns.store.ts` (`FormPattern`): guarda field mappings exitosos por dominio para reutilizar en futuros envíos. Persistido en `chrome.storage.local`.

**Engine Layer (F3):**

- `outreach.production.ts`: Cada método devuelve su `OutreachStatus` real (`'mailto-opened'`, `'form-submitted'`, `'linkedin-queued'`). Energy keys corregidos (`'sendEmail': 5`, `'sendLinkedInMessage': 3`, separados del coste de `'submitForm'`).
- `CampaignsView handleSend()`: Usa datos reales de `useInvestigationStore` (targetCategory, targetSubcategory, websites reales de contactos).
- `LiveSendView`: Reescrita — eliminado `Math.random()` fake loop, ahora lee mensajes reactivamente desde `useCampaignStore`.
- **Nuevo utility** `channel.router.ts` (`getBestChannel(contact, domainMemory)`): prioriza form sin CAPTCHA > form con CAPTCHA probado > email > form CAPTCHA (último recurso) > none.
- `affinity.engine.ts`: `heuristicScore()` extendido con bonus por `contactMethod` (form=+15, both=+10, email=+5) y bonus por historial de DomainMemory (+10).
- `scraping.scorer.ts`: Nueva señal `domainMemoryBonus` (+15 para dominios conocidos). Peso AI/heurístico cambiado de 70/30 a 80/20.
- `form.submit.engine.ts`: Antes de inyección consulta `FormPatternStore` para reutilizar mappings conocidos. Tras éxito, guarda el patrón.
- `campaign.engine.ts`: 
  - Paso 4 (outreach) usa `getBestChannel()` + `useDomainMemoryStore` para tracking automático por dominio.
  - Si `campaign.requiresApproval`, la campaña se pausa con status `'awaiting-review'` tras generar mensajes (paso 3).
  - Nueva función `resumeAfterReview(campaignId, approvedContactIds)` ejecuta pasos 4-5 solo con contactos aprobados.

**UI Layer (F4):**

- **`ReviewCheckpointView`** (CampaignsView): Se muestra cuando un campaign tiene status `'awaiting-review'`. Lista de contactos con checkboxes, preview del mensaje, y botón "Enviar aprobados" que llama a `resumeAfterReview()`.
- **`DomainMemoryBadge`** (ContactsView): Micro-badge "✓ Contactado (N)" en violeta en cada `ContactCard` cuyo dominio tiene historial de outreach.
- **`DomainMemorySummary`** (ReportsView): Panel con métricas globales (dominios, outreach, formularios, emails) y top 5 dominios por actividad.

**Archivos creados:**
- `src/store/domain.memory.store.ts`
- `src/store/form.patterns.store.ts`
- `src/utils/channel.router.ts`

**Archivos modificados (16):**
- `src/components/ui/truncated-text.tsx`
- `src/sidepanel/views/DevTestPanel.tsx`
- `src/services/ai.service.ts`
- `src/components/layout/AppShell.tsx`
- `src/core/types/campaign.types.ts`
- `src/core/types/campaign-engine.types.ts`
- `src/core/types/affinity.types.ts`
- `src/core/types/energy.types.ts`
- `src/core/constants/actions.ts`
- `src/services/outreach/outreach.interface.ts`
- `src/services/outreach/outreach.production.ts`
- `src/services/outreach/form.submit.engine.ts`
- `src/services/scraping/scraping.scorer.ts`
- `src/engine/affinity/affinity.engine.ts`
- `src/engine/campaign/campaign.engine.ts`
- `src/store/contacts.store.ts`
- `src/store/index.ts`
- `src/sidepanel/views/CampaignsView.tsx`
- `src/sidepanel/views/ContactsView.tsx`
- `src/sidepanel/views/ReportsView.tsx`

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

- **Scrollbars temáticos** — visibles, 6px, colores sincronizados automáticamente con el tema activo vía variables OKLCH. Track: `--muted`, Thumb: `--border`, Hover: `--primary`.
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

### Completado (Fases 1–16 + mejoras de UX)

- [x] Scaffolding MV3, motor stealth, energy system, sistema de temas, i18n completo
- [x] Sistema de entornos de runtime con Strategy Pattern (simulation/staging/production)
- [x] Motor de campaña `executeCampaign()` con pipeline de 5 pasos
- [x] Motor de afinidad con scoring IA + fallback heurístico
- [x] Servicio de scraping y outreach con 3 implementaciones + factory
- [x] `ScrapingOrchestrator` multi-motor (Google, DuckDuckGo, Bing, Yahoo)
- [x] 48 tests en 11 archivos de test — todos en verde
- [x] `ContactsView` — añadir contacto manualmente (modal con campos completos)
- [x] `ContactsView` — borrar lista completa de contactos (con confirmación)
- [x] `ContactsView` — IA bulk fill (genera asunto+cuerpo para todos los contactos a la vez)
- [x] `ContactsView` — `MessageComposer.handleSend()` usa `createOutreachService()` — modo simulación intercepta correctamente el envío de emails
- [x] `HistoryView` — borrar todo el historial y borrar entrada por entrada (con confirmación)
- [x] `HistoryView` — rediseño de cards: pill de canal con color, stats row limpio, sección Envíos con barras de progreso, timeline mejorado
- [x] **Sistema de seguridad de formularios** (`form.field.resolver.ts`) — `FormFallbackProfile`, `assessFormRisk()`, `buildFormData()`, catálogo de campos safe/review/blocked
- [x] **`FormFallbackProfile` persistida** en `useSettingsStore` con valores por defecto automáticos
- [x] **SettingsView** — nueva sección "Perfil de Formulario" con editor completo (cargo, departamento, país, región, ciudad, industria, tamaño empresa, idioma, fuente referencia, motivo consulta)
- [x] **`FORM_SUBMIT_START.formData`** expandido con todos los campos del perfil extendido
- [x] **`form.submit.engine.ts` `resolveValue()`** — 10 nuevos matchers (cargo, departamento, website, país, región, ciudad, industria, tamaño, fuente, motivo, idioma)
- [x] **`resolveSelectValue()`** — matching inteligente con datos reales del perfil para dropdowns de país, región, ciudad, industria, tamaño empresa, idioma, departamento y motivo de consulta

### Completado (Fase 17 — Pulido UX)

- [x] Scrollbars temáticos en toda la extensión (`globals.css`): 6px, redondeados, `--muted`/`--border`/`--primary`, sin JS
- [x] `SettingsView` refactorizado a 8 acordeones (`openSections` + `toggle(key)`): IA, Empresa, Formulario, Stealth, Runtime (debug), Energía (debug), Exportación, Apariencia
- [x] Sin `<Separator>` entre secciones Settings — solo `space-y-1.5`
- [x] Corrección de parpadeo del scrollbar al cambiar de tab — `<main>` permanente + `key` en div interior

### Completado (Fase 13 — Multi-motor + Humanización + Scorer)

- [x] `ScrapingOrchestrator` multimotor: Google, DuckDuckGo, Bing, Yahoo (round-robin)
- [x] `scraping.scorer.ts`: `scoreHeuristic()`, `scoreWithAI()`, `getAcceptanceThreshold()`
- [x] Contactos descartados (`discarded: true`) visibles en pestaña "Otros"
- [x] `ScrapingHistory` persistente en `chrome.storage.local`
- [x] Triple dedup URL (sesión + historial + lista negra)
- [x] Dedup email (sesión + historial)
- [x] 12 variantes de query (`_buildQueryVariants`)
- [x] Sondeo de subpáginas (`_extractWithSubpageProbing`)
- [x] Watchdog timer 45s anti-stall
- [x] Humanización: delays escalados por fatiga, micro-breaks, scroll + hover SERP
- [x] Cooldown inter-variante 3–7s
- [x] `finishReason` en `SCRAPING_COMPLETE`: `target-reached` | `energy-exhausted` | `queries-exhausted` | `stalled` | `max-pages`

### Completado (Fase 14 — Refactor flujo investigación)

- [x] Informe IA en modal `Dialog` (no sustituye la vista)
- [x] Toggle `generateReport` — saltar informe e ir directo al scraping
- [x] Modos fast/precise movidos al formulario
- [x] Listener de scraping movido de `InvestigationView` a `AppShell`
- [x] `activeBrief` en `useInvestigationStore` para construir Contact en AppShell
- [x] Campos live (`liveScrapingStatus`, `livePagesScanned`, `lastFinishReason`, etc.) en investigation store
- [x] Tarjeta de progreso en vivo en `ContactsView` (actualizada con pagesScanned real)
- [x] Tabs Relevantes / Otros en `ContactsView`
- [x] Banner de razón de finalización en `ContactsView`

### Completado (Fases 15–16 — Correcciones críticas)

- [x] SW init en top-level del módulo (fix wakeup MV3)
- [x] Broadcast inicial de progreso al crear sesión
- [x] Fix `SCRAPING_PROGRESS` con status terminal en AppShell
- [x] Fix feedback inmediato + manejo de errores en `handleStartScraping`
- [x] Tab de scraping `active: false`
- [x] `livePagesScanned` — contador real de páginas analizadas
- [x] `useEnergyStore` — reescrito sin persist, caché pura + sync via background
- [x] `useEnergy` hook — `ENERGY_GET` en mount, sin `onChange` local
- [x] `AppShell` — `ENERGY_GET` en mount para sync inmediato

### Completado (Fase 18 — Auditoría completa y mejoras del motor v2.0)

- [x] Guard de crash en `getAIProvider()` cuando no hay proveedores configurados
- [x] DevTestPanel solo visible en `debugMode`
- [x] `OutreachStatus` granular (6 estados) reemplaza `'pending' | 'sent' | 'failed'`
- [x] Dedup de contactos form-centric (contactFormUrl + organization + name)
- [x] `DomainMemoryStore` — historial persistente por dominio
- [x] `FormPatternsStore` — library de field mappings reutilizables
- [x] `ChannelRouter` — selección inteligente de canal (form vs email)
- [x] Energy keys separados por canal (`sendEmail: 5`, `sendLinkedInMessage: 3`)
- [x] `executeCampaign()` usa `getBestChannel()` + DomainMemory tracking
- [x] `campaign.requiresApproval` → pausa con `'awaiting-review'` + `resumeAfterReview()`
- [x] `ReviewCheckpointView` en CampaignsView — revisión manual antes de envío
- [x] `DomainMemoryBadge` en ContactsView — badge "Contactado" por dominio
- [x] `DomainMemorySummary` en ReportsView — métricas globales de memoria
- [x] LiveSendView reescrita sin fake random — datos reales del store
- [x] AffinityEngine extendido con bonificaciones por canal y dominio
- [x] ScrapingScorer con bonus DomainMemory y peso AI 80/20
- [x] FormSubmitEngine reutiliza patrones de envío exitosos

### Pendiente inmediato

- [ ] Integrar `ProductionOutreachService` con SMTP real y LinkedIn API
- [ ] Manejo guiado de CAPTCHA — pausa con aviso al usuario para resolver manualmente

### Medio plazo

- [ ] Soporte más idiomas en i18n (actuales: `en`, `es`)
- [ ] Exportación de contactos a CSV/Excel

### Largo plazo

- [ ] Gestión de follow-ups automáticos
- [ ] Soporte para LinkedIn y otras redes profesionales
- [ ] Panel de analytics de outreach avanzado

---

_Documentación actualizada el 22 de marzo de 2026 · Vibe Reach v1.9.0_
