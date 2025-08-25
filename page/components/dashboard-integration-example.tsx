'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { useTheme } from '@/hooks/use-theme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  Users,
  Globe,
  Zap,
  RefreshCw,
  Settings,
  Filter
} from 'lucide-react'

// Interfaces existentes do dashboard principal
interface DomainData {
  domain: string
  queries: number
}

interface QueryTypeData {
  query_type: string
  count: number
}

interface ClientData {
  client: string
  queries: number
}

// Componente principal integrado com dark mode
export default function DNSDashboardWithTheme() {
  const { resolvedTheme } = useTheme()
  const [topDomains, setTopDomains] = useState<DomainData[]>([])
  const [queryTypes, setQueryTypes] = useState<QueryTypeData[]>([])
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [uniqueClientsCount, setUniqueClientsCount] = useState(0)
  const [uniqueDomainsCount, setUniqueDomainsCount] = useState(0)
  const [queriesPerMinute, setQueriesPerMinute] = useState(0)

  // Função de fetch adaptada para dark mode (com indicadores visuais)
  const fetchData = async () => {
    const apiUrl = ""
    setLoading(true)

    try {
      const [domainsRes, typesRes, clientsRes, uniqueClientsRes, uniqueDomainsRes, qpsRes] = await Promise.all([
        fetch(`${apiUrl}/api/top-domains`),
        fetch(`${apiUrl}/api/query-types`),
        fetch(`${apiUrl}/api/clients`),
        fetch(`${apiUrl}/api/unique-clients-count`),
        fetch(`${apiUrl}/api/unique-domains-count`),
        fetch(`${apiUrl}/api/queries-per-minute`),
      ])

      const domainsData = await domainsRes.json()
      const typesData = await typesRes.json()
      const clientsData = await clientsRes.json()

      setTopDomains(Array.isArray(domainsData) ? domainsData : [])
      setQueryTypes(Array.isArray(typesData) ? typesData : [])
      setClients(Array.isArray(clientsData) ? clientsData : [])

      const uniqueClientsData = await uniqueClientsRes.json()
      setUniqueClientsCount(uniqueClientsData?.count || 0)

      const uniqueDomainsData = await uniqueDomainsRes.json()
      setUniqueDomainsCount(uniqueDomainsData?.count || 0)

      const qpmData = await qpsRes.json()
      setQueriesPerMinute(qpmData?.queries_per_minute || 0)

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh com indicador visual adaptado ao tema
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Carregar dados iniciais
  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header com tema integrado */}
      <DashboardHeader
        title="MikroTik DNS Analytics"
        subtitle="Real-time DNS query analytics and monitoring dashboard"
      />

      <div className="container max-w-screen-2xl px-4 py-6">
        {/* Controls Bar com tema adaptado */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                autoRefresh
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-muted-foreground'
              }`} />
              <span className="text-sm text-muted-foreground">
                {autoRefresh ? 'Auto-refresh ativo' : 'Auto-refresh desativado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Atualizado: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Stats Cards com cores adaptáveis */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            // Skeletons com tema adaptado
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px] mb-2" />
                  <Skeleton className="h-3 w-[80px]" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Consultas/Min</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queriesPerMinute}</div>
                  <p className="text-xs text-muted-foreground">Taxa atual</p>
                </CardContent>
              </Card>

              <Card className="transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueClientsCount}</div>
                  <p className="text-xs text-muted-foreground">Dispositivos ativos</p>
                </CardContent>
              </Card>

              <Card className="transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Domínios Únicos</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{uniqueDomainsCount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Domínios consultados</p>
                </CardContent>
              </Card>

              <Card className="transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Consultas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {topDomains.reduce((acc, domain) => acc + domain.queries, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Desde o início</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Grid com tema adaptado */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Domains */}
          <Card className="transition-colors">
            <CardHeader>
              <CardTitle>Domínios Mais Consultados</CardTitle>
              <CardDescription>
                Os domínios com maior número de consultas DNS
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-6 w-6 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                      <Skeleton className="h-4 w-[60px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {topDomains.slice(0, 10).map((domain, index) => {
                    const totalQueries = topDomains.reduce((acc, d) => acc + d.queries, 0)
                    const percentage = totalQueries > 0 ? (domain.queries / totalQueries) * 100 : 0

                    return (
                      <div key={domain.domain} className="flex items-center space-x-4">
                        <Badge
                          variant="outline"
                          className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{domain.domain}</p>
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {domain.queries} ({percentage.toFixed(1)}%)
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Types */}
          <Card className="transition-colors">
            <CardHeader>
              <CardTitle>Tipos de Consulta</CardTitle>
              <CardDescription>
                Distribuição dos tipos de consultas DNS
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[60px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {queryTypes.map((type) => (
                    <div key={type.query_type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{type.query_type}</Badge>
                      </div>
                      <div className="text-sm font-medium">{type.count.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card className="transition-colors lg:col-span-2">
            <CardHeader>
              <CardTitle>Principais Clientes</CardTitle>
              <CardDescription>
                Dispositivos com maior atividade de consultas DNS
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-3 w-[80px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {clients.slice(0, 6).map((client) => (
                    <div
                      key={client.client}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{client.client}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.queries} consultas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
