'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface RankTracker {
  id: string
  keyword: string
  country: string
  domain: string
  isActive: boolean
  lastChecked: Date | null
  createdAt: Date
  rankings: RankTrackerHistory[]
}

interface RankTrackerHistory {
  id: string
  position: number
  url: string | null
  traffic: number | null
  searchVolume: number | null
  difficulty: number | null
  date: Date
}

interface RankTrackerListProps {
  appId: string
  onRefresh?: () => void
}

const countryNames: Record<string, string> = {
  us: 'United States', gb: 'United Kingdom', ca: 'Canada', au: 'Australia',
  de: 'Germany', fr: 'France', es: 'Spain', it: 'Italy', nl: 'Netherlands',
  se: 'Sweden', no: 'Norway', dk: 'Denmark', fi: 'Finland', pl: 'Poland',
  br: 'Brazil', mx: 'Mexico', ar: 'Argentina', in: 'India', jp: 'Japan',
  kr: 'South Korea', cn: 'China', sg: 'Singapore', my: 'Malaysia',
  th: 'Thailand', vn: 'Vietnam', id: 'Indonesia', ph: 'Philippines',
  ru: 'Russia', tr: 'Turkey', sa: 'Saudi Arabia', ae: 'United Arab Emirates',
  za: 'South Africa', eg: 'Egypt', ng: 'Nigeria', ke: 'Kenya',
}

export default function RankTrackerList({ appId, onRefresh }: RankTrackerListProps) {
  const [rankTrackers, setRankTrackers] = useState<RankTracker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchingId, setFetchingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRankTrackers()
  }, [appId])

  const fetchRankTrackers = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/rank-tracker?appId=${appId}`)
      if (!response.ok) throw new Error('Failed to fetch rank trackers')
      const data = await response.json()
      setRankTrackers(data)
    } catch (err) {
      console.error('Error fetching rank trackers:', err)
      setError('Failed to load rank trackers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFetchData = async (rankTrackerId: string) => {
    setFetchingId(rankTrackerId)
    try {
      const response = await fetch('/api/rank-tracker/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankTrackerId }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to fetch ranking data')
        return
      }
      toast.success('Ranking data fetched successfully')
      await fetchRankTrackers()
      onRefresh?.()
    } catch (err) {
      console.error('Error fetching ranking data:', err)
      toast.error('An unexpected error occurred')
    } finally {
      setFetchingId(null)
    }
  }

  const handleToggleActive = async (rankTrackerId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/rank-tracker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rankTrackerId, isActive: !isActive }),
      })
      if (!response.ok) throw new Error('Failed to update rank tracker')
      await fetchRankTrackers()
    } catch (err) {
      console.error('Error updating rank tracker:', err)
      toast.error('Failed to update rank tracker')
    }
  }

  const handleDelete = async (rankTrackerId: string) => {
    if (!confirm('Are you sure you want to delete this rank tracker?')) return
    try {
      const response = await fetch(`/api/rank-tracker?id=${rankTrackerId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete rank tracker')
      toast.success('Rank tracker deleted')
      await fetchRankTrackers()
    } catch (err) {
      console.error('Error deleting rank tracker:', err)
      toast.error('Failed to delete rank tracker')
    }
  }

  const getPositionVariant = (position: number): "default" | "secondary" | "destructive" | "outline" => {
    if (position <= 10) return 'default'
    if (position <= 30) return 'secondary'
    return 'destructive'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (rankTrackers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground mb-2">No keywords are being tracked yet.</p>
          <p className="text-sm text-muted-foreground">Add your first keyword to start tracking rankings.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracked Keywords</CardTitle>
        <CardDescription>
          {rankTrackers.length} keyword{rankTrackers.length !== 1 ? 's' : ''} being tracked
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {rankTrackers.map((tracker) => {
          const latestRanking = tracker.rankings[0]
          return (
            <div key={tracker.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium truncate">{tracker.keyword}</h3>
                    {latestRanking && (
                      <Badge variant={getPositionVariant(latestRanking.position)}>
                        #{latestRanking.position}
                      </Badge>
                    )}
                    <Badge variant={tracker.isActive ? 'default' : 'outline'} className="text-xs">
                      {tracker.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span>{countryNames[tracker.country] || tracker.country.toUpperCase()}</span>
                    <span>{tracker.domain}</span>
                    <span>Added {format(new Date(tracker.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  {latestRanking && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      {latestRanking.traffic && (
                        <span>Traffic: <span className="font-medium">{latestRanking.traffic.toLocaleString()}</span></span>
                      )}
                      {latestRanking.searchVolume && (
                        <span>Volume: <span className="font-medium">{latestRanking.searchVolume.toLocaleString()}</span></span>
                      )}
                      {latestRanking.difficulty && (
                        <span>Difficulty: <span className="font-medium">{latestRanking.difficulty}%</span></span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleFetchData(tracker.id)}
                    disabled={fetchingId === tracker.id}
                  >
                    {fetchingId === tracker.id ? 'Fetching...' : 'Fetch Data'}
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/brands/${appId.split('-')[0]}/apps/${appId}/rank-tracker/${tracker.id}/history`}>
                      View History
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(tracker.id, tracker.isActive)}
                  >
                    {tracker.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(tracker.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
