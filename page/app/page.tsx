"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Users, Globe, Search, RefreshCw, Github, Play, Pause, Clock } from "lucide-react"
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

interface AllQuery {
  timestamp: number
  client: string
  domain: string
  type: string
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
  const [searchResults, setSearchResults] = useState<AllQuery[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [isSearching, setIsSearching] = useState(false)

  const fetchData = async () => {
    const apiUrl = ""
    setLoading(true)
    try {
      const [domainsRes, typesRes, clientsRes, uniqueClientsRes, uniqueDomainsRes] = await Promise.all([
        fetch(`${apiUrl}/api/top-domains`),
        fetch(`${apiUrl}/api/query-types`),
        fetch(`${apiUrl}/api/clients`),
        fetch(`${apiUrl}/api/unique-clients-count`),
        fetch(`${apiUrl}/api/unique-domains-count`),
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
      setSearchResults(data || [])
    } catch (error) {
      console.error("Failed to search domains:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={getTotalQueries()} />
              </div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unknown Queries</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                <AnimatedNumber value={getUnknownQueries()} />
              </div>
              <p className="text-xs text-muted-foreground">
                {getTotalQueries() > 0 ? ((getUnknownQueries() / getTotalQueries()) * 100).toFixed(1) : "0"}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={uniqueClientsCount} />
              </div>
              <p className="text-xs text-muted-foreground">Unique IP addresses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Domains</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={uniqueDomainsCount} />
              </div>
              <p className="text-xs text-muted-foreground">Different domains queried</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Query Types Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Query Types Distribution</CardTitle>
                  <CardDescription>DNS query types in the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {queryTypes && queryTypes.map((item, index) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: `hsl(${index * 45}, 70%, 50%)` }}
                          />
                          <span className="font-medium">{item.type}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{item.count.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">
                            {((item.count / getTotalQueries()) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Domains */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Domains</CardTitle>
                  <CardDescription>Most queried domains</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topDomains && topDomains.slice(0, 10).map((item, index) => (
                      <div key={item.domain} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-sm font-mono text-gray-500 flex-shrink-0">#{index + 1}</span>
                          <span className="font-medium truncate" title={item.domain}>{item.domain}</span>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0 ml-3">{item.count}</Badge>
                      </div>
                    ))}
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
                      <div key={item.domain} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-sm font-mono text-gray-500 w-8 flex-shrink-0">#{index + 1}</span>
                          <span className="font-medium truncate" title={item.domain}>{item.domain}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <Badge variant="outline">{item.count} queries</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Domain Query Visualization</CardTitle>
                  <CardDescription>Visual representation of query volumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topDomains.slice(0, 10).map((item, index) => {
                      const maxCount = topDomains[0]?.count || 1
                      const percentage = (item.count / maxCount) * 100
                      return (
                        <div key={item.domain} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="truncate flex-1 mr-3" title={item.domain}>{item.domain}</span>
                            <span className="font-mono flex-shrink-0">{item.count}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                <CardTitle>Domain Search</CardTitle>
                <CardDescription>Search for specific domains or partial matches</CardDescription>
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
                      Search
                    </Button>
                  </div>

                  {searchResults && searchResults.length > 0 && (
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
                          {searchResults.map((query, index) => (
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
                  )}

                  {searchTerm && (!searchResults || searchResults.length === 0) && !isSearching && (
                    <div className="text-center text-gray-500 py-8">
                      No results found for "{searchTerm}"
                    </div>
                  )}

                  {!searchTerm && (
                    <div className="text-center text-gray-500 py-8">
                      Enter a domain name to search for DNS queries
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
                        disabled={searchPage === 1}
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