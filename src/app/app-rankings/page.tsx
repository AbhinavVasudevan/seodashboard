'use client'

import { useState, useEffect } from 'react'
import { CloudArrowUpIcon, ChartBarIcon, FunnelIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { getCountryFlag } from '@/lib/utils'

interface App {
  id: string
  name: string
  platform: string
  brand: {
    name: string
  }
}

interface RankingData {
  rank: number | null
  prevRank: number | null
  change: number | null
}

interface KeywordRow {
  keyword: string
  country: string
  appRankings: { [appId: string]: RankingData }
}

interface MatrixData {
  apps: App[]
  keywordRows: KeywordRow[]
  countries: string[]
  date: string
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
  const [filter, setFilter] = useState<'all' | 'drops' | 'gains' | 'changed'>('all')
  const [sortBy, setSortBy] = useState<'alphabetical' | 'biggestDrops' | 'biggestGains' | 'bestRank'>('alphabetical')

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
      // Single optimized API call to fetch all data
      const response = await fetch(`/api/app-rankings/matrix?date=${selectedDate}`)
      const data: MatrixData = await response.json()

      setApps(data.apps)
      setKeywordRows(data.keywordRows)
      setCountries(data.countries)

      // Set first country as default if current selection is not in the list
      if (data.countries.length > 0 && !data.countries.includes(selectedCountry)) {
        setSelectedCountry(data.countries[0])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  // Helper to check if a row has any changes for filtered apps
  const rowHasChanges = (row: KeywordRow, changeType: 'any' | 'drops' | 'gains') => {
    return filteredApps.some(app => {
      const data = row.appRankings[app.id]
      if (!data || data.change === null) return false
      if (changeType === 'any') return data.change !== 0
      if (changeType === 'drops') return data.change < 0
      if (changeType === 'gains') return data.change > 0
      return false
    })
  }

  // Get the max change (positive or negative) for sorting
  const getMaxChange = (row: KeywordRow, type: 'drop' | 'gain') => {
    let maxChange = 0
    filteredApps.forEach(app => {
      const data = row.appRankings[app.id]
      if (data?.change !== null) {
        if (type === 'drop' && data.change < maxChange) {
          maxChange = data.change
        } else if (type === 'gain' && data.change > maxChange) {
          maxChange = data.change
        }
      }
    })
    return maxChange
  }

  // Get best rank in row
  const getBestRank = (row: KeywordRow) => {
    let best = Infinity
    filteredApps.forEach(app => {
      const data = row.appRankings[app.id]
      if (data?.rank !== null && data.rank < best) {
        best = data.rank
      }
    })
    return best === Infinity ? 999 : best
  }

  // Apply filters and sorting
  const filteredRows = keywordRows
    .filter(row => row.country === selectedCountry)
    .filter(row => {
      if (filter === 'all') return true
      if (filter === 'changed') return rowHasChanges(row, 'any')
      if (filter === 'drops') return rowHasChanges(row, 'drops')
      if (filter === 'gains') return rowHasChanges(row, 'gains')
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') return a.keyword.localeCompare(b.keyword)
      if (sortBy === 'biggestDrops') return getMaxChange(a, 'drop') - getMaxChange(b, 'drop')
      if (sortBy === 'biggestGains') return getMaxChange(b, 'gain') - getMaxChange(a, 'gain')
      if (sortBy === 'bestRank') return getBestRank(a) - getBestRank(b)
      return 0
    })

  const getRankColor = (rank: number | null) => {
    if (!rank) return ''
    if (rank <= 10) return 'bg-green-500 text-white'
    if (rank <= 50) return 'bg-yellow-500 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <div className="page-container">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-4 card p-3">
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
                  className="input-field h-8 text-xs w-auto"
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Store */}
              <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                {[
                  { value: 'ANDROID', label: 'Play' },
                  { value: 'IOS', label: 'iOS' },
                ].map(store => (
                  <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                      selectedStore === store.value
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {store.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border" />

              {/* Countries */}
              <div className="flex items-center gap-1 flex-wrap">
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                      selectedCountry === country
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {getCountryFlag(country)} {country}
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Filter */}
              <div className="flex items-center gap-1.5">
                <FunnelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="input-field h-7 text-xs py-0 pr-6 w-auto"
                >
                  <option value="all">All Keywords</option>
                  <option value="changed">Changed Only</option>
                  <option value="drops">Drops Only</option>
                  <option value="gains">Gains Only</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <ArrowsUpDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="input-field h-7 text-xs py-0 pr-6 w-auto"
                >
                  <option value="alphabetical">A-Z</option>
                  <option value="biggestDrops">Biggest Drops</option>
                  <option value="biggestGains">Biggest Gains</option>
                  <option value="bestRank">Best Rank</option>
                </select>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {selectedCells.size > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  <span>{selectedCells.size} selected</span>
                  <button
                    onClick={clearAllSelections}
                    className="text-primary hover:text-primary/80 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredRows.length}</span> keywords
              </span>
              <Link
                href="/app-rankings/upload"
                className="btn-primary h-8 text-xs px-3"
              >
                <CloudArrowUpIcon className="h-3.5 w-3.5" />
                Upload
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="card text-center py-16">
            <div className="spinner-lg text-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4 text-lg">Loading rankings...</p>
          </div>
        ) : (
          <>
            {/* Rankings Table */}
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                <h2 className="text-xl font-bold text-primary-foreground">Keyword Rankings Matrix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="sticky left-0 z-20 bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-muted-foreground border-r border-border">
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
                              <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                            )}
                            <span className="text-xs font-semibold text-foreground leading-tight">
                              {app.name}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredRows.map((row) => (
                      <tr key={`${row.keyword}-${row.country}`} className="hover:bg-muted/30 transition-colors">
                        <td className="sticky left-0 z-10 px-4 py-2.5 whitespace-nowrap text-sm font-medium text-foreground border-r border-border bg-card">
                          {row.keyword}
                        </td>
                        {filteredApps.map(app => {
                          const data = row.appRankings[app.id]
                          const rank = data?.rank ?? null
                          const change = data?.change ?? null
                          const isSelected = isCellSelected(row.keyword, row.country, app.id)
                          return (
                            <td
                              key={app.id}
                              className={`px-2 py-2.5 whitespace-nowrap text-center cursor-pointer transition-all ${
                                isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
                              }`}
                              onClick={() => handleCellClick(row.keyword, row.country, app.id)}
                            >
                              {rank !== null ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded text-xs font-bold ${getRankColor(rank)}`}>
                                    #{rank}
                                  </span>
                                  {change !== null && change !== 0 && (
                                    <span className={`text-[10px] font-semibold ${
                                      change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                      {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
                                    </span>
                                  )}
                                </div>
                              ) : data?.prevRank ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-muted-foreground/30 text-xs">-</span>
                                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                                    was #{data.prevRank}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/30 text-xs">-</span>
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
                <div className="empty-state py-12">
                  <ChartBarIcon className="empty-state-icon" />
                  <p className="text-sm text-muted-foreground">No rankings for {getCountryFlag(selectedCountry)} {selectedCountry} on {new Date(selectedDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
