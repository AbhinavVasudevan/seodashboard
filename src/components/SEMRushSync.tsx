'use client'

import { useState, useEffect } from 'react'
import { ArrowPathIcon, CloudArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface SEMRushSyncProps {
  brandId: string
  brandName: string
  domain?: string | null
  onSyncComplete?: () => void
}

interface SyncStatus {
  brand: string
  domain: string | null
  semrushProjectId: string | null
  semrushCampaignId: string | null
  lastSync: string | null
  keywordCount: number
  isLinked: boolean
}

interface SyncResult {
  projectId: number
  campaignId: number | null
  keywordsCreated: number
  keywordsUpdated: number
  rankingsImported: number
  rankingsSkipped: number
  totalKeywords: number
}

interface RefreshResult {
  totalKeywords: number
  semrushKeywordsFound: number
  rankingsCreated: number
  rankingsUpdated: number
  rankingsSkipped: number
}

export default function SEMRushSync({ brandId, brandName, domain, onSyncComplete }: SEMRushSyncProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null)

  // Fetch sync status on mount
  useEffect(() => {
    fetchStatus()
  }, [brandId])

  const fetchStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/semrush/sync?brandId=${brandId}`)
      const data = await response.json()

      if (data.success) {
        setStatus(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFullSync = async () => {
    try {
      setIsSyncing(true)
      setError(null)
      setSyncResult(null)

      const response = await fetch('/api/semrush/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      })

      const data = await response.json()

      if (data.success) {
        setSyncResult(data.data)
        await fetchStatus()
        onSyncComplete?.()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleRefreshRankings = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      setRefreshResult(null)

      const response = await fetch('/api/semrush/refresh-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      })

      const data = await response.json()

      if (data.success) {
        setRefreshResult(data.data)
        await fetchStatus()
        onSyncComplete?.()
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <h3 className="text-white font-semibold">SEMRush Position Tracking</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-white">
        {/* Domain Info */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Brand: <span className="font-medium text-gray-900">{brandName}</span>
          </p>
          {domain ? (
            <p className="text-sm text-gray-600">
              Domain: <span className="font-medium text-gray-900">{domain}</span>
            </p>
          ) : (
            <p className="text-sm text-amber-600">
              <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
              No domain set. Please add a domain to enable SEMRush sync.
            </p>
          )}
        </div>

        {/* Status */}
        {status && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {status.isLinked ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Linked to SEMRush</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">Not linked to SEMRush</span>
                </>
              )}
            </div>
            {status.isLinked && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>Project ID: {status.semrushProjectId}</p>
                {status.semrushCampaignId && <p>Campaign ID: {status.semrushCampaignId}</p>}
                {status.lastSync && (
                  <p>Last sync: {new Date(status.lastSync).toLocaleString()}</p>
                )}
                <p>Keywords: {status.keywordCount}</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-700 mb-2">Sync Complete!</p>
            <div className="text-xs text-green-600 space-y-1">
              <p>Keywords created: {syncResult.keywordsCreated}</p>
              <p>Keywords found: {syncResult.keywordsUpdated}</p>
              <p>Rankings imported: {syncResult.rankingsImported}</p>
              <p>Rankings skipped (manual): {syncResult.rankingsSkipped}</p>
            </div>
          </div>
        )}

        {/* Refresh Result */}
        {refreshResult && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-700 mb-2">Rankings Refreshed!</p>
            <div className="text-xs text-blue-600 space-y-1">
              <p>Keywords in system: {refreshResult.totalKeywords}</p>
              <p>Keywords found in SEMRush: {refreshResult.semrushKeywordsFound}</p>
              <p>New rankings added: {refreshResult.rankingsCreated}</p>
              <p>Rankings updated: {refreshResult.rankingsUpdated}</p>
              <p>Skipped (manual entries): {refreshResult.rankingsSkipped}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!status?.isLinked && domain && (
            <button
              onClick={handleFullSync}
              disabled={isSyncing || !domain}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudArrowDownIcon className="w-4 h-4" />
                  Import from SEMRush
                </>
              )}
            </button>
          )}

          {status?.isLinked && (
            <>
              <button
                onClick={handleFullSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSyncing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudArrowDownIcon className="w-4 h-4" />
                    Full Sync
                  </>
                )}
              </button>

              <button
                onClick={handleRefreshRankings}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRefreshing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh Rankings
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 text-xs text-gray-500">
          <p><strong>Full Sync:</strong> Imports all keywords from SEMRush and their rankings</p>
          <p><strong>Refresh Rankings:</strong> Updates rankings for existing keywords only (preserves manual entries)</p>
        </div>
      </div>
    </div>
  )
}
