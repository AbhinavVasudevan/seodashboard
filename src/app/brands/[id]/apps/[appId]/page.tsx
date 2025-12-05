'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, PlusIcon, DocumentTextIcon, CloudArrowUpIcon, ChartBarIcon, PencilIcon, XMarkIcon, CheckIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
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
  traffic: number | null
  iosSearchVolume: number | null
  androidSearchVolume: number | null
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
  const [editingKeywordId, setEditingKeywordId] = useState<string | null>(null)
  const [editVolumes, setEditVolumes] = useState({ traffic: '', iosSearchVolume: '', androidSearchVolume: '' })
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportText, setBulkImportText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchAppData()
  }, [brandId, appId])

  const fetchAppData = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch all data in parallel
      const [brandResponse, appsResponse, keywordsResponse, rankingsResponse] = await Promise.all([
        fetch('/api/brands'),
        fetch(`/api/apps?brandId=${brandId}`),
        fetch(`/api/keywords?appId=${appId}`),
        fetch(`/api/app-rankings/upload?appId=${appId}&limit=50`)
      ])

      // Process brand
      if (brandResponse.ok) {
        const brands = await brandResponse.json()
        const currentBrand = brands.find((b: Brand) => b.id === brandId)
        if (currentBrand) {
          setBrand(currentBrand)
        }
      }

      // Process app
      if (appsResponse.ok) {
        const apps = await appsResponse.json()
        const currentApp = apps.find((a: App) => a.id === appId)
        if (!currentApp) {
          throw new Error('App not found')
        }
        setApp(currentApp)
      }

      // Process keywords
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        setKeywords(keywordsData)
      }

      // Process rankings
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

  const startEditing = (kw: Keyword) => {
    setEditingKeywordId(kw.id)
    setEditVolumes({
      traffic: kw.traffic?.toString() || '',
      iosSearchVolume: kw.iosSearchVolume?.toString() || '',
      androidSearchVolume: kw.androidSearchVolume?.toString() || ''
    })
  }

  const cancelEditing = () => {
    setEditingKeywordId(null)
    setEditVolumes({ traffic: '', iosSearchVolume: '', androidSearchVolume: '' })
  }

  const saveVolume = async (keywordId: string) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/keywords/volumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywordId,
          traffic: editVolumes.traffic ? parseInt(editVolumes.traffic) : null,
          iosSearchVolume: editVolumes.iosSearchVolume ? parseInt(editVolumes.iosSearchVolume) : null,
          androidSearchVolume: editVolumes.androidSearchVolume ? parseInt(editVolumes.androidSearchVolume) : null
        })
      })

      if (response.ok) {
        setKeywords(prev => prev.map(kw =>
          kw.id === keywordId
            ? {
                ...kw,
                traffic: editVolumes.traffic ? parseInt(editVolumes.traffic) : null,
                iosSearchVolume: editVolumes.iosSearchVolume ? parseInt(editVolumes.iosSearchVolume) : null,
                androidSearchVolume: editVolumes.androidSearchVolume ? parseInt(editVolumes.androidSearchVolume) : null
              }
            : kw
        ))
        setEditingKeywordId(null)
        setSaveMessage({ type: 'success', text: 'Saved!' })
        setTimeout(() => setSaveMessage(null), 2000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Failed to save' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Parse the pasted data (tab or comma separated)
      const lines = bulkImportText.trim().split('\n')
      const keywordsToUpdate = []

      for (const line of lines) {
        // Try tab first, then comma
        const parts = line.includes('\t') ? line.split('\t') : line.split(',')
        if (parts.length >= 2) {
          const keyword = parts[0].trim().toLowerCase()
          const traffic = parseInt(parts[1]) || null
          const iosSearchVolume = parts[2] ? parseInt(parts[2]) || null : null
          const androidSearchVolume = parts[3] ? parseInt(parts[3]) || null : null

          if (keyword) {
            keywordsToUpdate.push({
              keyword,
              country: 'US', // Default country for ASO
              traffic,
              iosSearchVolume,
              androidSearchVolume
            })
          }
        }
      }

      if (keywordsToUpdate.length === 0) {
        throw new Error('No valid keywords found in input')
      }

      const response = await fetch('/api/keywords/volumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordsToUpdate, appId })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSaveMessage({
          type: 'success',
          text: `Updated ${result.data.updated} keywords, created ${result.data.created} new`
        })
        setShowBulkImport(false)
        setBulkImportText('')
        fetchAppData() // Refresh the data
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setIsSaving(false)
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

    // First, add all keywords from the keywords list (includes volume data)
    keywordsData.forEach((kw) => {
      const key = `${kw.keyword}-${kw.country}`
      if (!keywordMap.has(key)) {
        keywordMap.set(key, {
          id: kw.id,
          keyword: kw.keyword,
          country: kw.country,
          traffic: kw.traffic,
          iosSearchVolume: kw.iosSearchVolume,
          androidSearchVolume: kw.androidSearchVolume,
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
          id: null,
          keyword: ranking.keyword,
          country: ranking.country,
          traffic: null,
          iosSearchVolume: null,
          androidSearchVolume: null,
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
              <button
                onClick={() => setShowBulkImport(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Import Volumes
              </button>
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

          {saveMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {saveMessage.text}
            </div>
          )}
          
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Traffic
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        iOS Vol
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Android Vol
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Edit
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
                    {generateKeywordRankingData(keywords, rankings).map((keywordData) => {
                      const isEditing = editingKeywordId === keywordData.id
                      const kwForEdit = keywords.find(k => k.id === keywordData.id)

                      return (
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
                        {/* Volume columns */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editVolumes.traffic}
                              onChange={(e) => setEditVolumes(prev => ({ ...prev, traffic: e.target.value }))}
                              className="w-20 px-2 py-1 text-xs border rounded"
                              placeholder="0"
                            />
                          ) : (
                            keywordData.traffic?.toLocaleString() || '-'
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editVolumes.iosSearchVolume}
                              onChange={(e) => setEditVolumes(prev => ({ ...prev, iosSearchVolume: e.target.value }))}
                              className="w-20 px-2 py-1 text-xs border rounded"
                              placeholder="0"
                            />
                          ) : (
                            keywordData.iosSearchVolume?.toLocaleString() || '-'
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editVolumes.androidSearchVolume}
                              onChange={(e) => setEditVolumes(prev => ({ ...prev, androidSearchVolume: e.target.value }))}
                              className="w-20 px-2 py-1 text-xs border rounded"
                              placeholder="0"
                            />
                          ) : (
                            keywordData.androidSearchVolume?.toLocaleString() || '-'
                          )}
                        </td>
                        <td className="px-2 py-4 whitespace-nowrap text-sm">
                          {keywordData.id && (
                            isEditing ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveVolume(keywordData.id)}
                                  disabled={isSaving}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Save"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                  title="Cancel"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => kwForEdit && startEditing(kwForEdit)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                                title="Edit volumes"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )
                          )}
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
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Import Keyword Volumes</h3>
              <button
                onClick={() => { setShowBulkImport(false); setBulkImportText(''); setSaveMessage(null) }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {saveMessage && (
                <div className={`p-3 rounded-lg text-sm ${saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {saveMessage.text}
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <p className="font-medium mb-1">Paste data from Google Sheets</p>
                <p className="text-xs">Format: Keyword, Traffic, iOS Vol, Android Vol (tab or comma separated)</p>
                <p className="text-xs mt-1">Example:</p>
                <code className="text-xs block mt-1 bg-blue-100 p-1 rounded">
                  betting	7166	1298	1271<br/>
                  casino	781	800	785
                </code>
              </div>

              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="w-full h-48 p-3 border rounded-lg text-sm font-mono"
                placeholder="Paste your keyword data here..."
              />
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => { setShowBulkImport(false); setBulkImportText(''); setSaveMessage(null) }}
                className="btn-secondary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkImportText.trim() || isSaving}
                className="btn-primary"
              >
                {isSaving ? 'Importing...' : 'Import Volumes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
