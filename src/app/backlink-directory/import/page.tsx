'use client'

import { useState, useCallback } from 'react'
import { ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ImportRow {
  referringPageUrl: string
  referringPageTitle?: string
  domainRating?: number
  domainTraffic?: number
  anchor?: string
  nofollow?: boolean
  linkType?: string
}

interface ImportResult {
  imported: number
  duplicates: number
  alreadyProspects: number
  batchId: string
}

export default function AhrefsImportPage() {
  const [competitorDomain, setCompetitorDomain] = useState('')
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    // Detect delimiter (tab or comma)
    const delimiter = lines[0].includes('\t') ? '\t' : ','

    // Parse header
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))

    // Find column indices (handle various Ahrefs column names)
    const urlIdx = headers.findIndex(h =>
      h.toLowerCase().includes('referring page url') || h === 'referringPageUrl'
    )
    const titleIdx = headers.findIndex(h =>
      h.toLowerCase().includes('referring page title') || h === 'referringPageTitle'
    )
    const drIdx = headers.findIndex(h =>
      h.toLowerCase() === 'domain rating' || h.toLowerCase() === 'dr' || h === 'domainRating'
    )
    const trafficIdx = headers.findIndex(h =>
      h.toLowerCase().includes('domain traffic') || h === 'domainTraffic'
    )
    const anchorIdx = headers.findIndex(h =>
      h.toLowerCase() === 'anchor' || h === 'Anchor'
    )
    const nofollowIdx = headers.findIndex(h =>
      h.toLowerCase() === 'nofollow' || h === 'Nofollow'
    )
    const typeIdx = headers.findIndex(h =>
      h.toLowerCase() === 'type' || h === 'linkType'
    )

    if (urlIdx === -1) {
      setError('Could not find "Referring page URL" column')
      return []
    }

    // Parse rows
    const rows: ImportRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''))

      const url = values[urlIdx]
      if (!url || !url.startsWith('http')) continue

      rows.push({
        referringPageUrl: url,
        referringPageTitle: titleIdx >= 0 ? values[titleIdx] : undefined,
        domainRating: drIdx >= 0 ? parseInt(values[drIdx]) || undefined : undefined,
        domainTraffic: trafficIdx >= 0 ? parseInt(values[trafficIdx]) || undefined : undefined,
        anchor: anchorIdx >= 0 ? values[anchorIdx] : undefined,
        nofollow: nofollowIdx >= 0 ? values[nofollowIdx]?.toLowerCase() === 'true' : false,
        linkType: typeIdx >= 0 ? values[typeIdx] : undefined,
      })
    }

    return rows
  }

  const handleFile = useCallback((file: File) => {
    setError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
      // Select all rows by default
      setSelectedRows(new Set(rows.map((_, i) => i)))
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

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  const toggleAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(parsedRows.map((_, i) => i)))
    }
  }

  const handleImport = async () => {
    if (!competitorDomain.trim()) {
      setError('Please enter the competitor domain')
      return
    }

    if (selectedRows.size === 0) {
      setError('Please select at least one row to import')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const rowsToImport = parsedRows.filter((_, i) => selectedRows.has(i))

      const response = await fetch('/api/ahrefs-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rowsToImport,
          competitorDomain: competitorDomain.trim()
        })
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(result)
        setParsedRows([])
        setSelectedRows(new Set())
      } else {
        const err = await response.json()
        setError(err.error || 'Import failed')
      }
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import data')
    } finally {
      setIsUploading(false)
    }
  }

  const filterByDR = (minDr: number) => {
    const filtered = new Set<number>()
    parsedRows.forEach((row, i) => {
      if (row.domainRating && row.domainRating >= minDr) {
        filtered.add(i)
      }
    })
    setSelectedRows(filtered)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Import Ahrefs Backlinks</h1>
            <p className="text-gray-600 mt-1">Upload competitor backlinks to find new prospects</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Import Result */}
        {importResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">Import Successful!</span>
            </div>
            <p className="mt-2 text-green-700">
              Imported: {importResult.imported} | Duplicates skipped: {importResult.duplicates} | Already prospects: {importResult.alreadyProspects}
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
              Enter the domain you exported backlinks from
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
        </div>

        {/* Preview Table */}
        {parsedRows.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Preview ({parsedRows.length} rows)</h3>
                <p className="text-sm text-gray-500">
                  Selected: {selectedRows.size} of {parsedRows.length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => filterByDR(30)}
                  className="btn-secondary text-sm"
                >
                  DR 30+
                </button>
                <button
                  onClick={() => filterByDR(50)}
                  className="btn-secondary text-sm"
                >
                  DR 50+
                </button>
                <button
                  onClick={toggleAll}
                  className="btn-secondary text-sm"
                >
                  {selectedRows.size === parsedRows.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={isUploading || selectedRows.size === 0}
                  className="btn-primary"
                >
                  {isUploading ? 'Importing...' : `Import ${selectedRows.size} Rows`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === parsedRows.length}
                        onChange={toggleAll}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anchor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedRows.slice(0, 100).map((row, idx) => (
                    <tr
                      key={idx}
                      className={selectedRows.has(idx) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(idx)}
                          onChange={() => toggleRow(idx)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <a
                          href={row.referringPageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm truncate block max-w-md"
                        >
                          {row.referringPageUrl}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={row.domainRating && row.domainRating >= 50 ? 'text-green-600 font-medium' : ''}>
                          {row.domainRating || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {row.domainTraffic?.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                        {row.anchor || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.linkType || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 100 && (
                <p className="text-center text-gray-500 py-4">
                  Showing first 100 of {parsedRows.length} rows
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
