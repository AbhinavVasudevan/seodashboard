'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, ArrowLeftIcon, ChartBarIcon, DocumentTextIcon, LinkIcon } from '@heroicons/react/24/outline'
import SEMRushSync from '@/components/SEMRushSync'

interface Brand {
  id: string
  name: string
  domain?: string | null
  description?: string
  createdAt: string
  semrushProjectId?: string | null
  semrushCampaignId?: string | null
  semrushLastSync?: string | null
  _count: {
    apps: number
    keywords: number
    backlinks: number
    articles: number
  }
}

interface App {
  id: string
  name: string
  platform: string
  createdAt: string
}

interface Keyword {
  id: string
  keyword: string
  country: string
  createdAt: string
  rankings?: {
    position: number | null
    date: string
  }[]
}

interface KeywordRankingData {
  keyword: string
  country: string
  dateRankings: {
    date: string
    position: number | null
  }[]
}

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBrandData()
  }, [brandId])

  // Generate date headers for last 5 days
  const generateDateHeaders = () => {
    const headers = []
    const today = new Date()

    for (let i = 4; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      const dateStr = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      })

      const isToday = i === 0
      const label = isToday ? `${dateStr}(Today)` : dateStr

      headers.push({
        date: date.toISOString().split('T')[0],
        label: label
      })
    }

    return headers
  }

  // Generate keyword ranking data organized by keyword and date
  const generateKeywordRankingData = (keywordsData: Keyword[]): KeywordRankingData[] => {
    const dateHeaders = generateDateHeaders()

    return keywordsData.map((keyword) => {
      // Create a map of dates to positions
      const rankingsMap = new Map(
        (keyword.rankings || []).map((r) => [
          new Date(r.date).toISOString().split('T')[0],
          r.position
        ])
      )

      // Fill in all dates from the last 5 days
      const dateRankings = dateHeaders.map((header) => ({
        date: header.date,
        position: rankingsMap.get(header.date) || null
      }))

      return {
        keyword: keyword.keyword,
        country: keyword.country,
        dateRankings
      }
    })
  }

  const fetchBrandData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch brand details
      const brandResponse = await fetch('/api/brands')
      if (!brandResponse.ok) throw new Error('Failed to fetch brands')

      const brands = await brandResponse.json()
      const currentBrand = brands.find((b: Brand) => b.id === brandId)

      if (!currentBrand) {
        throw new Error('Brand not found')
      }

      setBrand(currentBrand)

      // Fetch apps for this brand
      const appsResponse = await fetch(`/api/apps?brandId=${brandId}`)
      if (appsResponse.ok) {
        const appsData = await appsResponse.json()
        setApps(appsData)
      }

      // Fetch keywords for this brand
      const keywordsResponse = await fetch(`/api/keywords?brandId=${brandId}`)
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        setKeywords(keywordsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-red-600">
            {error || 'Brand not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{brand.name}</h1>
                <p className="text-gray-600 mt-1">{brand.description || 'No description'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Apps</p>
                <p className="text-2xl font-semibold text-gray-900">{brand._count.apps}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Keywords</p>
                <p className="text-2xl font-semibold text-gray-900">{brand._count.keywords}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <LinkIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Backlinks</p>
                <p className="text-2xl font-semibold text-gray-900">{brand._count.backlinks}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <DocumentTextIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Articles</p>
                <p className="text-2xl font-semibold text-gray-900">{brand._count.articles}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href={`/brands/${brandId}/apps/new`}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center gap-3 p-8"
          >
            <PlusIcon className="h-8 w-8 text-primary-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Add New App</h3>
              <p className="text-sm text-gray-600 mt-1">Create a new app for this brand</p>
            </div>
          </Link>

          <Link
            href={`/brands/${brandId}/keywords/new`}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center gap-3 p-8"
          >
            <PlusIcon className="h-8 w-8 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Organic SEO Keywords</h3>
              <p className="text-sm text-gray-600 mt-1">Track website search rankings</p>
            </div>
          </Link>

          <Link
            href={`/brands/${brandId}/articles`}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center gap-3 p-8"
          >
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Manage Articles</h3>
              <p className="text-sm text-gray-600 mt-1">Track content production</p>
            </div>
          </Link>
        </div>

        {/* Apps Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Apps</h2>
            <Link 
              href={`/brands/${brandId}/apps/new`}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add App
            </Link>
          </div>
          
          {apps.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No apps yet. Create your first app to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <Link 
                  key={app.id} 
                  href={`/brands/${brandId}/apps/${app.id}`}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{app.platform}</p>
                    </div>
                    <span className="status-badge status-success">Active</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Created {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 text-sm text-primary-600 font-medium">
                    Manage Keywords →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Keywords Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Organic SEO Keywords</h2>
            <div className="flex gap-2">
              <Link
                href={`/brands/${brandId}/keywords/update-rankings`}
                className="btn-secondary flex items-center gap-2"
              >
                <ChartBarIcon className="h-4 w-4" />
                Update Rankings
              </Link>
              <Link
                href={`/brands/${brandId}/keywords/new`}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Keywords
              </Link>
            </div>
          </div>

          {/* SEMRush Sync */}
          <div className="mb-6">
            <SEMRushSync
              brandId={brandId}
              brandName={brand.name}
              domain={brand.domain}
              onSyncComplete={fetchBrandData}
            />
          </div>

          {keywords.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No organic keywords yet. Add keywords to track your website's search rankings.</p>
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      {/* Generate date headers for last 5 days */}
                      {generateDateHeaders().map((dateHeader) => (
                        <th key={dateHeader.date} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {dateHeader.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generateKeywordRankingData(keywords).map((keywordData, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                          {keywordData.keyword}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {keywordData.country}
                        </td>
                        {keywordData.dateRankings.map((dateRanking, dateIdx) => {
                          // Calculate change from previous day
                          const prevDayRanking = dateIdx > 0 ? keywordData.dateRankings[dateIdx - 1] : null
                          let change = null
                          let changeDirection: 'up' | 'down' | 'same' | null = null

                          if (dateRanking.position !== null && prevDayRanking && prevDayRanking.position !== null) {
                            // If either is NR (0), handle differently
                            if (dateRanking.position === 0 && prevDayRanking.position !== 0) {
                              // Went from ranked to NR - bad
                              changeDirection = 'down'
                            } else if (dateRanking.position !== 0 && prevDayRanking.position === 0) {
                              // Went from NR to ranked - good
                              changeDirection = 'up'
                            } else if (dateRanking.position !== 0 && prevDayRanking.position !== 0) {
                              // Both ranked - lower position number is better
                              change = prevDayRanking.position - dateRanking.position
                              if (change > 0) {
                                changeDirection = 'up' // Position improved (moved up in rankings)
                              } else if (change < 0) {
                                changeDirection = 'down' // Position worsened (moved down in rankings)
                              } else {
                                changeDirection = 'same'
                              }
                            }
                          }

                          return (
                            <td key={dateIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {dateRanking.position !== null ? (
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    dateRanking.position <= 10 ? 'bg-green-100 text-green-800' :
                                    dateRanking.position <= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    dateRanking.position === 0 ? 'bg-gray-100 text-gray-600' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {dateRanking.position === 0 ? 'NR' : `#${dateRanking.position}`}
                                  </span>
                                  {changeDirection && changeDirection !== 'same' && (
                                    <span className={`inline-flex items-center text-[10px] font-medium ${
                                      changeDirection === 'up' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {changeDirection === 'up' ? '↑' : '↓'}
                                      {change !== null && Math.abs(change) > 0 && Math.abs(change)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
