'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, ChartBarIcon, XMarkIcon, ArrowPathIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getCountryFlag } from '@/lib/utils'

interface Keyword {
  id: string
  keyword: string
  country: string
  brand: {
    id: string
    name: string
  }
  rankings: Array<{
    position: number
    date: string
  }>
}

interface KeywordRanking {
  id: string
  position: number
  url?: string
  traffic?: number
  searchVolume?: number
  difficulty?: number
  date: string
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')
  const [rankings, setRankings] = useState<KeywordRanking[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    country: 'GB',
    brandId: '',
  })
  const [brands, setBrands] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [countries, setCountries] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncBrandId, setSyncBrandId] = useState('')

  useEffect(() => {
    fetchKeywords()
    fetchBrands()
  }, [])

  useEffect(() => {
    if (selectedKeyword) {
      fetchKeywordRankings(selectedKeyword)
    }
  }, [selectedKeyword])

  const fetchKeywords = async () => {
    try {
      // Fetch only organic SEO keywords (linked to brands, not apps)
      const response = await fetch('/api/keywords?type=organic')
      const data = await response.json()
      setKeywords(data)

      // Extract unique countries
      const uniqueCountries = Array.from(new Set(data.map((k: Keyword) => k.country))).sort() as string[]
      setCountries(uniqueCountries)
      if (uniqueCountries.length > 0 && !selectedCountry) {
        setSelectedCountry(uniqueCountries[0])
      }
    } catch (error) {
      console.error('Error fetching keywords:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      const data = await response.json()
      setBrands(data)
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchKeywordRankings = async (keywordId: string) => {
    try {
      const response = await fetch(`/api/keywords/${keywordId}/rankings`)
      const data = await response.json()
      setRankings(data)
    } catch (error) {
      console.error('Error fetching keyword rankings:', error)
    }
  }

  const handleAddKeyword = async () => {
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newKeyword),
      })

      if (response.ok) {
        setNewKeyword({ keyword: '', country: 'GB', brandId: '' })
        setShowAddForm(false)
        fetchKeywords()
      }
    } catch (error) {
      console.error('Error adding keyword:', error)
    }
  }

  const handleSEMRushSync = async () => {
    if (!syncBrandId) return

    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const response = await fetch('/api/semrush/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: syncBrandId })
      })

      const data = await response.json()

      if (data.success) {
        setSyncMessage({
          type: 'success',
          text: `Synced ${data.data.keywordsCreated} new keywords, ${data.data.rankingsImported} rankings imported`
        })
        fetchKeywords()
        setShowSyncModal(false)
        setSyncBrandId('')
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Sync failed' })
      }
    } catch (error) {
      setSyncMessage({ type: 'error', text: 'Failed to sync with SEMRush' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRefreshRankings = async () => {
    if (!syncBrandId) return

    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const response = await fetch('/api/semrush/refresh-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: syncBrandId })
      })

      const data = await response.json()

      if (data.success) {
        setSyncMessage({
          type: 'success',
          text: `Refreshed: ${data.data.rankingsCreated} new, ${data.data.rankingsUpdated} updated`
        })
        fetchKeywords()
        setShowSyncModal(false)
        setSyncBrandId('')
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Refresh failed' })
      }
    } catch (error) {
      setSyncMessage({ type: 'error', text: 'Failed to refresh rankings' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter keywords
  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (keyword.brand?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCountry = !selectedCountry || keyword.country === selectedCountry
    const matchesBrand = !selectedBrand || keyword.brand?.id === selectedBrand
    return matchesSearch && matchesCountry && matchesBrand
  })

  // Get unique brands from filtered keywords
  const brandsInKeywords = Array.from(new Set(keywords.filter(k => k.brand).map(k => JSON.stringify({ id: k.brand.id, name: k.brand.name }))))
    .map(s => JSON.parse(s))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))

  const getChartData = () => {
    return rankings
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(ranking => ({
        date: new Date(ranking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        position: ranking.position,
      }))
  }

  const selectedKeywordData = keywords.find(k => k.id === selectedKeyword)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading keywords...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filter Bar */}
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
                />
              </div>

              <div className="h-5 w-px bg-gray-200" />

              {/* Countries */}
              <div className="flex items-center gap-1 flex-wrap">
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(selectedCountry === country ? '' : country)}
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

              <div className="h-5 w-px bg-gray-200" />

              {/* Brand Filter */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All Brands</option>
                {brandsInKeywords.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{filteredKeywords.length}</span> keywords
              </span>
              <button
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
              >
                <CloudArrowDownIcon className="h-3.5 w-3.5" />
                SEMRush Sync
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Keywords List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Organic SEO Keywords</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredKeywords.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No keywords found
                  </div>
                ) : (
                  filteredKeywords.map((keyword) => (
                    <div
                      key={keyword.id}
                      onClick={() => setSelectedKeyword(keyword.id)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedKeyword === keyword.id
                          ? 'bg-primary-50 border-l-2 border-l-primary-600'
                          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{keyword.keyword}</p>
                          <p className="text-xs text-gray-500">
                            {getCountryFlag(keyword.country)} {keyword.country} {keyword.brand && `• ${keyword.brand.name}`}
                          </p>
                        </div>
                        {keyword.rankings.length > 0 && (
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            keyword.rankings[0].position <= 10
                              ? 'bg-green-100 text-green-700'
                              : keyword.rankings[0].position <= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            #{keyword.rankings[0].position}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Keyword Details */}
          <div className="lg:col-span-2">
            {selectedKeyword && selectedKeywordData ? (
              <div className="space-y-4">
                {/* Selected Keyword Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedKeywordData.keyword}</h2>
                      <p className="text-sm text-gray-500">
                        {getCountryFlag(selectedKeywordData.country)} {selectedKeywordData.country} {selectedKeywordData.brand && `• ${selectedKeywordData.brand.name}`}
                      </p>
                    </div>
                    {selectedKeywordData.rankings.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Current Position</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded text-lg font-bold ${
                          selectedKeywordData.rankings[0].position <= 10
                            ? 'bg-green-100 text-green-700'
                            : selectedKeywordData.rankings[0].position <= 50
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          #{selectedKeywordData.rankings[0].position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700">Ranking History</h3>
                  </div>
                  {getChartData().length > 0 ? (
                    <div className="p-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis reversed tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="position"
                            stroke="#667eea"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No ranking data available</p>
                    </div>
                  )}
                </div>

                {/* Rankings Table */}
                {rankings.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700">Historical Data</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Position</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">URL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Traffic</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Volume</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {rankings.slice(0, 10).map((ranking) => (
                            <tr key={ranking.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-xs text-gray-600">
                                {new Date(ranking.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${
                                  ranking.position <= 10
                                    ? 'bg-green-100 text-green-700'
                                    : ranking.position <= 50
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  #{ranking.position}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {ranking.url ? (
                                  <a
                                    href={ranking.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:underline truncate max-w-[200px] block"
                                  >
                                    {ranking.url}
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {ranking.traffic?.toLocaleString() || '-'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {ranking.searchVolume?.toLocaleString() || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="text-center py-16">
                  <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Select a keyword to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Keyword Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-5 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Organic SEO Keyword</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keyword
                  </label>
                  <input
                    type="text"
                    value={newKeyword.keyword}
                    onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter keyword..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <select
                    value={newKeyword.country}
                    onChange={(e) => setNewKeyword({ ...newKeyword, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="GB">{getCountryFlag('GB')} United Kingdom</option>
                    <option value="US">{getCountryFlag('US')} United States</option>
                    <option value="CA">{getCountryFlag('CA')} Canada</option>
                    <option value="AU">{getCountryFlag('AU')} Australia</option>
                    <option value="IE">{getCountryFlag('IE')} Ireland</option>
                    <option value="DE">{getCountryFlag('DE')} Germany</option>
                    <option value="FR">{getCountryFlag('FR')} France</option>
                    <option value="ES">{getCountryFlag('ES')} Spain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    value={newKeyword.brandId}
                    onChange={(e) => setNewKeyword({ ...newKeyword, brandId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a brand...</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddKeyword}
                  disabled={!newKeyword.keyword || !newKeyword.brandId}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Keyword
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEMRush Sync Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-5 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">SEMRush Sync</h3>
                </div>
                <button
                  onClick={() => { setShowSyncModal(false); setSyncBrandId(''); setSyncMessage(null) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {syncMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  syncMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {syncMessage.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Brand to Sync
                  </label>
                  <select
                    value={syncBrandId}
                    onChange={(e) => setSyncBrandId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={isSyncing}
                  >
                    <option value="">Select a brand...</option>
                    {brands.filter(b => b.domain).map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} ({brand.domain})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Only brands with domains can sync with SEMRush</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 space-y-1">
                  <p><strong>Full Sync:</strong> Imports all keywords from SEMRush Position Tracking + today&apos;s rankings</p>
                  <p><strong>Refresh Rankings:</strong> Updates rankings for existing keywords only (preserves manual entries)</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowSyncModal(false); setSyncBrandId(''); setSyncMessage(null) }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isSyncing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefreshRankings}
                  disabled={!syncBrandId || isSyncing}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSyncing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
                  Refresh
                </button>
                <button
                  onClick={handleSEMRushSync}
                  disabled={!syncBrandId || isSyncing}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSyncing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CloudArrowDownIcon className="h-4 w-4" />}
                  Full Sync
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
