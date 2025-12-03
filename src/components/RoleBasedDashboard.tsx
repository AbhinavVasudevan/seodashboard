'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getCountryFlag } from '@/lib/utils'

interface RankingChange {
  appName: string
  brandName: string
  keyword: string
  country: string
  platform: string
  previousRank: number | null
  currentRank: number
  change: number
}

interface DashboardAlerts {
  summary: {
    totalApps: number
    totalKeywords: number
    totalBrands: number
    totalDrops: number
    totalImprovements: number
    significantDrops: number
    significantImprovements: number
  }
  topDrops: RankingChange[]
  topImprovements: RankingChange[]
  lastUpdated: string
}

export default function RoleBasedDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState<DashboardAlerts | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session?.user?.role === 'WRITER') {
        router.push('/writer/articles')
      } else {
        fetchAlerts()
      }
    }
  }, [status, router, session])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/dashboard/alerts')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data)
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
          <div className="flex items-center justify-center py-12">
            <div className="spinner-lg text-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const currentUser = session.user

  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SEO') {
    return (
      <div className="page-container">
        <div className="page-content">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground">App Store ranking changes in the last 24 hours</p>
          </div>

          {/* Alert Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`stat-card ${alerts?.summary.significantDrops ? 'border-destructive/50 bg-destructive/5' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alerts?.summary.significantDrops ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <ExclamationTriangleIcon className={`h-5 w-5 ${alerts?.summary.significantDrops ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="stat-label">Big Drops (10+)</div>
                  <div className={`stat-value ${alerts?.summary.significantDrops ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {alerts?.summary.significantDrops || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="stat-card border-orange-200 bg-orange-50">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <ArrowTrendingDownIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="stat-label">Total Drops</div>
                  <div className="stat-value text-orange-600">{alerts?.summary.totalDrops || 0}</div>
                </div>
              </div>
            </div>

            <div className="stat-card border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="stat-label">Improvements</div>
                  <div className="stat-value text-green-600">{alerts?.summary.totalImprovements || 0}</div>
                </div>
              </div>
            </div>

            <div className={`stat-card ${alerts?.summary.significantImprovements ? 'border-emerald-200 bg-emerald-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alerts?.summary.significantImprovements ? 'bg-emerald-100' : 'bg-muted'}`}>
                  <CheckCircleIcon className={`h-5 w-5 ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="stat-label">Big Gains (10+)</div>
                  <div className={`stat-value ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {alerts?.summary.significantImprovements || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link href="/brands" className="stat-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BuildingOfficeIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="stat-label">Brands</div>
                  <div className="stat-value">{alerts?.summary.totalBrands || 0}</div>
                </div>
              </div>
            </Link>

            <Link href="/app-rankings" className="stat-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="stat-label">Apps Tracked</div>
                  <div className="stat-value">{alerts?.summary.totalApps || 0}</div>
                </div>
              </div>
            </Link>

            <Link href="/keywords" className="stat-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="stat-label">Keywords</div>
                  <div className="stat-value">{alerts?.summary.totalKeywords || 0}</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Ranking Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Drops */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
                <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <ArrowTrendingDownIcon className="h-4 w-4" />
                  Biggest Drops (24h)
                </h3>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin">
                {alerts?.topDrops && alerts.topDrops.length > 0 ? (
                  alerts.topDrops.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{change.keyword}</p>
                          <p className="text-xs text-muted-foreground">
                            {change.appName} - {getCountryFlag(change.country)} {change.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">#{change.previousRank}</span>
                            <span className="text-xs text-muted-foreground mx-1">→</span>
                            <span className="text-sm font-medium">#{change.currentRank}</span>
                          </div>
                          <span className="badge-destructive font-bold">{change.change}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state py-8">
                    <CheckCircleIcon className="empty-state-icon h-8 w-8" />
                    <p className="text-sm text-muted-foreground">No ranking drops in the last 24h</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Improvements */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                  Biggest Gains (24h)
                </h3>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin">
                {alerts?.topImprovements && alerts.topImprovements.length > 0 ? (
                  alerts.topImprovements.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{change.keyword}</p>
                          <p className="text-xs text-muted-foreground">
                            {change.appName} - {getCountryFlag(change.country)} {change.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">#{change.previousRank}</span>
                            <span className="text-xs text-muted-foreground mx-1">→</span>
                            <span className="text-sm font-medium">#{change.currentRank}</span>
                          </div>
                          <span className="badge-success font-bold">+{change.change}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state py-8">
                    <ArrowTrendingUpIcon className="empty-state-icon h-8 w-8" />
                    <p className="text-sm text-muted-foreground">No ranking improvements in the last 24h</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/app-rankings" className="card p-6 text-center hover:shadow-md transition-shadow">
              <ChartBarIcon className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">App Rankings</p>
            </Link>
            <Link href="/keywords" className="card p-6 text-center hover:shadow-md transition-shadow">
              <DocumentTextIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Keywords</p>
            </Link>
            <Link href="/backlinks" className="card p-6 text-center hover:shadow-md transition-shadow">
              <LinkIcon className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Backlinks</p>
            </Link>
            <Link href="/brands" className="card p-6 text-center hover:shadow-md transition-shadow">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">All Brands</p>
            </Link>
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
