"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, Globe, Search, RefreshCw, Github, Play, Pause, Clock, TrendingUp, Shield, AlertTriangle, Zap, Network, BarChart3, Wifi } from "lucide-react"
import { AnimatedNumber } from "@/components/animated-number"
import { DarkModeSwitch } from "@/components/dark-mode-switch"

interface DomainData {
  domain: string
  count: number
}

interface QueryTypeData {
  type: string
  count: number
}

interface ClientData {
  client: string
  count: number
}

interface ClientQuery {
  timestamp: number
  domain: string
  type: string
}

interface DomainClient {
  client: string
  query_count: number
  last_query: number
}

interface AllQuery {
  timestamp: number
  client: string
  domain: string
  type: string
}

interface DNSResolution {
  status: string
  records: string[]
  error?: string
  duration: number
}

interface DomainWithResolution {
  domain: string
  type: string
  resolution: DNSResolution
}

export default function DNSDashboardWithDarkMode() {
  const [topDomains, setTopDomains] = useState<DomainData[]>([])
  const [queryTypes, setQueryTypes] = useState<QueryTypeData[]>([])
  const [clients, setClients] = useState<ClientData[]>([])
  const [clientQueries, setClientQueries] = useState<ClientQuery[]>([])
  const [allQueries, setAllQueries] = useState<AllQuery[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [uniqueClientsCount, setUniqueClientsCount] = useState(0)
  const [uniqueDomainsCount, setUniqueDomainsCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<DomainWithResolution[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)
  const [queriesPerMinute, setQueriesPerMinute] = useState(0)
  const [ipv4Count, setIpv4Count] = useState(0)
  const [ipv6Count, setIpv6Count] = useState(0)
  const [selectedDomain, setSelectedDomain] = useState("")
  const [domainClients, setDomainClients] = useState<DomainClient[]>([])
  const [domainPage, setDomainPage] = useState(1)

  const fetchData = async () => {
    const apiUrl = ""
    setLoading(true)
    try {
      const [domainsRes, typesRes, clientsRes, uniqueClientsRes, uniqueDomainsRes, qpsRes, ipvRes] = await Promise.all([
        fetch(`${apiUrl}/api/top-domains`),
        fetch(`${apiUrl}/api/query-types`),
        fetch(`${apiUrl}/api/clients`),
        fetch(`${apiUrl}/api/unique-clients-count`),
        fetch(`${apiUrl}/api/unique-domains-count`),
        fetch(`${apiUrl}/api/queries-per-minute`),
        fetch(`${apiUrl}/api/ipv4-vs-ipv6`),
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

      const ipvData = await ipvRes.json()
      const ipv4 = ipvData?.find((item: any) => item.ip_type === 'IPv4')?.count || 0
      const ipv6 = ipvData?.find((item: any) => item.ip_type === 'IPv6')?.count || 0
      setIpv4Count(ipv4)
      setIpv6Count(ipv6)

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Initial data load
  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header com Dark Mode Switch integrado */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Wifi className="h-6 w-6 text-primary" />
                <Activity className="absolute -right-1 -top-1 h-3 w-3 text-green-500 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  MikroTik DNS Analytics
                </h1>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Real-time DNS query analytics and monitoring dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <span>{autoRefresh ? 'Live' : 'Paused'}</span>
            </div>
            {/* Dark Mode Switch - Posição principal */}
            <DarkModeSwitch />
          </div>
        </div>
      </header>

      <div className="container max-w-screen-2xl px-4 py-6">
        {/* Controls Bar */}
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
              Refresh Data
            </Button>

            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoRefresh ? "Pause" : "Resume"} Auto-refresh
            </Button>

            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Additional Dark Mode Switch na barra de controles */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              DNS Monitoring
            </Badge>
            <DarkModeSwitch variant="ghost" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queries per Minute</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={queriesPerMinute} />
              </div>
              <p className="text-xs text-muted-foreground">
                Current rate
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={uniqueClientsCount} />
              </div>
              <p className="text-xs text-muted-foreground">
                Active devices
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Domains</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={uniqueDomainsCount} />
              </div>
              <p className="text-xs text-muted-foreground">
                Domains queried
              </p>
            </CardContent>
          </Card>

          <Card className="transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IPv4 vs IPv6</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((ipv4Count / (ipv4Count + ipv6Count)) * 100 || 0).toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                IPv4 queries
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="queries">All Queries</TabsTrigger>
            <TabsTrigger value="search">DNS Lookup</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Top Domains */}
              <Card className="col-span-4 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top Domains</CardTitle>
                      <CardDescription>
                        Most frequently queried domains
                      </CardDescription>
                    </div>
                    {/* Dark Mode Switch no card */}
                    <DarkModeSwitch size="sm" variant="ghost" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {topDomains.slice(0, 5).map((domain, index) => (
                      <div key={domain.domain} className="flex items-center">
                        <Badge variant="outline" className="mr-4 w-8 justify-center">
                          {index + 1}
                        </Badge>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium leading-none">
                            {domain.domain}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {domain.count.toLocaleString()} queries
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Query Types */}
              <Card className="col-span-3 transition-colors">
                <CardHeader>
                  <CardTitle>Query Types</CardTitle>
                  <CardDescription>
                    Distribution of DNS query types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {queryTypes.map((type) => (
                      <div key={type.type} className="flex items-center">
                        <Badge variant="secondary" className="mr-2">
                          {type.type}
                        </Badge>
                        <div className="ml-auto text-sm font-medium">
                          {type.count.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clients */}
            <Card className="transition-colors">
              <CardHeader>
                <CardTitle>Top Clients</CardTitle>
                <CardDescription>
                  Most active DNS clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {clients.slice(0, 6).map((client) => (
                    <div
                      key={client.client}
                      className="flex items-center space-x-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {client.client}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.count.toLocaleString()} queries
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClient(client.client)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs content would continue here... */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>
                  Detailed view of client DNS activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Client details will be displayed here...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queries">
            <Card>
              <CardHeader>
                <CardTitle>All DNS Queries</CardTitle>
                <CardDescription>
                  Real-time view of all DNS queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Query log will be displayed here...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle>DNS Lookup Tool</CardTitle>
                <CardDescription>
                  Perform DNS lookups and see results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter domain name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Lookup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
