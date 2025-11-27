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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const currentUser = session.user

  // Admin & SEO Dashboard (shared view)
  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SEO') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Alert Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Significant Drops Alert */}
            <div className={`rounded-lg p-4 ${alerts?.summary.significantDrops ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alerts?.summary.significantDrops ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <ExclamationTriangleIcon className={`h-5 w-5 ${alerts?.summary.significantDrops ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Big Drops (10+)</p>
                  <p className={`text-xl font-bold ${alerts?.summary.significantDrops ? 'text-red-600' : 'text-gray-400'}`}>
                    {alerts?.summary.significantDrops || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Drops */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <ArrowTrendingDownIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Drops</p>
                  <p className="text-xl font-bold text-orange-600">{alerts?.summary.totalDrops || 0}</p>
                </div>
              </div>
            </div>

            {/* Total Improvements */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Improvements</p>
                  <p className="text-xl font-bold text-green-600">{alerts?.summary.totalImprovements || 0}</p>
                </div>
              </div>
            </div>

            {/* Significant Improvements */}
            <div className={`rounded-lg p-4 ${alerts?.summary.significantImprovements ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${alerts?.summary.significantImprovements ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <CheckCircleIcon className={`h-5 w-5 ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Big Gains (10+)</p>
                  <p className={`text-xl font-bold ${alerts?.summary.significantImprovements ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {alerts?.summary.significantImprovements || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mb-6">
            <Link href="/brands" className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 p-2 rounded-lg">
                  <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Brands</p>
                  <p className="text-xl font-bold text-gray-900">{alerts?.summary.totalBrands || 0}</p>
                </div>
              </div>
            </Link>

            <Link href="/app-rankings" className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Apps Tracked</p>
                  <p className="text-xl font-bold text-gray-900">{alerts?.summary.totalApps || 0}</p>
                </div>
              </div>
            </Link>

            <Link href="/keywords" className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <DocumentTextIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Keywords</p>
                  <p className="text-xl font-bold text-gray-900">{alerts?.summary.totalKeywords || 0}</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Ranking Changes Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Drops */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                <div className="flex items-center gap-2">
                  <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Biggest Drops (24h)</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {alerts?.topDrops && alerts.topDrops.length > 0 ? (
                  alerts.topDrops.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{change.keyword}</p>
                          <p className="text-xs text-gray-500">
                            {change.appName} • {getCountryFlag(change.country)} {change.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <span className="text-xs text-gray-400">#{change.previousRank}</span>
                            <span className="text-xs text-gray-400 mx-1">→</span>
                            <span className="text-sm font-medium text-gray-900">#{change.currentRank}</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            {change.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No ranking drops in the last 24h
                  </div>
                )}
              </div>
            </div>

            {/* Top Improvements */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                <div className="flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Biggest Gains (24h)</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {alerts?.topImprovements && alerts.topImprovements.length > 0 ? (
                  alerts.topImprovements.slice(0, 8).map((change, idx) => (
                    <div key={idx} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{change.keyword}</p>
                          <p className="text-xs text-gray-500">
                            {change.appName} • {getCountryFlag(change.country)} {change.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <span className="text-xs text-gray-400">#{change.previousRank}</span>
                            <span className="text-xs text-gray-400 mx-1">→</span>
                            <span className="text-sm font-medium text-gray-900">#{change.currentRank}</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                            +{change.change}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No ranking improvements in the last 24h
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/app-rankings"
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
            >
              <ChartBarIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">App Rankings</p>
            </Link>
            <Link
              href="/keywords"
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
            >
              <DocumentTextIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Keywords</p>
            </Link>
            <Link
              href="/backlinks"
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
            >
              <LinkIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Backlinks</p>
            </Link>
            <Link
              href="/brands"
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-center"
            >
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">All Brands</p>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Writer Dashboard
  if (currentUser?.role === 'WRITER') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <p className="text-gray-600">Please log in to view the dashboard</p>
      </div>
    </div>
  )
}
