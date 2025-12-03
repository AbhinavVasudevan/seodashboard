'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface RankTrackerHistory {
  id: string
  position: number
  url: string | null
  traffic: number | null
  searchVolume: number | null
  difficulty: number | null
  cpc: number | null
  competition: number | null
  trend: number | null
  date: Date
}

interface RankTrackerHistoryProps {
  rankTrackerId: string
  keyword: string
  country: string
  domain: string
}

interface Statistics {
  totalRecords: number
  averagePosition: number | null
  bestPosition: number | null
  worstPosition: number | null
  currentPosition: number | null
  previousPosition: number | null
  positionChange: number | null
  averageTraffic: number | null
  averageSearchVolume: number | null
  firstRecorded: Date | null
  lastRecorded: Date | null
  daysTracked: number
  trend: string
}

const countryNames: Record<string, string> = {
  us: 'United States', gb: 'United Kingdom', ca: 'Canada', au: 'Australia',
  de: 'Germany', fr: 'France', es: 'Spain', it: 'Italy',
}

export default function RankTrackerHistory({ rankTrackerId, keyword, country, domain }: RankTrackerHistoryProps) {
  const [history, setHistory] = useState<RankTrackerHistory[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchHistory()
    fetchStatistics()
  }, [rankTrackerId, dateRange])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError('')
    try {
      let startDate
      const endDate = new Date()
      switch (dateRange) {
        case '7d': startDate = subDays(endDate, 7); break
        case '30d': startDate = subDays(endDate, 30); break
        case '90d': startDate = subDays(endDate, 90); break
        default: startDate = null
      }
      const params = new URLSearchParams({ rankTrackerId })
      if (startDate) params.append('startDate', startDate.toISOString())
      const response = await fetch(`/api/rank-tracker/history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch history')
      setHistory(await response.json())
    } catch (err) {
      console.error('Error fetching history:', err)
      setError('Failed to load history data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      let startDate
      const endDate = new Date()
      switch (dateRange) {
        case '7d': startDate = subDays(endDate, 7); break
        case '30d': startDate = subDays(endDate, 30); break
        case '90d': startDate = subDays(endDate, 90); break
        default: startDate = null
      }
      const response = await fetch('/api/rank-tracker/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankTrackerId, startDate: startDate?.toISOString(), endDate: endDate.toISOString() }),
      })
      if (!response.ok) throw new Error('Failed to fetch statistics')
      setStatistics(await response.json())
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  const formatChartData = (data: RankTrackerHistory[]) => {
    return data.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      position: item.position,
      traffic: item.traffic || 0,
      searchVolume: item.searchVolume || 0,
      difficulty: item.difficulty || 0,
    }))
  }

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'improving': return <Badge className="bg-green-100 text-green-800">Improving</Badge>
      case 'declining': return <Badge variant="destructive">Declining</Badge>
      case 'stable': return <Badge variant="secondary">Stable</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return <Card><CardContent className="py-6 text-destructive">{error}</CardContent></Card>
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground mb-2">No historical data available for this keyword.</p>
          <p className="text-sm text-muted-foreground">Fetch ranking data to start tracking history.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = formatChartData(history)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ranking History</CardTitle>
              <CardDescription>{keyword} - {countryNames[country] || country} - {domain}</CardDescription>
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Current Position</div>
                <div className="text-2xl font-bold text-primary">#{statistics.currentPosition || 'N/A'}</div>
                {statistics.positionChange !== null && (
                  <div className={`text-sm ${statistics.positionChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statistics.positionChange < 0 ? '↑' : '↓'} {Math.abs(statistics.positionChange)}
                  </div>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Average Position</div>
                <div className="text-2xl font-bold">#{statistics.averagePosition || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">Best: #{statistics.bestPosition || 'N/A'}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Days Tracked</div>
                <div className="text-2xl font-bold">{statistics.daysTracked}</div>
                <div className="text-sm text-muted-foreground">{statistics.totalRecords} records</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Trend</div>
                <div className="mt-1">{getTrendBadge(statistics.trend)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {statistics.averageSearchVolume ? `${statistics.averageSearchVolume.toLocaleString()} avg vol` : 'No volume data'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Position Over Time</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis reversed domain={['dataMin - 5', 'dataMax + 5']} className="text-xs" />
                <Tooltip formatter={(value: number) => [`#${value}`, 'Position']} />
                <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Traffic & Search Volume</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Area type="monotone" dataKey="traffic" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="searchVolume" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Keyword Difficulty</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="difficulty" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historical Data</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Traffic</TableHead>
                <TableHead>Search Volume</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), 'MMM dd, yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">#{record.position}</TableCell>
                  <TableCell>{record.traffic ? record.traffic.toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{record.searchVolume ? record.searchVolume.toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{record.difficulty ? `${record.difficulty}%` : 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {record.url ? (
                      <a href={record.url.startsWith('http') ? record.url : `https://${record.url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {record.url}
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
