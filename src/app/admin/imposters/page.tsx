'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface Report {
  id: string
  reportType: string
  status: string
  reportedAt: string | null
  lastFollowUpAt: string | null
  followUpCount: number
  responseReceived: boolean
  ticketNumber: string | null
  notes: string | null
}

interface Imposter {
  id: string
  domain: string
  fullUrl: string | null
  pageTitle: string | null
  pageDescription: string | null
  searchRank: number | null
  source: string
  status: string
  detectedAt: string
  confirmedAt: string | null
  brand: {
    id: string
    name: string
    domain: string | null
  }
  reviewedBy: {
    id: string
    name: string | null
    email: string
  } | null
  reports: Report[]
  _count: {
    reports: number
  }
}

interface Brand {
  id: string
  name: string
  domain: string | null
  _count?: {
    imposters?: number
  }
}

const STATUS_CONFIG = {
  SUSPECTED: { label: 'Suspected', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ExclamationTriangleIcon },
  CONFIRMED: { label: 'Confirmed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: ShieldExclamationIcon },
  FALSE_POSITIVE: { label: 'False Positive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', icon: XCircleIcon },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon },
}

const REPORT_STATUS_CONFIG = {
  NOT_REPORTED: { label: 'Not Reported', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  NO_RESPONSE: { label: 'No Response', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
}

const REPORT_TYPES = [
  { id: 'CLOUDFLARE', label: 'Cloudflare', shortLabel: 'CF' },
  { id: 'HOSTING', label: 'Hosting Provider', shortLabel: 'Host' },
  { id: 'GOOGLE_LEGAL', label: 'Google Legal', shortLabel: 'G-Legal' },
  { id: 'GOOGLE_COPYRIGHT', label: 'Google Copyright', shortLabel: 'G-DMCA' },
  { id: 'DOMAIN_REGISTRAR', label: 'Registrar', shortLabel: 'Reg' },
  { id: 'DOMAIN_OWNER', label: 'Domain Owner', shortLabel: 'Owner' },
]

export default function AdminImpostersPage() {
  const [imposters, setImposters] = useState<Imposter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [isScanningAll, setIsScanningAll] = useState(false)
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, currentBrand: '' })
  const [expandedImposter, setExpandedImposter] = useState<string | null>(null)
  const [reportModal, setReportModal] = useState<{ imposterId: string; reportType: string; currentStatus: string; currentNotes: string } | null>(null)
  const [reportFormData, setReportFormData] = useState({ status: '', notes: '', ticketNumber: '' })

  useEffect(() => {
    fetchBrands()
    fetchImposters()
  }, [])

  useEffect(() => {
    fetchImposters()
  }, [statusFilter, brandFilter])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      if (response.ok) {
        const data = await response.json()
        setBrands(data)
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    }
  }

  const fetchImposters = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (brandFilter) params.append('brandId', brandFilter)

      const response = await fetch(`/api/imposters?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setImposters(data)
      }
    } catch (error) {
      console.error('Error fetching imposters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanAllBrands = async () => {
    const brandsWithDomain = brands.filter(b => b.domain)
    if (brandsWithDomain.length === 0) {
      toast.error('No brands with domains to scan')
      return
    }

    setIsScanningAll(true)
    setScanProgress({ current: 0, total: brandsWithDomain.length, currentBrand: '' })

    let totalFound = 0
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < brandsWithDomain.length; i++) {
      const brand = brandsWithDomain[i]
      setScanProgress({ current: i + 1, total: brandsWithDomain.length, currentBrand: brand.name })

      try {
        const response = await fetch('/api/imposters/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: brand.id,
            searchKeyword: brand.name,
            geolocation: 'GB',
            pages: 10,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          totalFound += data.scan.impostorsFound || 0
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }

    setIsScanningAll(false)
    setScanProgress({ current: 0, total: 0, currentBrand: '' })

    if (successCount > 0) {
      toast.success(`Scanned ${successCount} brands, found ${totalFound} potential imposters`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to scan ${errorCount} brands`)
    }

    fetchImposters()
  }

  const handleUpdateStatus = async (imposterId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/imposters/${imposterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success(`Status updated to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`)
        fetchImposters()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleOpenReportModal = (imposterId: string, reportType: string, imposter: Imposter) => {
    const existingReport = imposter.reports.find(r => r.reportType === reportType)
    setReportFormData({
      status: existingReport?.status || 'NOT_REPORTED',
      notes: existingReport?.notes || '',
      ticketNumber: existingReport?.ticketNumber || '',
    })
    setReportModal({
      imposterId,
      reportType,
      currentStatus: existingReport?.status || 'NOT_REPORTED',
      currentNotes: existingReport?.notes || '',
    })
  }

  const handleSaveReport = async () => {
    if (!reportModal) return

    try {
      const response = await fetch(`/api/imposters/${reportModal.imposterId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: reportModal.reportType,
          status: reportFormData.status,
          notes: reportFormData.notes,
          ticketNumber: reportFormData.ticketNumber,
        }),
      })

      if (response.ok) {
        toast.success('Report updated')
        setReportModal(null)
        fetchImposters()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to update report')
      }
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error('Failed to update report')
    }
  }

  const handleAddFollowUp = async (imposterId: string, reportId: string) => {
    try {
      const response = await fetch(`/api/imposters/${imposterId}/reports`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          addFollowUp: true,
        }),
      })

      if (response.ok) {
        toast.success('Follow-up recorded')
        fetchImposters()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to record follow-up')
      }
    } catch (error) {
      console.error('Error recording follow-up:', error)
      toast.error('Failed to record follow-up')
    }
  }

  const getReportForType = (imposter: Imposter, reportType: string) => {
    return imposter.reports.find(r => r.reportType === reportType)
  }

  const stats = {
    total: imposters.length,
    suspected: imposters.filter(i => i.status === 'SUSPECTED').length,
    confirmed: imposters.filter(i => i.status === 'CONFIRMED').length,
    resolved: imposters.filter(i => i.status === 'RESOLVED').length,
  }

  // Group by brand for display - include all brands
  const impostersByBrand: Record<string, { brand: Brand; imposters: Imposter[] }> = {}

  // First add all brands
  brands.forEach(brand => {
    impostersByBrand[brand.id] = {
      brand,
      imposters: [],
    }
  })

  // Then add imposters to their brands
  imposters.forEach(imposter => {
    if (impostersByBrand[imposter.brand.id]) {
      impostersByBrand[imposter.brand.id].imposters.push(imposter)
    }
  })

  // Filter to only show brands that match filter or have imposters
  const filteredBrands = Object.values(impostersByBrand).filter(({ brand, imposters: brandImposters }) => {
    if (brandFilter && brand.id !== brandFilter) return false
    if (statusFilter && brandImposters.length === 0) return false
    return true
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="page-content py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="page-title">Imposter Review</h1>
                <p className="text-sm text-muted-foreground">
                  Review and manage detected imposters across all brands
                </p>
              </div>
            </div>
            <button
              onClick={handleScanAllBrands}
              disabled={isScanningAll}
              className="btn-primary"
            >
              {isScanningAll ? (
                <>
                  <span className="spinner-sm"></span>
                  Scanning {scanProgress.current}/{scanProgress.total}...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  Scan All Brands
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Scan Progress Banner */}
        {isScanningAll && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="spinner-sm text-blue-600"></span>
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  Scanning: {scanProgress.currentBrand}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Progress: {scanProgress.current} of {scanProgress.total} brands
                </p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === '' ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="stat-value text-foreground">{stats.total}</div>
            <div className="stat-label">Total Detected</div>
          </button>
          <button
            onClick={() => setStatusFilter('SUSPECTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'SUSPECTED' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-yellow-600">{stats.suspected}</div>
                <div className="stat-label">Needs Review</div>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'CONFIRMED' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-red-600">{stats.confirmed}</div>
                <div className="stat-label">Active Imposters</div>
              </div>
              <ShieldExclamationIcon className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'RESOLVED' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="stat-value text-green-600">{stats.resolved}</div>
                <div className="stat-label">Resolved</div>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchImposters} className="btn-secondary py-1.5">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={() => { setStatusFilter(''); setBrandFilter('') }} className="text-sm text-muted-foreground hover:text-foreground">
            Clear filters
          </button>
        </div>

        {/* Brands List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner-md text-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredBrands.map(({ brand, imposters: brandImposters }) => (
              <div key={brand.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Brand Header */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Link
                        href={`/brands/${brand.id}/imposters`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {brand.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{brand.domain || 'No domain set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${brandImposters.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {brandImposters.length} imposter{brandImposters.length !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`/brands/${brand.id}/imposters`}
                      className="btn-secondary text-xs py-1"
                    >
                      <MagnifyingGlassIcon className="h-3.5 w-3.5" />
                      Scan
                    </Link>
                  </div>
                </div>

                {/* Imposters */}
                {brandImposters.length > 0 ? (
                  <div className="divide-y divide-border">
                    {brandImposters.map(imposter => (
                      <div key={imposter.id}>
                        {/* Imposter Row */}
                        <div
                          className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setExpandedImposter(expandedImposter === imposter.id ? null : imposter.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {expandedImposter === imposter.id ? (
                                <ChevronUpIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <GlobeAltIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <a
                                  href={`https://${imposter.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-foreground hover:text-primary"
                                >
                                  {imposter.domain}
                                </a>
                                {imposter.pageTitle && (
                                  <p className="text-xs text-muted-foreground truncate">{imposter.pageTitle}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Report badges */}
                              <div className="hidden md:flex items-center gap-1">
                                {REPORT_TYPES.map(type => {
                                  const report = getReportForType(imposter, type.id)
                                  const status = report?.status || 'NOT_REPORTED'
                                  const config = REPORT_STATUS_CONFIG[status as keyof typeof REPORT_STATUS_CONFIG]
                                  return (
                                    <button
                                      key={type.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenReportModal(imposter.id, type.id, imposter)
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] rounded hover:ring-2 hover:ring-primary transition-all ${config?.color}`}
                                      title={`${type.label}: ${config?.label}${report?.notes ? ` - ${report.notes}` : ''}`}
                                    >
                                      {type.shortLabel}
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Status badge */}
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.color}`}>
                                {STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.label}
                              </span>

                              {/* Quick actions */}
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {imposter.status === 'SUSPECTED' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(imposter.id, 'CONFIRMED')}
                                      className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(imposter.id, 'FALSE_POSITIVE')}
                                      className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                    >
                                      Dismiss
                                    </button>
                                  </>
                                )}
                                {imposter.status === 'CONFIRMED' && (
                                  <button
                                    onClick={() => handleUpdateStatus(imposter.id, 'RESOLVED')}
                                    className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedImposter === imposter.id && (
                          <div className="p-4 bg-muted/20 border-t border-border">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Info */}
                              <div>
                                <h4 className="text-sm font-medium mb-3">Details</h4>
                                <dl className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Source</dt>
                                    <dd>{imposter.source.replace('_', ' ')}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Detected</dt>
                                    <dd>{new Date(imposter.detectedAt).toLocaleString()}</dd>
                                  </div>
                                  {imposter.confirmedAt && (
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">Confirmed</dt>
                                      <dd>{new Date(imposter.confirmedAt).toLocaleString()}</dd>
                                    </div>
                                  )}
                                  {imposter.searchRank && (
                                    <div className="flex justify-between">
                                      <dt className="text-muted-foreground">Search Rank</dt>
                                      <dd>#{imposter.searchRank}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Reports */}
                              <div>
                                <h4 className="text-sm font-medium mb-3">Report Tracking</h4>
                                <div className="space-y-2">
                                  {REPORT_TYPES.map(type => {
                                    const report = getReportForType(imposter, type.id)
                                    const status = report?.status || 'NOT_REPORTED'
                                    const config = REPORT_STATUS_CONFIG[status as keyof typeof REPORT_STATUS_CONFIG]

                                    return (
                                      <div key={type.id} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{type.label}</span>
                                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${config?.color}`}>
                                              {config?.label}
                                            </span>
                                          </div>
                                          {report && (
                                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                              {report.reportedAt && (
                                                <p className="flex items-center gap-1">
                                                  <CalendarIcon className="h-3 w-3" />
                                                  Reported: {new Date(report.reportedAt).toLocaleDateString()}
                                                </p>
                                              )}
                                              {report.lastFollowUpAt && (
                                                <p className="flex items-center gap-1">
                                                  <ArrowPathIcon className="h-3 w-3" />
                                                  Last follow-up: {new Date(report.lastFollowUpAt).toLocaleDateString()} ({report.followUpCount}x)
                                                </p>
                                              )}
                                              {report.notes && (
                                                <p className="flex items-center gap-1">
                                                  <ChatBubbleLeftIcon className="h-3 w-3" />
                                                  {report.notes}
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {report && report.status !== 'NOT_REPORTED' && report.status !== 'RESOLVED' && (
                                            <button
                                              onClick={() => handleAddFollowUp(imposter.id, report.id)}
                                              className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
                                              title="Record follow-up"
                                            >
                                              +Follow-up
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleOpenReportModal(imposter.id, type.id, imposter)}
                                            className="px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No imposters detected</p>
                  </div>
                )}
              </div>
            ))}

            {filteredBrands.length === 0 && (
              <div className="empty-state">
                <BuildingOfficeIcon className="empty-state-icon" />
                <p className="empty-state-title">No brands found</p>
                <p className="empty-state-description">
                  Add brands to start monitoring for imposters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Edit Modal */}
      {reportModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">
                Update {REPORT_TYPES.find(t => t.id === reportModal.reportType)?.label} Report
              </h3>
              <button onClick={() => setReportModal(null)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="input-label">Status</label>
                <select
                  value={reportFormData.status}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="input-field"
                >
                  {Object.entries(REPORT_STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Ticket/Reference Number</label>
                <input
                  type="text"
                  value={reportFormData.ticketNumber}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, ticketNumber: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., CASE-12345"
                />
              </div>
              <div>
                <label className="input-label">Notes/Remarks</label>
                <textarea
                  value={reportFormData.notes}
                  onChange={(e) => setReportFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Add any notes about this report..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setReportModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveReport} className="btn-primary">
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
