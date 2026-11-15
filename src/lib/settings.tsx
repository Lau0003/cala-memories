import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { DEFAULT_SETTINGS, type SiteSettings } from './types'

interface SettingsState {
  settings: SiteSettings
  loaded: boolean
  reload: () => Promise<void>
}

const SettingsContext = createContext<SettingsState | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...(data as SiteSettings) })
    setLoaded(true)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <SettingsContext.Provider value={{ settings, loaded, reload }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider')
  return ctx
}
