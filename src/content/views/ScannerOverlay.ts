// ─────────────────────────────────────────────
// Scanner Overlay — Visual scanning effect
// Injected into the page when the orchestrator probes a domain.
// Uses a Shadow DOM host for complete style isolation.
// ─────────────────────────────────────────────

let host: HTMLDivElement | null = null
let shadow: ShadowRoot | null = null

const OVERLAY_ID = 'vibe-scanner-overlay'

const STYLES = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .scanner-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
  }

  /* Pulsing border */
  .scanner-border {
    position: absolute;
    inset: 0;
    border: 2px solid rgba(59, 130, 246, 0.4);
    border-radius: 0;
    animation: pulse-border 2s ease-in-out infinite;
  }

  /* Scanning line */
  .scanner-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.6), transparent);
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.2);
    animation: scan-sweep 3s ease-in-out infinite;
  }

  /* Info panel */
  .scanner-info {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 320px;
    pointer-events: auto;
  }

  .scanner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(59, 130, 246);
    animation: dot-pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .scanner-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .scanner-label {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.02em;
  }

  .scanner-domain {
    font-size: 10px;
    color: rgba(147, 197, 253, 0.8);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }

  .scanner-count {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-variant-numeric: tabular-nums;
  }

  @keyframes pulse-border {
    0%, 100% { border-color: rgba(59, 130, 246, 0.15); }
    50% { border-color: rgba(59, 130, 246, 0.45); }
  }

  @keyframes scan-sweep {
    0% { top: 0%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }

  @keyframes dot-pulse {
    0%, 100% { opacity: 0.4; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  /* Fade in/out */
  .scanner-root.entering {
    animation: fade-in 0.3s ease-out forwards;
  }
  .scanner-root.leaving {
    animation: fade-out 0.3s ease-in forwards;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`

export function activateScanner(domain: string, domainsChecked: number, totalDomains: number): void {
  // Remove existing overlay
  deactivateScanner()

  host = document.createElement('div')
  host.id = OVERLAY_ID
  shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = STYLES
  shadow.appendChild(style)

  const root = document.createElement('div')
  root.className = 'scanner-root entering'

  root.innerHTML = `
    <div class="scanner-border"></div>
    <div class="scanner-line"></div>
    <div class="scanner-info">
      <div class="scanner-dot"></div>
      <div class="scanner-text">
        <span class="scanner-label">Analizando dominio…</span>
        <span class="scanner-domain">${escapeHtml(domain)}</span>
        <span class="scanner-count">${domainsChecked} / ${totalDomains}</span>
      </div>
    </div>
  `

  shadow.appendChild(root)
  document.documentElement.appendChild(host)
}

export function deactivateScanner(): void {
  if (!host) {
    // Defensive cleanup: remove any stale DOM node
    document.getElementById(OVERLAY_ID)?.remove()
    shadow = null
    return
  }
  // Use the module-level shadow reference (closed shadow root is inaccessible via .shadowRoot)
  const root = shadow?.querySelector('.scanner-root')
  const capturedHost = host
  host = null
  shadow = null
  if (root) {
    root.classList.remove('entering')
    root.classList.add('leaving')
    setTimeout(() => capturedHost.remove(), 300)
  } else {
    capturedHost.remove()
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
