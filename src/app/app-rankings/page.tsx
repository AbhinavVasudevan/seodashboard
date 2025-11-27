'use client'

import { useState, useEffect } from 'react'
import { CloudArrowUpIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { getCountryFlag } from '@/lib/utils'

interface AppRanking {
  id: string
  keyword: string
  country: string
  rank: number
  score?: number
  traffic?: number
  date: string
  app: {
    id: string
    name: string
    platform: string
    brand: {
      name: string
    }
  }
}

interface App {
  id: string
  name: string
  platform: string
  brand: {
    name: string
  }
}

interface Keyword {
  id: string
  keyword: string
  country: string
}

interface KeywordRow {
  keyword: string
  country: string
  appRankings: { [appId: string]: number | null }
}

export default function AppRankingsPage() {
  const [apps, setApps] = useState<App[]>([])
  const [keywordRows, setKeywordRows] = useState<KeywordRow[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string>('GB')
  const [countries, setCountries] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('ANDROID')
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())

  // Load selected cells from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedRankingCells')
    if (saved) {
      try {
        const cellsArray = JSON.parse(saved)
        setSelectedCells(new Set(cellsArray))
      } catch (e) {
        console.error('Error loading selected cells:', e)
      }
    }
  }, [])

  // Handle cell selection (toggle)
  const handleCellClick = (keyword: string, country: string, appId: string) => {
    const cellId = `${keyword}|${country}|${appId}`
    setSelectedCells(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cellId)) {
        newSet.delete(cellId)
      } else {
        newSet.add(cellId)
      }
      // Save to localStorage
      localStorage.setItem('selectedRankingCells', JSON.stringify(Array.from(newSet)))
      return newSet
    })
  }

  // Check if cell is selected
  const isCellSelected = (keyword: string, country: string, appId: string) => {
    return selectedCells.has(`${keyword}|${country}|${appId}`)
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedCells(new Set())
    localStorage.removeItem('selectedRankingCells')
  }

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch all apps
      const appsResponse = await fetch('/api/apps')
      const appsData = await appsResponse.json()
      setApps(appsData)

      // Fetch all keywords for all apps
      const allKeywordsMap = new Map<string, KeywordRow>()
      const uniqueCountries = new Set<string>()

      for (const app of appsData) {
        // Fetch keywords for this app
        const keywordsResponse = await fetch(`/api/keywords?appId=${app.id}`)
        const keywords: Keyword[] = await keywordsResponse.json()

        // Add all keywords to the map
        keywords.forEach((kw) => {
          const key = `${kw.keyword}|${kw.country}`
          uniqueCountries.add(kw.country)

          if (!allKeywordsMap.has(key)) {
            allKeywordsMap.set(key, {
              keyword: kw.keyword,
              country: kw.country,
              appRankings: {},
            })
          }

          // Initialize ranking as null for this app
          const row = allKeywordsMap.get(key)!
          if (!(app.id in row.appRankings)) {
            row.appRankings[app.id] = null
          }
        })

        // Fetch rankings for this app for the selected date
        const rankingsResponse = await fetch(`/api/app-rankings/upload?appId=${app.id}&limit=1000`)
        const allRankings = await rankingsResponse.json()

        // Filter rankings for selected date
        const dateRankings = allRankings.filter((r: AppRanking) => {
          const rankingDate = new Date(r.date).toISOString().split('T')[0]
          return rankingDate === selectedDate
        })

        // Fill in the rankings
        dateRankings.forEach((ranking: AppRanking) => {
          const key = `${ranking.keyword}|${ranking.country}`
          if (allKeywordsMap.has(key)) {
            const row = allKeywordsMap.get(key)!
            row.appRankings[app.id] = ranking.rank
          }
        })
      }

      const sortedCountries = Array.from(uniqueCountries).sort()
      setCountries(sortedCountries)
      // Set first country as default if not already set
      if (!selectedCountry && sortedCountries.length > 0) {
        setSelectedCountry(sortedCountries[0])
      }

      // Convert to array and sort by keyword
      const rows = Array.from(allKeywordsMap.values()).sort((a, b) => {
        if (a.country !== b.country) return a.country.localeCompare(b.country)
        return a.keyword.localeCompare(b.keyword)
      })

      setKeywordRows(rows)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredRows = selectedCountry
    ? keywordRows.filter(row => row.country === selectedCountry)
    : []

  // Filter apps by selected store AND by country
  const filteredApps = apps.filter(app => {
    // Filter by store
    if (app.platform !== selectedStore) {
      return false
    }
    // Only show apps that have keywords for the selected country
    return keywordRows.some(row =>
      row.country === selectedCountry && app.id in row.appRankings
    )
  })

  const getRankColor = (rank: number | null) => {
    if (!rank) return ''
    if (rank <= 10) return 'bg-green-500 text-white'
    if (rank <= 50) return 'bg-yellow-500 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date */}
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="h-5 w-px bg-gray-200" />

              {/* Store */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
                {[
                  { value: 'ANDROID', label: 'Play' },
                  { value: 'IOS', label: 'iOS' },
                ].map(store => (
                  <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                      selectedStore === store.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {store.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-gray-200" />

              {/* Countries */}
              <div className="flex items-center gap-1 flex-wrap">
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                      selectedCountry === country
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {getCountryFlag(country)} {country}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {selectedCells.size > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                  <span>{selectedCells.size} selected</span>
                  <button
                    onClick={clearAllSelections}
                    className="text-blue-500 hover:text-blue-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{filteredRows.length}</span> keywords
              </span>
              <Link
                href="/app-rankings/upload"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
              >
                <CloudArrowUpIcon className="h-3.5 w-3.5" />
                Upload
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="card text-center py-16 shadow-md">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 mt-4 text-lg">Loading rankings...</p>
          </div>
        ) : (
          <>
            {/* Rankings Table */}
            <div className="card overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Keyword Rankings Matrix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-gray-200">
                        Keyword
                      </th>
                      {filteredApps.map(app => (
                        <th key={app.id} className="px-2 py-3 text-center min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            {app.platform === 'ANDROID' ? (
                              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                            )}
                            <span className="text-xs font-semibold text-gray-700 leading-tight">
                              {app.name}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredRows.map((row) => (
                      <tr key={`${row.keyword}-${row.country}`} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 bg-white">
                          {row.keyword}
                        </td>
                        {filteredApps.map(app => {
                          const rank = row.appRankings[app.id]
                          const isSelected = isCellSelected(row.keyword, row.country, app.id)
                          return (
                            <td
                              key={app.id}
                              className={`px-2 py-2.5 whitespace-nowrap text-center cursor-pointer transition-all ${
                                isSelected ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''
                              }`}
                              onClick={() => handleCellClick(row.keyword, row.country, app.id)}
                            >
                              {rank !== null ? (
                                <span className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded text-xs font-bold ${getRankColor(rank)}`}>
                                  #{rank}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRows.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No rankings for {getCountryFlag(selectedCountry)} {selectedCountry} on {new Date(selectedDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
