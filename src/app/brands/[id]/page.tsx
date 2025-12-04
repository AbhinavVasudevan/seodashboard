'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LinkIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { getFaviconUrl } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

interface BrandDashboard {
  brand: {
    id: string
    name: string
    domain: string | null
    description: string | null
    semrushProjectId: string | null
    semrushLastSync: string | null
  }
  counts: {
    apps: number
    keywords: number
    backlinks: number
    articles: number
  }
  articles: {
    statusBreakdown: Array<{ status: string; count: number }>
    recent: Array<{
      id: string
      title: string
      status: string
      writer: string
      date: string
    }>
    thisWeek: number
    thisMonth: number
  }
  backlinks: {
    avgDR: number
    totalSpent: number
    total: number
    recent: Array<{
      id: string
      rootDomain: string
      dr: number | null
      linkType: string | null
      createdAt: string
    }>
    topByDR: Array<{
      id: string
      rootDomain: string
      dr: number | null
      linkType: string | null
    }>
    byType: Array<{ type: string; count: number }>
  }
  apps: Array<{
    id: string
    name: string
    platform: string
    rankingsCount: number
  }>
  keywords: {
    total: number
    improvements: number
    drops: number
    stable: number
  }
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

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [dashboard, setDashboard] = useState<BrandDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [brandId])

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/brands/${brandId}/dashboard`)
      if (response.ok) {
        const data = await response.json()
        setDashboard(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="flex items-center justify-center py-12">
            <div className="spinner-lg text-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="empty-state py-12">
            <BuildingOfficeIcon className="empty-state-icon" />
            <p className="empty-state-title">Brand not found</p>
            <Link href="/brands" className="btn-primary mt-4">
              Back to Brands
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { brand, counts, articles, backlinks, apps, keywords } = dashboard
  const pieData = articles.statusBreakdown.filter(s => s.count > 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/brands')}
                className="action-btn"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              {brand.domain ? (
                <img
                  src={getFaviconUrl(brand.domain, 48)}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <h1 className="page-title">{brand.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {brand.domain && (
                    <a
                      href={`https://${brand.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <GlobeAltIcon className="h-3.5 w-3.5" />
                      {brand.domain}
                    </a>
                  )}
                  {brand.semrushProjectId && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      <CheckCircleIcon className="h-3 w-3" />
                      SEMRush Connected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link href={`/brands/${brandId}/articles`} className="btn-secondary text-sm">
                <PlusIcon className="h-4 w-4" />
                Article
              </Link>
              <Link href={`/brands/${brandId}/backlinks`} className="btn-secondary text-sm">
                <PlusIcon className="h-4 w-4" />
                Backlink
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href={`/brands/${brandId}/keywords/new`} className="stat-card hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <ChartBarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="stat-label">Keywords</div>
                <div className="stat-value">{counts.keywords.toLocaleString()}</div>
              </div>
            </div>
          </Link>

          <Link href={`/brands/${brandId}/backlinks`} className="stat-card hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                <LinkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="stat-label">Backlinks</div>
                <div className="stat-value">{counts.backlinks.toLocaleString()}</div>
              </div>
            </div>
          </Link>

          <Link href={`/brands/${brandId}/articles`} className="stat-card hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="stat-label">Articles</div>
                <div className="stat-value">{counts.articles.toLocaleString()}</div>
              </div>
            </div>
          </Link>

          <Link href={`/brands/${brandId}/apps/new`} className="stat-card hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="stat-label">Apps</div>
                <div className="stat-value">{counts.apps.toLocaleString()}</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-bold mt-1">{articles.thisWeek}</p>
                <p className="text-xs text-muted-foreground">articles created</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold mt-1">{articles.thisMonth}</p>
                <p className="text-xs text-muted-foreground">articles created</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <ClockIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. DR</p>
                <p className="text-2xl font-bold mt-1">{backlinks.avgDR}</p>
                <p className="text-xs text-muted-foreground">domain rating</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                <LinkIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
                <p className="text-2xl font-bold mt-1">${backlinks.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">on backlinks</p>
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                <CloudArrowDownIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Keyword Ranking Changes */}
        {keywords.total > 0 && (
          <div className="card p-4 mb-6">
            <h3 className="text-sm font-semibold mb-4">Keyword Ranking Changes</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                  <ArrowUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{keywords.improvements}</p>
                  <p className="text-xs text-muted-foreground">Improved</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                  <ArrowDownIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{keywords.drops}</p>
                  <p className="text-xs text-muted-foreground">Dropped</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                  <MinusIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{keywords.stable}</p>
                  <p className="text-xs text-muted-foreground">Stable</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Article Status Chart */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Article Pipeline</h3>
              <Link href={`/brands/${brandId}/articles`} className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
            {pieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <DocumentTextIcon className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No articles yet</p>
              </div>
            )}
          </div>

          {/* Recent Articles */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Articles</h3>
              <Link href={`/brands/${brandId}/articles`} className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
            {articles.recent.length > 0 ? (
              <div className="space-y-3">
                {articles.recent.map((article) => (
                  <div key={article.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[article.status] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.writer}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDate(article.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <DocumentTextIcon className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No articles yet</p>
              </div>
            )}
          </div>

          {/* Top Backlinks */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Top Backlinks by DR</h3>
              <Link href={`/brands/${brandId}/backlinks`} className="text-xs text-primary hover:underline">
                View All
              </Link>
            </div>
            {backlinks.topByDR.length > 0 ? (
              <div className="space-y-3">
                {backlinks.topByDR.map((bl) => (
                  <div key={bl.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      (bl.dr || 0) >= 50 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      (bl.dr || 0) >= 30 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {bl.dr || '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{bl.rootDomain}</p>
                      <p className="text-xs text-muted-foreground">{bl.linkType || 'Unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <LinkIcon className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No backlinks yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Apps Section */}
        {apps.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Apps</h3>
              <Link href={`/brands/${brandId}/apps/new`} className="text-xs text-primary hover:underline">
                Manage Apps
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  href={`/brands/${brandId}/apps/${app.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                >
                  <div className={`p-2 rounded-lg ${
                    app.platform === 'ANDROID'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <DevicePhoneMobileIcon className={`h-5 w-5 ${
                      app.platform === 'ANDROID'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {app.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {app.platform === 'ANDROID' ? 'Play Store' : 'App Store'} • {app.rankingsCount.toLocaleString()} rankings
                    </p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/brands/${brandId}/keywords/new`}
            className="card p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    Organic SEO
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Track website keyword rankings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Manage
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </div>
          </Link>

          <Link
            href={`/brands/${brandId}/backlinks`}
            className="card p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg">
                  <LinkIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    Backlinks
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Track acquired backlinks and DR
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Manage
                <ArrowRightIcon className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
