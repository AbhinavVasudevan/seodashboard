'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, ChartBarIcon, XMarkIcon, ArrowPathIcon, CloudArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
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
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedKeyword) {
      fetchKeywordRankings(selectedKeyword)
    }
  }, [selectedKeyword])

  const fetchInitialData = async () => {
    try {
      // Fetch keywords and brands in parallel
      const [keywordsResponse, brandsResponse] = await Promise.all([
        fetch('/api/keywords?type=organic'),
        fetch('/api/brands')
      ])

      const [keywordsData, brandsData] = await Promise.all([
        keywordsResponse.json(),
        brandsResponse.json()
      ])

      setKeywords(keywordsData)
      setBrands(brandsData)

      const uniqueCountries = Array.from(new Set(keywordsData.map((k: Keyword) => k.country))).sort() as string[]
      setCountries(uniqueCountries)
      if (uniqueCountries.length > 0 && !selectedCountry) {
        setSelectedCountry(uniqueCountries[0])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchKeywords = async () => {
    try {
      const response = await fetch('/api/keywords?type=organic')
      const data = await response.json()
      setKeywords(data)
      const uniqueCountries = Array.from(new Set(data.map((k: Keyword) => k.country))).sort() as string[]
      setCountries(uniqueCountries)
    } catch (error) {
      console.error('Error fetching keywords:', error)
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
        headers: { 'Content-Type': 'application/json' },
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

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (keyword.brand?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCountry = !selectedCountry || keyword.country === selectedCountry
    const matchesBrand = !selectedBrand || keyword.brand?.id === selectedBrand
    return matchesSearch && matchesCountry && matchesBrand
  })

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

  const getPositionBadge = (position: number) => {
    if (position <= 10) return 'badge-success'
    if (position <= 50) return 'badge-warning'
    return 'badge-destructive'
  }

  if (isLoading) {
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

  return (
    <div className="page-container">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filter Bar */}
        <div className="card p-3 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-8 h-8 text-xs w-48"
                />
              </div>

              <div className="h-5 w-px bg-border" />

              {/* Countries */}
              <div className="flex items-center gap-1 flex-wrap">
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(selectedCountry === country ? '' : country)}
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

              {/* Brand Filter */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="input-field h-8 text-xs w-auto"
              >
                <option value="">All Brands</option>
                {brandsInKeywords.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{filteredKeywords.length}</span> keywords
              </span>
              <button
                onClick={() => setShowSyncModal(true)}
                className="btn-secondary h-8 text-xs px-3"
              >
                <CloudArrowDownIcon className="h-3.5 w-3.5" />
                SEMRush Sync
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary h-8 text-xs px-3"
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
            <div className="card overflow-hidden">
              <div className="card-header">
                <h3 className="text-sm font-semibold">Organic SEO Keywords</h3>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin">
                {filteredKeywords.length === 0 ? (
                  <div className="empty-state py-8">
                    <DocumentTextIcon className="empty-state-icon h-8 w-8" />
                    <p className="text-sm text-muted-foreground">No keywords found</p>
                  </div>
                ) : (
                  filteredKeywords.map((keyword) => (
                    <div
                      key={keyword.id}
                      onClick={() => setSelectedKeyword(keyword.id)}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        selectedKeyword === keyword.id
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{keyword.keyword}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCountryFlag(keyword.country)} {keyword.country} {keyword.brand && `• ${keyword.brand.name}`}
                          </p>
                        </div>
                        {keyword.rankings.length > 0 && (
                          <span className={`ml-2 ${getPositionBadge(keyword.rankings[0].position)} font-bold`}>
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
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{selectedKeywordData.keyword}</h2>
                      <p className="text-sm text-muted-foreground">
                        {getCountryFlag(selectedKeywordData.country)} {selectedKeywordData.country} {selectedKeywordData.brand && `• ${selectedKeywordData.brand.name}`}
                      </p>
                    </div>
                    {selectedKeywordData.rankings.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Current Position</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded text-lg font-bold ${getPositionBadge(selectedKeywordData.rankings[0].position)}`}>
                          #{selectedKeywordData.rankings[0].position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chart */}
                <div className="card overflow-hidden">
                  <div className="card-header">
                    <h3 className="text-sm font-semibold">Ranking History</h3>
                  </div>
                  {getChartData().length > 0 ? (
                    <div className="p-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis reversed tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="position"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="empty-state py-8">
                      <ChartBarIcon className="empty-state-icon h-8 w-8" />
                      <p className="text-sm text-muted-foreground">No ranking data available</p>
                    </div>
                  )}
                </div>

                {/* Rankings Table */}
                {rankings.length > 0 && (
                  <div className="table-container">
                    <div className="card-header">
                      <h3 className="text-sm font-semibold">Historical Data</h3>
                    </div>
                    <div className="table-wrapper scrollbar-thin">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Position</th>
                            <th>URL</th>
                            <th>Traffic</th>
                            <th>Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings.slice(0, 10).map((ranking) => (
                            <tr key={ranking.id}>
                              <td className="cell-secondary text-xs">
                                {new Date(ranking.date).toLocaleDateString()}
                              </td>
                              <td>
                                <span className={`${getPositionBadge(ranking.position)} font-bold`}>
                                  #{ranking.position}
                                </span>
                              </td>
                              <td className="cell-truncate">
                                {ranking.url ? (
                                  <a
                                    href={ranking.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-external text-xs"
                                  >
                                    {ranking.url}
                                  </a>
                                ) : '-'}
                              </td>
                              <td className="cell-secondary text-xs">
                                {ranking.traffic?.toLocaleString() || '-'}
                              </td>
                              <td className="cell-secondary text-xs">
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
              <div className="card">
                <div className="empty-state py-16">
                  <ChartBarIcon className="empty-state-icon" />
                  <p className="text-muted-foreground">Select a keyword to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Keyword Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <div className="modal-header">
                <h3 className="modal-title">Add Organic SEO Keyword</h3>
                <button onClick={() => setShowAddForm(false)} className="action-btn">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="modal-body space-y-4">
                <div>
                  <label className="input-label">Keyword</label>
                  <input
                    type="text"
                    value={newKeyword.keyword}
                    onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                    className="input-field"
                    placeholder="Enter keyword..."
                  />
                </div>
                <div>
                  <label className="input-label">Country</label>
                  <select
                    value={newKeyword.country}
                    onChange={(e) => setNewKeyword({ ...newKeyword, country: e.target.value })}
                    className="input-field"
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
                  <label className="input-label">Brand</label>
                  <select
                    value={newKeyword.brandId}
                    onChange={(e) => setNewKeyword({ ...newKeyword, brandId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select a brand...</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleAddKeyword}
                  disabled={!newKeyword.keyword || !newKeyword.brandId}
                  className="btn-primary flex-1"
                >
                  Add Keyword
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEMRush Sync Modal */}
        {showSyncModal && (
          <div className="modal-overlay">
            <div className="modal-content max-w-md">
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <CloudArrowDownIcon className="w-5 h-5 text-orange-500" />
                  <h3 className="modal-title">SEMRush Sync</h3>
                </div>
                <button
                  onClick={() => { setShowSyncModal(false); setSyncBrandId(''); setSyncMessage(null) }}
                  className="action-btn"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="modal-body space-y-4">
                {syncMessage && (
                  <div className={syncMessage.type === 'success' ? 'alert-success' : 'alert-error'}>
                    {syncMessage.text}
                  </div>
                )}

                <div>
                  <label className="input-label">Select Brand to Sync</label>
                  <select
                    value={syncBrandId}
                    onChange={(e) => setSyncBrandId(e.target.value)}
                    className="input-field"
                    disabled={isSyncing}
                  >
                    <option value="">Select a brand...</option>
                    {brands.filter(b => b.domain).map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} ({brand.domain})
                      </option>
                    ))}
                  </select>
                  <p className="input-hint">Only brands with domains can sync with SEMRush</p>
                </div>

                <div className="alert-info text-xs space-y-1">
                  <p><strong>Full Sync:</strong> Imports all keywords from SEMRush Position Tracking + today&apos;s rankings</p>
                  <p><strong>Refresh Rankings:</strong> Updates rankings for existing keywords only</p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  onClick={() => { setShowSyncModal(false); setSyncBrandId(''); setSyncMessage(null) }}
                  className="btn-secondary"
                  disabled={isSyncing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefreshRankings}
                  disabled={!syncBrandId || isSyncing}
                  className="btn-secondary"
                >
                  {isSyncing ? <span className="spinner-sm"></span> : <ArrowPathIcon className="h-4 w-4" />}
                  Refresh
                </button>
                <button
                  onClick={handleSEMRushSync}
                  disabled={!syncBrandId || isSyncing}
                  className="btn-primary"
                >
                  {isSyncing ? <span className="spinner-sm"></span> : <CloudArrowDownIcon className="h-4 w-4" />}
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
