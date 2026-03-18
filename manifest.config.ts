import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Vibe Reach — AI Investigative Outreach',
  description:
    'AI-powered investigative outreach extension with intelligent contact discovery and campaign management.',
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
    128: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  permissions: ['storage', 'tabs', 'alarms', 'scripting', 'activeTab', 'sidePanel'],
  host_permissions: ['https://*/*', 'http://*/*'],
  content_scripts: [
    {
      js: ['src/content/main.tsx'],
      matches: ['https://*/*', 'http://*/*'],
      run_at: 'document_idle',
    },
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  web_accessible_resources: [
    {
      resources: ['src/assets/*'],
      matches: ['https://*/*', 'http://*/*'],
    },
  ],
})
