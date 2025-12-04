'use client'

import { useState, useCallback } from 'react'
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AnalyzedRow {
  url: string
  rootDomain: string
  dr: number | null
  traffic: number | null
  anchor: string | null
  linkType: string | null
  status: 'new' | 'already_have' | 'in_prospects'
  existingBrands?: string[]
  prospectStatus?: string
}

interface AnalysisResult {
  competitorDomain: string
  totalRows: number
  analyzed: number
  stats: {
    newOpportunities: number
    alreadyHave: number
    inProspects: number
  }
  data: AnalyzedRow[]
}

interface AddResult {
  created: number
  skipped: number
  errors?: string[]
}

export default function AhrefsImportPage() {
  const [competitorDomain, setCompetitorDomain] = useState('')
  const [parsedRows, setParsedRows] = useState<Array<Record<string, string>>>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addResult, setAddResult] = useState<AddResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'already_have' | 'in_prospects'>('all')
  const [minDR, setMinDR] = useState<number>(0)

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const delimiter = lines[0].includes('\t') ? '\t' : ','
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))

    const rows: Array<Record<string, string>> = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      rows.push(row)
    }

    return rows
  }

  const handleFile = useCallback((file: File) => {
    setError(null)
    setAnalysisResult(null)
    setAddResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt'))) {
      handleFile(file)
    } else {
      setError('Please upload a CSV or TSV file')
    }
  }, [handleFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const analyzeBacklinks = async () => {
    if (!competitorDomain.trim()) {
      setError('Please enter the competitor domain')
      return
    }

    if (parsedRows.length === 0) {
      setError('Please upload a file first')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/ahrefs-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsedRows,
          competitorDomain: competitorDomain.trim()
        })
      })

      if (response.ok) {
        const result: AnalysisResult = await response.json()
        setAnalysisResult(result)
        // Auto-select all new opportunities
        const newIndices = new Set<number>()
        result.data.forEach((row, idx) => {
          if (row.status === 'new') {
            newIndices.add(idx)
          }
        })
        setSelectedRows(newIndices)
      } else {
        const err = await response.json()
        setError(err.error || 'Analysis failed')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setError('Failed to analyze backlinks')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const addAsProspects = async () => {
    if (selectedRows.size === 0) {
      setError('Please select at least one domain to add')
      return
    }

    if (!analysisResult) return

    setIsAdding(true)
    setError(null)

    try {
      const prospectsToAdd = Array.from(selectedRows).map(idx => analysisResult.data[idx])

      const response = await fetch('/api/ahrefs-import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospects: prospectsToAdd,
          competitorDomain: competitorDomain.trim()
        })
      })

      if (response.ok) {
        const result: AddResult = await response.json()
        setAddResult(result)
        // Clear selection and re-analyze
        setSelectedRows(new Set())
        // Refresh analysis to update statuses
        await analyzeBacklinks()
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to add prospects')
      }
    } catch (err) {
      console.error('Add error:', err)
      setError('Failed to add prospects')
    } finally {
      setIsAdding(false)
    }
  }

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  const selectAllNew = () => {
    if (!analysisResult) return
    const newIndices = new Set<number>()
    analysisResult.data.forEach((row, idx) => {
      if (row.status === 'new' && (row.dr || 0) >= minDR) {
        newIndices.add(idx)
      }
    })
    setSelectedRows(newIndices)
  }

  const selectNone = () => {
    setSelectedRows(new Set())
  }

  const getStatusBadge = (status: 'new' | 'already_have' | 'in_prospects', brands?: string[], prospectStatus?: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <SparklesIcon className="h-3 w-3" />
            New Opportunity
          </span>
        )
      case 'already_have':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            <CheckIcon className="h-3 w-3" />
            Have: {brands?.join(', ')}
          </span>
        )
      case 'in_prospects':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <ExclamationTriangleIcon className="h-3 w-3" />
            In Prospects ({prospectStatus?.replace('_', ' ')})
          </span>
        )
    }
  }

  const filteredData = analysisResult?.data.filter(row => {
    if (filterStatus !== 'all' && row.status !== filterStatus) return false
    if ((row.dr || 0) < minDR) return false
    return true
  }) || []

  const filteredIndices = analysisResult?.data.map((row, idx) => {
    if (filterStatus !== 'all' && row.status !== filterStatus) return -1
    if ((row.dr || 0) < minDR) return -1
    return idx
  }).filter(idx => idx !== -1) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Competitor Backlink Analysis</h1>
            <p className="text-gray-600 mt-1">Upload competitor backlinks to find new link building opportunities</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {addResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">Prospects Added!</span>
            </div>
            <p className="mt-2 text-green-700">
              Created: {addResult.created} | Skipped (duplicates): {addResult.skipped}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!analysisResult && (
          <div className="card mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competitor Domain *
              </label>
              <input
                type="text"
                value={competitorDomain}
                onChange={(e) => setCompetitorDomain(e.target.value)}
                className="input-field max-w-md"
                placeholder="competitor.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the domain you exported backlinks from (e.g., from Ahrefs)
              </p>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop your Ahrefs CSV/TSV export here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label className="btn-secondary cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            {/* File Loaded */}
            {parsedRows.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {parsedRows.length} backlinks loaded
                    </p>
                    <p className="text-sm text-gray-500">
                      Ready to analyze against your existing backlinks
                    </p>
                  </div>
                  <button
                    onClick={analyzeBacklinks}
                    disabled={isAnalyzing}
                    className="btn-primary"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Backlinks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card cursor-pointer hover:ring-2 hover:ring-primary-500" onClick={() => setFilterStatus('all')}>
                <div className="text-sm font-medium text-gray-600">Total Analyzed</div>
                <div className="text-2xl font-semibold text-gray-900">{analysisResult.analyzed}</div>
                <div className="text-xs text-gray-500">from {analysisResult.competitorDomain}</div>
              </div>
              <div
                className={`card cursor-pointer hover:ring-2 hover:ring-green-500 ${filterStatus === 'new' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setFilterStatus('new')}
              >
                <div className="text-sm font-medium text-gray-600">New Opportunities</div>
                <div className="text-2xl font-semibold text-green-600">{analysisResult.stats.newOpportunities}</div>
                <div className="text-xs text-green-600">Domains you don&apos;t have</div>
              </div>
              <div
                className={`card cursor-pointer hover:ring-2 hover:ring-blue-500 ${filterStatus === 'already_have' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setFilterStatus('already_have')}
              >
                <div className="text-sm font-medium text-gray-600">Already Have</div>
                <div className="text-2xl font-semibold text-blue-600">{analysisResult.stats.alreadyHave}</div>
                <div className="text-xs text-blue-600">Existing backlinks</div>
              </div>
              <div
                className={`card cursor-pointer hover:ring-2 hover:ring-yellow-500 ${filterStatus === 'in_prospects' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setFilterStatus('in_prospects')}
              >
                <div className="text-sm font-medium text-gray-600">In Prospects</div>
                <div className="text-2xl font-semibold text-yellow-600">{analysisResult.stats.inProspects}</div>
                <div className="text-xs text-yellow-600">Already tracking</div>
              </div>
            </div>

            {/* Filters and Actions */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Min DR:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={minDR}
                    onChange={(e) => setMinDR(parseInt(e.target.value) || 0)}
                    className="input-field w-20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMinDR(30)}
                    className={`px-3 py-1 text-sm rounded-full ${minDR === 30 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}
                  >
                    DR 30+
                  </button>
                  <button
                    onClick={() => setMinDR(50)}
                    className={`px-3 py-1 text-sm rounded-full ${minDR === 50 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}
                  >
                    DR 50+
                  </button>
                  <button
                    onClick={() => setMinDR(0)}
                    className={`px-3 py-1 text-sm rounded-full ${minDR === 0 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-600'}`}
                  >
                    All
                  </button>
                </div>

                <div className="flex-1" />

                <div className="flex gap-2">
                  <button onClick={selectAllNew} className="btn-secondary text-sm">
                    Select All New
                  </button>
                  <button onClick={selectNone} className="btn-secondary text-sm">
                    Clear Selection
                  </button>
                  <button
                    onClick={addAsProspects}
                    disabled={isAdding || selectedRows.size === 0}
                    className="btn-primary"
                  >
                    {isAdding ? 'Adding...' : `Add ${selectedRows.size} as Prospects`}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <input
                          type="checkbox"
                          checked={filteredIndices.length > 0 && filteredIndices.every(idx => selectedRows.has(idx))}
                          onChange={() => {
                            if (filteredIndices.every(idx => selectedRows.has(idx))) {
                              setSelectedRows(new Set())
                            } else {
                              setSelectedRows(new Set(filteredIndices))
                            }
                          }}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anchor</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysisResult.data.map((row, idx) => {
                      // Apply filters
                      if (filterStatus !== 'all' && row.status !== filterStatus) return null
                      if ((row.dr || 0) < minDR) return null

                      return (
                        <tr
                          key={idx}
                          className={`${selectedRows.has(idx) ? 'bg-green-50' : 'hover:bg-gray-50'} ${
                            row.status === 'already_have' ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(idx)}
                              onChange={() => toggleRow(idx)}
                              disabled={row.status === 'already_have'}
                              className="h-4 w-4 text-primary-600 border-gray-300 rounded disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{row.rootDomain}</div>
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 truncate block max-w-md"
                              >
                                {row.url}
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${row.dr && row.dr >= 50 ? 'text-green-600' : 'text-gray-900'}`}>
                              {row.dr || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.traffic?.toLocaleString() || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(row.status, row.existingBrands, row.prospectStatus)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                            {row.anchor || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t">
                <p className="text-sm text-gray-600">
                  Showing {filteredData.length} of {analysisResult.analyzed} domains
                  {selectedRows.size > 0 && ` | ${selectedRows.size} selected`}
                </p>
              </div>
            </div>

            {/* Start Over */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAnalysisResult(null)
                  setParsedRows([])
                  setSelectedRows(new Set())
                  setCompetitorDomain('')
                }}
                className="btn-secondary"
              >
                Analyze Another Competitor
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
