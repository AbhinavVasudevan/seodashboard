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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!session) return null

  const currentUser = session.user

  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SEO') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Alert Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className={alerts?.summary.significantDrops ? 'border-destructive/50 bg-destructive/5' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${alerts?.summary.significantDrops ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <ExclamationTriangleIcon className={`h-5 w-5 ${alerts?.summary.significantDrops ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Big Drops (10+)</p>
                    <p className={`text-xl font-bold ${alerts?.summary.significantDrops ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {alerts?.summary.significantDrops || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <ArrowTrendingDownIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Drops</p>
                    <p className="text-xl font-bold text-orange-600">{alerts?.summary.totalDrops || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Improvements</p>
                    <p className="text-xl font-bold text-green-600">{alerts?.summary.totalImprovements || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={alerts?.summary.significantImprovements ? 'border-emerald-200 bg-emerald-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${alerts?.summary.significantImprovements ? 'bg-emerald-100' : 'bg-muted'}`}>
                    <CheckCircleIcon className={`h-5 w-5 ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Big Gains (10+)</p>
                    <p className={`text-xl font-bold ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {alerts?.summary.significantImprovements || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link href="/brands">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <BuildingOfficeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Brands</p>
                      <p className="text-xl font-bold">{alerts?.summary.totalBrands || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/app-rankings">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Apps Tracked</p>
                      <p className="text-xl font-bold">{alerts?.summary.totalApps || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/keywords">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Keywords</p>
                      <p className="text-xl font-bold">{alerts?.summary.totalKeywords || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Ranking Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-destructive/10 border-b border-destructive/20 py-3">
                <CardTitle className="text-destructive flex items-center gap-2 text-base">
                  <ArrowTrendingDownIcon className="h-5 w-5" />
                  Biggest Drops (24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {alerts?.topDrops && alerts.topDrops.length > 0 ? (
                  alerts.topDrops.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{change.keyword}</p>
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
                          <Badge variant="destructive">{change.change}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No ranking drops in the last 24h
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-green-50 border-b border-green-100 py-3">
                <CardTitle className="text-green-700 flex items-center gap-2 text-base">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                  Biggest Gains (24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {alerts?.topImprovements && alerts.topImprovements.length > 0 ? (
                  alerts.topImprovements.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{change.keyword}</p>
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
                          <Badge className="bg-green-100 text-green-700">+{change.change}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No ranking improvements in the last 24h
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/app-rankings">
              <Card className="hover:shadow-md transition-shadow text-center cursor-pointer">
                <CardContent className="pt-6">
                  <ChartBarIcon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">App Rankings</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/keywords">
              <Card className="hover:shadow-md transition-shadow text-center cursor-pointer">
                <CardContent className="pt-6">
                  <DocumentTextIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Keywords</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/backlinks">
              <Card className="hover:shadow-md transition-shadow text-center cursor-pointer">
                <CardContent className="pt-6">
                  <LinkIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Backlinks</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/brands">
              <Card className="hover:shadow-md transition-shadow text-center cursor-pointer">
                <CardContent className="pt-6">
                  <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">All Brands</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (currentUser?.role === 'WRITER') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <p className="text-muted-foreground">Please log in to view the dashboard</p>
      </div>
    </div>
  )
}
