'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon, DocumentTextIcon, CloudArrowUpIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { getCountryFlag } from '@/lib/utils'

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
}

interface AppRanking {
  id: string
  keyword: string
  country: string
  rank: number
  score: number | null
  traffic: number | null
  date: string
}

interface Brand {
  id: string
  name: string
}

export default function AppDetailPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string
  const appId = params.appId as string

  const [app, setApp] = useState<App | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [rankings, setRankings] = useState<AppRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    fetchAppData()
  }, [brandId, appId])

  const fetchAppData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch brand details
      const brandResponse = await fetch('/api/brands')
      if (brandResponse.ok) {
        const brands = await brandResponse.json()
        const currentBrand = brands.find((b: Brand) => b.id === brandId)
        if (currentBrand) {
          setBrand(currentBrand)
        }
      }

      // Fetch app details
      const appsResponse = await fetch(`/api/apps?brandId=${brandId}`)
      if (appsResponse.ok) {
        const apps = await appsResponse.json()
        const currentApp = apps.find((a: App) => a.id === appId)
        
        if (!currentApp) {
          throw new Error('App not found')
        }
        
        setApp(currentApp)
      }

      // Fetch keywords for this app
      const keywordsResponse = await fetch(`/api/keywords?appId=${appId}`)
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        setKeywords(keywordsData)
      }

      // Fetch latest rankings for this app
      const rankingsResponse = await fetch(`/api/app-rankings/upload?appId=${appId}&limit=50`)
      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json()
        setRankings(rankingsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const clearRankings = async () => {
    if (!confirm('Are you sure you want to clear all ranking data for this app? This action cannot be undone.')) {
      return
    }

    try {
      setIsClearing(true)
      const response = await fetch(`/api/app-rankings/upload?appId=${appId}&clear=true`)
      if (response.ok) {
        const result = await response.json()
        setRankings([])
        alert(result.message)
      } else {
        throw new Error('Failed to clear rankings')
      }
    } catch (error) {
      alert('Error clearing rankings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsClearing(false)
    }
  }

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
  // Combines keywords list with any available ranking data
  const generateKeywordRankingData = (keywordsData: Keyword[], rankingsData: AppRanking[]) => {
    const keywordMap = new Map()
    const dateHeaders = generateDateHeaders()

    // First, add all keywords from the keywords list
    keywordsData.forEach((kw) => {
      const key = `${kw.keyword}-${kw.country}`
      if (!keywordMap.has(key)) {
        keywordMap.set(key, {
          keyword: kw.keyword,
          country: kw.country,
          dateRankings: []
        })
      }
    })

    // Then, add/update with rankings data
    rankingsData.forEach((ranking) => {
      const key = `${ranking.keyword}-${ranking.country}`
      const rankingDate = ranking.date.split('T')[0] // Get date part only

      if (!keywordMap.has(key)) {
        keywordMap.set(key, {
          keyword: ranking.keyword,
          country: ranking.country,
          dateRankings: []
        })
      }

      const keywordData = keywordMap.get(key)!
      keywordData.dateRankings.push({
        date: rankingDate,
        rank: ranking.rank
      })
    })

    // Convert to array and fill in missing dates
    const result = Array.from(keywordMap.values()).map((keywordData) => {
      const dateRankingsMap = new Map(
        keywordData.dateRankings.map((dr: any) => [dr.date, dr.rank])
      )

      const filledDateRankings = dateHeaders.map((header) => ({
        date: header.date,
        rank: dateRankingsMap.get(header.date) || null
      }))

      return {
        ...keywordData,
        dateRankings: filledDateRankings
      }
    })

    // Sort by country then keyword
    return result.sort((a, b) => {
      if (a.country !== b.country) return a.country.localeCompare(b.country)
      return a.keyword.localeCompare(b.keyword)
    })
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

  if (error || !app || !brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-red-600">
            {error || 'App not found'}
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
                <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
                <p className="text-gray-600 mt-1">
                  {brand.name} • {app.platform}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            href={`/brands/${brandId}/apps/${appId}/keywords/new`}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center gap-3 p-8"
          >
            <PlusIcon className="h-8 w-8 text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Add ASO Keywords</h3>
              <p className="text-sm text-gray-600 mt-1">Track app store search rankings</p>
            </div>
          </Link>

          <Link
            href={`/brands/${brandId}/apps/${appId}/rankings/upload`}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center gap-3 p-8"
          >
            <CloudArrowUpIcon className="h-8 w-8 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Upload Rankings CSV</h3>
              <p className="text-sm text-gray-600 mt-1">Update daily keyword rankings</p>
            </div>
          </Link>
        </div>

        {/* Rankings Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">ASO Keyword Rankings</h2>
            <div className="flex gap-2">
              <Link
                href={`/brands/${brandId}/apps/${appId}/keywords/new`}
                className="btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Keywords
              </Link>
              <Link
                href={`/brands/${brandId}/apps/${appId}/rankings/upload`}
                className="btn-primary flex items-center gap-2"
              >
                <CloudArrowUpIcon className="h-4 w-4" />
                Upload CSV
              </Link>
            </div>
          </div>
          
          {keywords.length === 0 && rankings.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500 mb-4">No keywords added yet.</p>
              <p className="text-sm text-gray-600">
                1. Add ASO keywords to track<br/>
                2. Upload daily CSV files with rankings
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    {generateKeywordRankingData(keywords, rankings).map((keywordData) => (
                      <tr key={`${keywordData.keyword}-${keywordData.country}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {keywordData.keyword}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <span>{getCountryFlag(keywordData.country)}</span>
                            <span>{keywordData.country}</span>
                          </span>
                        </td>
                        {keywordData.dateRankings.map((dateRanking: any, dateIdx: number) => {
                          // Calculate change from previous day
                          const prevDayRanking = dateIdx > 0 ? keywordData.dateRankings[dateIdx - 1] : null
                          let change = null
                          let changeDirection: 'up' | 'down' | 'same' | null = null

                          if (dateRanking.rank !== null && prevDayRanking?.rank !== null) {
                            // Both ranked - lower rank number is better
                            change = prevDayRanking.rank - dateRanking.rank
                            if (change > 0) {
                              changeDirection = 'up' // Rank improved (moved up)
                            } else if (change < 0) {
                              changeDirection = 'down' // Rank worsened (moved down)
                            } else {
                              changeDirection = 'same'
                            }
                          } else if (dateRanking.rank !== null && prevDayRanking?.rank === null) {
                            // Went from NR to ranked - good
                            changeDirection = 'up'
                          } else if (dateRanking.rank === null && prevDayRanking?.rank !== null) {
                            // Went from ranked to NR - bad
                            changeDirection = 'down'
                          }

                          return (
                            <td key={dateRanking.date} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {dateRanking.rank !== null ? (
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    dateRanking.rank <= 10 ? 'bg-green-100 text-green-800' :
                                    dateRanking.rank <= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    #{dateRanking.rank}
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
                                <span className="text-gray-400">NR</span>
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
