'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  BuildingOfficeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  LinkIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface ExecutiveDashboard {
  overview: {
    totalBrands: number
    totalApps: number
    totalKeywords: number
    totalBacklinks: number
    totalArticles: number
    pendingArticles: number
  }
  articles: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
    growthWeek: number
    growthMonth: number
    statusBreakdown: Array<{ status: string; count: number }>
    weeklyProduction: Array<{ week: string; count: number }>
  }
  writers: {
    productivity: Array<{ writer: string; articles: number }>
    totalWriters: number
  }
  rankings: {
    trends: Array<{ date: string; improvements: number; drops: number }>
  }
  brands: {
    health: Array<{ name: string; articles: number; apps: number; backlinks: number }>
  }
  backlinks: {
    deals: { pending: number; approved: number; live: number; total: number }
  }
  recentArticles: Array<{
    id: string
    title: string
    status: string
    writer: string
    brand: string
    date: string
  }>
  lastUpdated: string
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3b82f6',
  ACCEPTED: '#22c55e',
  SENT_TO_DEV: '#f59e0b',
  UNPUBLISHED: '#8b5cf6',
  PUBLISHED: '#06b6d4',
  LIVE: '#10b981',
  REJECTED: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  SENT_TO_DEV: 'Sent to Dev',
  UNPUBLISHED: 'Unpublished',
  PUBLISHED: 'Published',
  LIVE: 'Live',
  REJECTED: 'Rejected',
}

export default function RoleBasedDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session?.user?.role === 'WRITER') {
        router.push('/writer/articles')
      } else {
        fetchDashboard()
      }
    }
  }, [status, router, session])

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard/executive')
      if (!response.ok) throw new Error('Failed to fetch dashboard')
      const data = await response.json()
      setDashboard(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="flex items-center justify-center py-20">
            <div className="spinner-lg text-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session || !dashboard) return null

  const currentUser = session.user

  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SEO') {
    const pieData = dashboard.articles.statusBreakdown.filter(s => s.count > 0)

    return (
      <div className="page-container">
        <div className="page-content">
          {/* Header */}
          <div className="mb-6">
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Business overview and performance metrics
            </p>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Link href="/brands" className="stat-card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <BuildingOfficeIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="stat-label">Brands</div>
                  <div className="stat-value">{dashboard.overview.totalBrands}</div>
                </div>
              </div>
            </Link>

            <Link href="/app-rankings" className="stat-card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="stat-label">Apps</div>
                  <div className="stat-value">{dashboard.overview.totalApps}</div>
                </div>
              </div>
            </Link>

            <Link href="/keywords" className="stat-card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <ChartBarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="stat-label">Keywords</div>
                  <div className="stat-value">{dashboard.overview.totalKeywords.toLocaleString()}</div>
                </div>
              </div>
            </Link>

            <Link href="/articles" className="stat-card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="stat-label">Articles</div>
                  <div className="stat-value">{dashboard.overview.totalArticles}</div>
                </div>
              </div>
            </Link>

            <Link href="/backlinks" className="stat-card hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                  <LinkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="stat-label">Backlinks</div>
                  <div className="stat-value">{dashboard.overview.totalBacklinks}</div>
                </div>
              </div>
            </Link>

            <div className="stat-card border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-900/50 p-2.5 rounded-lg">
                  <ClockIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="stat-label">Pending</div>
                  <div className="stat-value text-orange-600 dark:text-orange-400">{dashboard.overview.pendingArticles}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Article Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.articles.thisWeek}</p>
                  <p className="text-xs text-muted-foreground">articles created</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                  dashboard.articles.growthWeek >= 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {dashboard.articles.growthWeek >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                  {Math.abs(dashboard.articles.growthWeek)}%
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.articles.thisMonth}</p>
                  <p className="text-xs text-muted-foreground">articles created</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                  dashboard.articles.growthMonth >= 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {dashboard.articles.growthMonth >= 0 ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
                  {Math.abs(dashboard.articles.growthMonth)}%
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Writers</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.writers.totalWriters}</p>
                  <p className="text-xs text-muted-foreground">last 30 days</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Live Backlinks</p>
                  <p className="text-2xl font-bold mt-1">{dashboard.backlinks.deals.live}</p>
                  <p className="text-xs text-muted-foreground">{dashboard.backlinks.deals.pending} pending</p>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                  <LinkIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly Article Production */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Article Production (8 Weeks)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.articles.weeklyProduction}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" name="Articles" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking Trends */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Ranking Changes (7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.rankings.trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="improvements" name="Gains" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="drops" name="Drops" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Writer Productivity */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Writer Productivity (30 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.writers.productivity.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis
                      dataKey="writer"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={80}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="articles" name="Articles" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Article Status */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Article Pipeline</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, STATUS_LABELS[name as string] || name]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Status legend */}
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {pieData.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[entry.status] }}
                    />
                    <span className="text-muted-foreground">{STATUS_LABELS[entry.status]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-4">Recent Articles</h3>
              <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
                {dashboard.recentArticles.map((article) => (
                  <div key={article.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[article.status] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {article.brand} • {article.writer}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Brand Health Table */}
          <div className="card mt-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Brand Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Brand</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Apps</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Articles</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Backlinks</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboard.brands.health.slice(0, 10).map((brand) => {
                    const healthScore = Math.min(100, (brand.articles * 2) + (brand.backlinks * 3) + (brand.apps * 5))
                    return (
                      <tr key={brand.name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{brand.name}</td>
                        <td className="px-4 py-3 text-sm text-center">{brand.apps}</td>
                        <td className="px-4 py-3 text-sm text-center">{brand.articles}</td>
                        <td className="px-4 py-3 text-sm text-center">{brand.backlinks}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  healthScore >= 70 ? 'bg-green-500' :
                                  healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${healthScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{healthScore}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentUser?.role === 'WRITER') {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Redirecting to articles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please log in to view the dashboard</p>
        </div>
      </div>
    </div>
  )
}
