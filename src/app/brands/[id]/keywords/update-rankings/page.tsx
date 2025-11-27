'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface Keyword {
  id: string
  keyword: string
  country: string
  rankings?: {
    position: number
    date: string
  }[]
}

interface RankingInput {
  keywordId: string
  position: string
  url?: string
  modified?: boolean
}

export default function UpdateRankingsPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [brandName, setBrandName] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [rankings, setRankings] = useState<Record<string, RankingInput>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [brandId])

  // Reset form when date changes
  useEffect(() => {
    if (keywords.length > 0) {
      const initialRankings: Record<string, RankingInput> = {}
      keywords.forEach((keyword: Keyword) => {
        initialRankings[keyword.id] = {
          keywordId: keyword.id,
          position: '',
          url: '',
          modified: false,
        }
      })
      setRankings(initialRankings)
    }
  }, [date])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch brand details
      const brandResponse = await fetch('/api/brands')
      if (brandResponse.ok) {
        const brands = await brandResponse.json()
        const brand = brands.find((b: any) => b.id === brandId)
        if (brand) {
          setBrandName(brand.name)
        }
      }

      // Fetch keywords for this brand
      const keywordsResponse = await fetch(`/api/keywords?brandId=${brandId}`)
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        setKeywords(keywordsData)

        // Initialize rankings object - leave empty for new entries
        const initialRankings: Record<string, RankingInput> = {}
        keywordsData.forEach((keyword: Keyword) => {
          initialRankings[keyword.id] = {
            keywordId: keyword.id,
            position: '',
            url: '',
            modified: false,
          }
        })
        setRankings(initialRankings)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load keywords')
    } finally {
      setIsLoading(false)
    }
  }

  const updateRanking = (keywordId: string, field: 'position' | 'url', value: string) => {
    setRankings(prev => ({
      ...prev,
      [keywordId]: {
        ...prev[keywordId],
        [field]: value,
        modified: true, // Mark as modified when user changes any field
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    console.log('=== FORM SUBMISSION DEBUG ===')
    console.log('1. Date state value:', date)
    console.log('2. Date type:', typeof date)

    try {
      // Filter rankings that have been modified by the user
      const rankingsToUpdate = Object.values(rankings).filter(
        r => r.modified === true
      )

      if (rankingsToUpdate.length === 0) {
        throw new Error('Please modify at least one ranking position')
      }

      console.log('3. Rankings to update:', rankingsToUpdate.length)

      const promises = rankingsToUpdate.map(ranking => {
        // If position is empty string, treat as NR (position = 0)
        const positionValue = ranking.position.trim() === '' ? 0 : parseInt(ranking.position)

        const payload = {
          keywordId: ranking.keywordId,
          position: positionValue,
          url: ranking.url || undefined,
          date: date,
        }

        console.log('4. Sending payload:', payload)

        return fetch('/api/keyword-rankings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      })

      const responses = await Promise.all(promises)

      const hasError = responses.some(response => !response.ok)
      if (hasError) {
        throw new Error('Some rankings failed to update')
      }

      setSuccess(`Successfully updated ${rankingsToUpdate.length} keyword ranking(s)`)

      // Refresh data after a short delay to show success message
      setTimeout(() => {
        router.push(`/brands/${brandId}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Update Organic Rankings</h1>
              <p className="text-gray-600 mt-1">Update daily rankings for {brandName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-1">
              📊 Manual Ranking Update
            </p>
            <p className="text-xs text-blue-600 mb-2">
              Enter the current search engine ranking position for each keyword.
            </p>
            <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
              <li>Enter position (1-200) for ranked keywords</li>
              <li>Type "0" or leave empty for "Not Ranked" (NR)</li>
              <li>Leave unchanged to skip updating that keyword</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          {keywords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No keywords found. Add keywords first before updating rankings.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Ranking Date *
                </label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field max-w-xs"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Select the date for these rankings (usually today)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                        Keyword
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Previous Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        New Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Ranking URL (Optional)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {keywords.map((keyword) => {
                      // Find ranking for the selected date
                      const selectedDateStr = new Date(date).toISOString().split('T')[0]
                      const rankingForDate = keyword.rankings?.find(
                        r => new Date(r.date).toISOString().split('T')[0] === selectedDateStr
                      )

                      return (
                        <tr key={keyword.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {keyword.keyword}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {keyword.country}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {rankingForDate ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                rankingForDate.position === 0 ? 'bg-gray-100 text-gray-600' :
                                rankingForDate.position <= 10 ? 'bg-green-100 text-green-800' :
                                rankingForDate.position <= 50 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {rankingForDate.position === 0 ? 'NR' : `#${rankingForDate.position}`}
                              </span>
                            ) : (
                              <span className="text-gray-400">No data</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="200"
                                placeholder="e.g. 15 or 0"
                                value={rankings[keyword.id]?.position || ''}
                                onChange={(e) => updateRanking(keyword.id, 'position', e.target.value)}
                                className="input-field flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => updateRanking(keyword.id, 'position', '0')}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                                title="Mark as Not Ranked"
                              >
                                NR
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="url"
                              placeholder="https://example.com/page"
                              value={rankings[keyword.id]?.url || ''}
                              onChange={(e) => updateRanking(keyword.id, 'url', e.target.value)}
                              className="input-field w-full text-sm"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving Rankings...' : 'Save Rankings'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
