// Vitest setup — global mocks for Chrome extension APIs

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
} as unknown as typeof chrome

// Stub document.elementFromPoint which jsdom does not implement
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = vi.fn(() => document.body)
}
