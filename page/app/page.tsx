"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, Globe, Search, RefreshCw, Github, Play, Pause, Clock, TrendingUp, Shield, AlertTriangle, Zap, Network, BarChart3 } from "lucide-react"
import { AnimatedNumber } from "@/components/animated-number"

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

export default function DNSDashboard() {
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

  const fetchClientQueries = async (client: string, page = 1) => {
    const apiUrl = ""
    try {
      const res = await fetch(`${apiUrl}/api/client-queries?client=${client}&page=${page}&page_size=20`)
      const data = await res.json()
      setClientQueries(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch client queries:", error)
    }
  }

  const fetchAllQueries = async (page = 1) => {
    const apiUrl = ""
    try {
      const res = await fetch(`${apiUrl}/api/all-queries?page=${page}&page_size=50`)
      const data = await res.json()
      setAllQueries(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch all queries:", error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchAllQueries(1)
  }, [])

  useEffect(() => {
    if (selectedClient) {
      fetchClientQueries(selectedClient, currentPage)
    }
  }, [selectedClient, currentPage])

  useEffect(() => {
    if (selectedDomain) {
      fetchDomainClients(selectedDomain, domainPage)
    }
  }, [selectedDomain, domainPage])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        fetchData()
        if (!selectedClient) {
          fetchAllQueries(currentPage)
        }
      }, refreshInterval * 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, selectedClient, currentPage])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const searchDomains = async (term: string, page = 1) => {
    if (!term.trim()) {
      setSearchResults([])
      return
    }

    const apiUrl = ""
    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        domain: term.trim(),
        partial: "true",
        page: page.toString(),
        page_size: "20"
      })
      const res = await fetch(`${apiUrl}/api/domain-queries?${params}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to search domains:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const fetchDomainClients = async (domain: string, page = 1) => {
    const apiUrl = ""
    try {
      const res = await fetch(`${apiUrl}/api/domain-clients?domain=${domain}&page=${page}&page_size=20`)
      const data = await res.json()
      setDomainClients(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch domain clients:", error)
      setDomainClients([])
    }
  }

  const getTotalQueries = () => {
    if (!queryTypes || !Array.isArray(queryTypes)) return 0
    return queryTypes.reduce((sum, item) => sum + item.count, 0)
  }

  const getUnknownQueries = () => {
    if (!queryTypes || !Array.isArray(queryTypes)) return 0
    return queryTypes.find((t) => t.type === "UNKNOWN")?.count || 0
  }

  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DNS Analytics Dashboard</h1>
            <p className="text-gray-600">MikroTik DNS Query Analytics - Last 24 Hours</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {lastUpdated && (
              <span className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
            <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => window.open('https://github.com/publi0/mikrotik-dns', '_blank')}
              className="h-10 flex items-center gap-2"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Button>
            
            <div className="flex items-center border rounded-lg bg-white h-10 px-3 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`h-6 w-6 p-0 rounded transition-colors ${
                  autoRefresh 
                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {autoRefresh ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-500" />
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={!autoRefresh}
                  className={`bg-transparent border-none outline-none text-xs font-medium ${
                    autoRefresh ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
              
              {autoRefresh && (
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-1"></div>
              )}
            </div>

            <Button 
              onClick={fetchData} 
              disabled={loading} 
              size="default"
              className="h-10 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm text-indigo-700 font-medium">Total Queries</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    <AnimatedNumber value={getTotalQueries()} />
                  </div>
                  <div className="text-xs text-indigo-600">Last 24 hours</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <div className="text-sm text-red-700 font-medium">Failed Queries</div>
                  <div className="text-2xl font-bold text-red-900">
                    <AnimatedNumber value={getUnknownQueries()} />
                  </div>
                  <div className="text-xs text-red-600">
                    {getTotalQueries() > 0 ? ((getUnknownQueries() / getTotalQueries()) * 100).toFixed(1) : "0"}% of total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-green-700 font-medium">Active Clients</div>
                  <div className="text-2xl font-bold text-green-900">
                    <AnimatedNumber value={uniqueClientsCount} />
                  </div>
                  <div className="text-xs text-green-600">Unique IP addresses</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-purple-700 font-medium">Unique Domains</div>
                  <div className="text-2xl font-bold text-purple-900">
                    <AnimatedNumber value={uniqueDomainsCount} />
                  </div>
                  <div className="text-xs text-purple-600">Different domains queried</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="queries">All Queries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Query Types - Modern Design */}
              <Card className="col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <CardTitle>Query Types</CardTitle>
                  </div>
                  <CardDescription>DNS query distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {queryTypes && queryTypes.slice(0, 6).map((item, index) => {
                      const percentage = (item.count / getTotalQueries()) * 100
                      const isUnknown = item.type === "UNKNOWN"
                      return (
                        <div key={item.type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${isUnknown ? 'bg-red-500' : ''}`}
                                style={!isUnknown ? { backgroundColor: `hsl(${index * 60}, 70%, 55%)` } : {}}
                              />
                              <span className={`text-sm font-medium ${isUnknown ? 'text-red-600' : ''}`}>
                                {item.type}
                              </span>
                              {isUnknown && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm">{item.count.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${isUnknown ? 'bg-red-500' : ''}`}
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: !isUnknown ? `hsl(${index * 60}, 70%, 55%)` : undefined
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Domains - Enhanced */}
              <Card className="col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-600" />
                    <CardTitle>Top Domains</CardTitle>
                  </div>
                  <CardDescription>Most requested domains</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topDomains && topDomains.slice(0, 8).map((item, index) => {
                      const maxCount = topDomains[0]?.count || 1
                      const percentage = (item.count / maxCount) * 100
                      const isTopThree = index < 3
                      
                      return (
                        <div key={item.domain} className={`p-3 rounded-lg border transition-colors hover:bg-gray-50 ${isTopThree ? 'bg-gradient-to-r from-blue-50 to-transparent border-blue-200' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${isTopThree ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {index + 1}
                              </span>
                              <span className="font-medium truncate text-sm" title={item.domain}>
                                {item.domain}
                              </span>
                            </div>
                            <Badge variant={isTopThree ? "default" : "secondary"} className="text-xs">
                              {item.count.toLocaleString()}
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-700 ${isTopThree ? 'bg-blue-600' : 'bg-gray-400'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Overview - New */}
              <Card className="col-span-1">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <CardTitle>Activity Summary</CardTitle>
                  </div>
                  <CardDescription>Network insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    
                    {/* Query Rate */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Zap className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Query Rate</div>
                          <div className="text-xs text-gray-500">Avg. per minute</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">
                          {queriesPerMinute.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">queries/min</div>
                      </div>
                    </div>

                    {/* Network Health */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Resolution Rate</div>
                          <div className="text-xs text-gray-500">Successful queries</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {(((getTotalQueries() - getUnknownQueries()) / getTotalQueries()) * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">success</div>
                      </div>
                    </div>

                    {/* Client Distribution */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Network className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Avg. per Client</div>
                          <div className="text-xs text-gray-500">Queries per device</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          {uniqueClientsCount > 0 ? Math.round(getTotalQueries() / uniqueClientsCount).toLocaleString() : '0'}
                        </div>
                        <div className="text-xs text-gray-500">per device</div>
                      </div>
                    </div>

                    {/* IPv4 vs IPv6 Distribution */}
                    <div className="p-3 bg-gradient-to-r from-orange-50 to-transparent rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">IP Version Usage</div>
                            <div className="text-xs text-gray-500">IPv4 vs IPv6 adoption</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-orange-600">
                            {((ipv6Count / (ipv4Count + ipv6Count || 1)) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">IPv6</div>
                        </div>
                      </div>
                      
                      {/* IPv4 Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            IPv4
                          </span>
                          <span className="font-medium">{ipv4Count.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${(ipv4Count / (ipv4Count + ipv6Count || 1)) * 100}%` }}
                          />
                        </div>
                        
                        {/* IPv6 Bar */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            IPv6
                          </span>
                          <span className="font-medium">{ipv6Count.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${(ipv6Count / (ipv4Count + ipv6Count || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="domains" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top 20 Domains</CardTitle>
                  <CardDescription>Most frequently queried domains</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topDomains.map((item, index) => (
                      <div
                        key={item.domain}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedDomain === item.domain ? "bg-blue-50 border-blue-200" : ""
                        }`}
                        onClick={() => setSelectedDomain(item.domain)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-sm font-mono text-gray-500 w-8 flex-shrink-0">#{index + 1}</span>
                          <span className="font-medium truncate" title={item.domain}>{item.domain}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <Badge variant={selectedDomain === item.domain ? "default" : "outline"}>
                            {item.count} queries
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Domain Client Details</CardTitle>
                  <CardDescription>
                    {selectedDomain ? `Clients querying ${selectedDomain}` : "Select a domain to view client details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDomain ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={selectedDomain}
                          onChange={(e) => setSelectedDomain(e.target.value)}
                          placeholder="Enter domain name"
                          className="font-mono"
                        />
                        <Button onClick={() => fetchDomainClients(selectedDomain, 1)} size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-3 font-medium text-sm text-gray-600 w-40">Client IP</th>
                              <th className="text-left p-3 font-medium text-sm text-gray-600 w-32">Queries</th>
                              <th className="text-left p-3 font-medium text-sm text-gray-600">Last Query</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domainClients.map((client, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-mono text-blue-600 text-sm">
                                  <span 
                                    className="cursor-pointer hover:text-blue-800 transition-colors" 
                                    title={`${client.client} (click to copy)`}
                                    onClick={() => copyToClipboard(client.client)}
                                  >
                                    {client.client}
                                  </span>
                                </td>
                                <td className="p-3 text-sm">
                                  <Badge variant="secondary" className="font-mono">
                                    {client.query_count}
                                  </Badge>
                                </td>
                                <td className="p-3 font-mono text-gray-500 text-xs">
                                  {formatTimestamp(client.last_query)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(1, domainPage - 1)
                            setDomainPage(newPage)
                            fetchDomainClients(selectedDomain, newPage)
                          }}
                          disabled={domainPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="px-3 py-1 text-sm">Page {domainPage}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const newPage = domainPage + 1
                            setDomainPage(newPage)
                            fetchDomainClients(selectedDomain, newPage)
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Click on a domain to view which clients are querying it
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Clients</CardTitle>
                  <CardDescription>Most active IP addresses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clients.map((item, index) => (
                      <div
                        key={item.client}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => setSelectedClient(item.client)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-gray-500 w-8">#{index + 1}</span>
                          <span className="font-mono">{item.client}</span>
                        </div>
                        <Badge variant={selectedClient === item.client ? "default" : "outline"}>
                          {item.count} queries
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Query Details</CardTitle>
                  <CardDescription>
                    {selectedClient ? `Queries from ${selectedClient}` : "Select a client to view details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedClient ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Input
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          placeholder="Enter IP address"
                          className="font-mono"
                        />
                        <Button onClick={() => fetchClientQueries(selectedClient, 1)} size="sm">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left p-3 font-medium text-sm text-gray-600 w-48">Time</th>
                              <th className="text-left p-3 font-medium text-sm text-gray-600 w-80">Domain</th>
                              <th className="text-right p-3 font-medium text-sm text-gray-600 w-20">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientQueries.map((query, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-mono text-gray-500 text-xs">
                                  {formatTimestamp(query.timestamp)}
                                </td>
                                <td className="p-3 font-medium text-sm">
                                  <span 
                                    className="truncate block cursor-pointer hover:text-blue-600 transition-colors" 
                                    title={`${query.domain} (click to copy)`}
                                    onClick={() => copyToClipboard(query.domain)}
                                  >
                                    {query.domain}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {query.type}
                                    </Badge>
                                    {query.type === "UNKNOWN" && (
                                      <Badge variant="destructive" className="text-xs">
                                        UNKNOWN
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="px-3 py-1 text-sm">Page {currentPage}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Click on a client IP address to view their query history
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All DNS Queries</CardTitle>
                <CardDescription>Recent DNS queries from all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-sm text-gray-600 w-48">Time</th>
                        <th className="text-left p-3 font-medium text-sm text-gray-600 w-32">Client</th>
                        <th className="text-left p-3 font-medium text-sm text-gray-600 w-80">Domain</th>
                        <th className="text-right p-3 font-medium text-sm text-gray-600 w-20">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allQueries.map((query, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-mono text-gray-500 text-xs">
                            {formatTimestamp(query.timestamp)}
                          </td>
                          <td className="p-3 font-mono text-blue-600 text-xs">
                            <span 
                              className="cursor-pointer hover:text-blue-800 transition-colors" 
                              title={`${query.client} (click to copy)`}
                              onClick={() => copyToClipboard(query.client)}
                            >
                              {query.client}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-sm">
                            <span 
                              className="truncate block cursor-pointer hover:text-blue-600 transition-colors" 
                              title={`${query.domain} (click to copy)`}
                              onClick={() => copyToClipboard(query.domain)}
                            >
                              {query.domain}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {query.type}
                              </Badge>
                              {query.type === "UNKNOWN" && (
                                <Badge variant="destructive" className="text-xs">
                                  UNKNOWN
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1)
                      setCurrentPage(newPage)
                      fetchAllQueries(newPage)
                    }}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-3 py-1 text-sm">Page {currentPage}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const newPage = currentPage + 1
                      setCurrentPage(newPage)
                      fetchAllQueries(newPage)
                    }}
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Domain Search with DNS Resolution</CardTitle>
                <CardDescription>Search for domains and see live DNS resolution status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Enter domain name (e.g., google.com or just google)"
                        className="w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setSearchPage(1)
                            searchDomains(searchTerm, 1)
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        setSearchPage(1)
                        searchDomains(searchTerm, 1)
                      }}
                      disabled={isSearching || !searchTerm.trim()}
                      className="flex items-center gap-2"
                    >
                      <Search className={`h-4 w-4 ${isSearching ? "animate-spin" : ""}`} />
                      {isSearching ? "Resolving..." : "Search"}
                    </Button>
                  </div>

                  {isSearching && (
                    <div className="flex items-center justify-center py-8 text-blue-600">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Searching domains and resolving DNS...</span>
                      </div>
                    </div>
                  )}

                  {searchResults && searchResults.length > 0 && (
                    <div className="space-y-3">
                      {searchResults.map((result, index) => {
                        const { domain, type, resolution } = result
                        const getStatusStyles = (status: string) => {
                          switch (status) {
                            case "success":
                              return {
                                bgColor: "bg-green-100",
                                textColor: "text-green-700",
                                icon: "✓"
                              }
                            case "blocked":
                              return {
                                bgColor: "bg-red-100", 
                                textColor: "text-red-700",
                                icon: "✗"
                              }
                            case "error":
                              return {
                                bgColor: "bg-orange-100",
                                textColor: "text-orange-700", 
                                icon: "⚠"
                              }
                            default:
                              return {
                                bgColor: "bg-gray-100",
                                textColor: "text-gray-700",
                                icon: "?"
                              }
                          }
                        }
                        
                        const statusStyles = getStatusStyles(resolution.status)

                        return (
                          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span 
                                    className="font-mono font-medium cursor-pointer hover:text-blue-600 transition-colors truncate"
                                    title={`${domain} (click to copy)`}
                                    onClick={() => copyToClipboard(domain)}
                                  >
                                    {domain}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                  <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${statusStyles.bgColor} ${statusStyles.textColor}`}>
                                    <span>{statusStyles.icon}</span>
                                    <span className="capitalize">{resolution.status}</span>
                                    <span className="text-gray-500">({resolution.duration}ms)</span>
                                  </div>
                                </div>
                                
                                {resolution.status === "success" && resolution.records.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-gray-500 mb-1">{type} Records:</div>
                                    {resolution.records.map((record, recordIndex) => (
                                      <div key={recordIndex} className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {record}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 hover:bg-gray-200"
                                          onClick={() => copyToClipboard(record)}
                                          title="Copy record"
                                        >
                                          <span className="text-xs">📋</span>
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {resolution.status === "blocked" && (
                                  <div className="flex items-center gap-2 text-red-600 text-xs">
                                    <Shield className="h-3 w-3" />
                                    <span>Domain appears to be blocked or non-existent</span>
                                  </div>
                                )}
                                
                                {resolution.status === "error" && resolution.error && (
                                  <div className="flex items-center gap-2 text-orange-600 text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{resolution.error}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {searchTerm && (!searchResults || searchResults.length === 0) && !isSearching && (
                    <div className="text-center text-gray-500 py-8">
                      No results found for "{searchTerm}"
                    </div>
                  )}

                  {!searchTerm && (
                    <div className="text-center text-gray-500 py-8 space-y-2">
                      <div>🔍 Enter a domain name to search and perform live DNS resolution</div>
                      <div className="text-xs text-gray-400">This will show if domains are blocked, their IP addresses, and resolution status</div>
                    </div>
                  )}

                  {searchResults && searchResults.length > 0 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = Math.max(1, searchPage - 1)
                          setSearchPage(newPage)
                          searchDomains(searchTerm, newPage)
                        }}
                        disabled={searchPage === 1 || isSearching}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-1 text-sm">Page {searchPage}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          const newPage = searchPage + 1
                          setSearchPage(newPage)
                          searchDomains(searchTerm, newPage)
                        }}
                        disabled={isSearching}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}