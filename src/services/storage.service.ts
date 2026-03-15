/**
 * StorageService — Typed wrapper around chrome.storage.local
 * Provides safe async reads, default fallbacks, and typed access.
 */
export class StorageService {
  private static instance: StorageService

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const result = await chrome.storage.local.get(key)
      if (result[key] === undefined) return defaultValue
      return result[key] as T
    } catch {
      return defaultValue
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key)
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear()
  }

  async getMany<T extends Record<string, unknown>>(keys: string[]): Promise<Partial<T>> {
    try {
      const result = await chrome.storage.local.get(keys)
      return result as Partial<T>
    } catch {
      return {}
    }
  }

  async setMany(items: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set(items)
  }

  onChange<T>(key: string, callback: (newValue: T, oldValue: T | undefined) => void): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) {
        const change = changes[key]
        callback(change.newValue as T, change.oldValue as T | undefined)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }
}

export const storageService = StorageService.getInstance()
