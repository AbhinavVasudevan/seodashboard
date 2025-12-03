'use client'

import { useState, useEffect } from 'react'
import { ArrowPathIcon, CloudArrowDownIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
        toast.success('SEMRush sync completed')
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
        toast.success('Rankings refreshed')
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
      <Card>
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <Skeleton className="h-5 w-48 bg-white/20" />
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 py-3">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          SEMRush Position Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">
            Brand: <span className="font-medium text-foreground">{brandName}</span>
          </p>
          {domain ? (
            <p className="text-muted-foreground">
              Domain: <span className="font-medium text-foreground">{domain}</span>
            </p>
          ) : (
            <p className="text-amber-600 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              No domain set. Please add a domain to enable SEMRush sync.
            </p>
          )}
        </div>

        {status && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {status.isLinked ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">Linked to SEMRush</Badge>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  <Badge variant="outline" className="text-amber-700">Not linked</Badge>
                </>
              )}
            </div>
            {status.isLinked && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Project ID: {status.semrushProjectId}</p>
                {status.semrushCampaignId && <p>Campaign ID: {status.semrushCampaignId}</p>}
                {status.lastSync && <p>Last sync: {new Date(status.lastSync).toLocaleString()}</p>}
                <p>Keywords: {status.keywordCount}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {syncResult && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription>
              <p className="font-medium text-green-700 mb-2">Sync Complete!</p>
              <div className="text-xs text-green-600 space-y-1">
                <p>Keywords created: {syncResult.keywordsCreated}</p>
                <p>Keywords found: {syncResult.keywordsUpdated}</p>
                <p>Rankings imported: {syncResult.rankingsImported}</p>
                <p>Rankings skipped (manual): {syncResult.rankingsSkipped}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {refreshResult && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription>
              <p className="font-medium text-blue-700 mb-2">Rankings Refreshed!</p>
              <div className="text-xs text-blue-600 space-y-1">
                <p>Keywords in system: {refreshResult.totalKeywords}</p>
                <p>Keywords found in SEMRush: {refreshResult.semrushKeywordsFound}</p>
                <p>New rankings added: {refreshResult.rankingsCreated}</p>
                <p>Rankings updated: {refreshResult.rankingsUpdated}</p>
                <p>Skipped (manual entries): {refreshResult.rankingsSkipped}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {(!status?.isLinked && domain) && (
            <Button onClick={handleFullSync} disabled={isSyncing || !domain} className="bg-orange-500 hover:bg-orange-600">
              {isSyncing ? (
                <><ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />Syncing...</>
              ) : (
                <><CloudArrowDownIcon className="w-4 h-4 mr-2" />Import from SEMRush</>
              )}
            </Button>
          )}
          {status?.isLinked && (
            <>
              <Button onClick={handleFullSync} disabled={isSyncing} className="bg-orange-500 hover:bg-orange-600">
                {isSyncing ? (
                  <><ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />Syncing...</>
                ) : (
                  <><CloudArrowDownIcon className="w-4 h-4 mr-2" />Full Sync</>
                )}
              </Button>
              <Button onClick={handleRefreshRankings} disabled={isRefreshing} variant="secondary">
                {isRefreshing ? (
                  <><ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />Refreshing...</>
                ) : (
                  <><ArrowPathIcon className="w-4 h-4 mr-2" />Refresh Rankings</>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>Full Sync:</strong> Imports all keywords from SEMRush and their rankings</p>
          <p><strong>Refresh Rankings:</strong> Updates rankings for existing keywords only</p>
        </div>
      </CardContent>
    </Card>
  )
}
