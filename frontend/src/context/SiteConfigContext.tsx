import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { FALLBACK_CONFIG } from '../lib/constants'
import type { PublicConfig } from '../lib/types'

interface SiteConfigValue {
  config: PublicConfig
  loading: boolean
}

const SiteConfigContext = createContext<SiteConfigValue>({
  config: FALLBACK_CONFIG,
  loading: true,
})

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['site-config'],
    queryFn: api.config,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <SiteConfigContext.Provider value={{ config: data ?? FALLBACK_CONFIG, loading: isLoading }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig(): SiteConfigValue {
  return useContext(SiteConfigContext)
}
