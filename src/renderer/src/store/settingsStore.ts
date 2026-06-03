import { create } from 'zustand'
import type { AppSettings } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/constants'
import { IPC_EVENTS } from '../../../shared/constants'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  load: () => Promise<void>
  update: (updates: Partial<AppSettings>) => Promise<void>
  reset: () => Promise<void>
  browseFolder: () => Promise<string | null>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  load: async () => {
    const settings = await window.api.settings.get()
    set({ settings, isLoaded: true })
  },

  update: async (updates) => {
    const settings = await window.api.settings.update(updates)
    set({ settings })
  },

  reset: async () => {
    const settings = await window.api.settings.reset()
    set({ settings })
  },

  browseFolder: async () => {
    return window.api.settings.browseFolder()
  }
}))

export function subscribeToSettingsEvents(): () => void {
  return window.api.on(IPC_EVENTS.SETTINGS_UPDATED, (settings: unknown) => {
    useSettingsStore.setState({ settings: settings as AppSettings })
  })
}
