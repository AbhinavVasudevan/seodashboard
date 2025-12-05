'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ShieldExclamationIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
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
  reportedBy: {
    id: string
    name: string | null
    email: string
  } | null
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
  reviewNotes: string | null
  detectedAt: string
  confirmedAt: string | null
  resolvedAt: string | null
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
}

interface Scan {
  id: string
  searchKeyword: string
  pagesScanned: number
  totalResults: number
  impostorsFound: number
  status: string
  createdAt: string
  completedAt: string | null
}

const REPORT_TYPES = [
  { id: 'CLOUDFLARE', label: 'Cloudflare', shortLabel: 'CF' },
  { id: 'HOSTING', label: 'Hosting Provider', shortLabel: 'Host' },
  { id: 'GOOGLE_LEGAL', label: 'Google Legal', shortLabel: 'G-Legal' },
  { id: 'GOOGLE_COPYRIGHT', label: 'Google Copyright', shortLabel: 'G-DMCA' },
  { id: 'DOMAIN_REGISTRAR', label: 'Registrar', shortLabel: 'Reg' },
  { id: 'DOMAIN_OWNER', label: 'Domain Owner', shortLabel: 'Owner' },
]

const STATUS_CONFIG = {
  SUSPECTED: { label: 'Suspected', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: ExclamationTriangleIcon },
  CONFIRMED: { label: 'Confirmed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: ShieldExclamationIcon },
  FALSE_POSITIVE: { label: 'False Positive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', icon: XCircleIcon },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircleIcon },
}

const REPORT_STATUS_CONFIG = {
  NOT_REPORTED: { label: 'Not Reported', color: 'bg-gray-100 text-gray-600' },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  NO_RESPONSE: { label: 'No Response', color: 'bg-orange-100 text-orange-700' },
}

export default function BrandImpostersPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [imposters, setImposters] = useState<Imposter[]>([])
  const [recentScans, setRecentScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedImposter, setExpandedImposter] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFormData, setAddFormData] = useState({ domain: '', notes: '' })
  const [scanOptions, setScanOptions] = useState({
    searchKeyword: '',
    geolocation: 'GB',
    pages: 10,
  })
  const [showScanModal, setShowScanModal] = useState(false)

  useEffect(() => {
    fetchBrand()
    fetchImposters()
    fetchScans()
  }, [resolvedParams.id])

  const fetchBrand = async () => {
    try {
      const response = await fetch(`/api/brands/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setBrand(data)
        setScanOptions(prev => ({ ...prev, searchKeyword: data.name }))
      }
    } catch (error) {
      console.error('Error fetching brand:', error)
    }
  }

  const fetchImposters = async () => {
    setIsLoading(true)
    try {
      const statusParam = statusFilter ? `&status=${statusFilter}` : ''
      const response = await fetch(`/api/imposters?brandId=${resolvedParams.id}${statusParam}`)
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

  const fetchScans = async () => {
    try {
      const response = await fetch(`/api/imposters/scan?brandId=${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setRecentScans(data.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching scans:', error)
    }
  }

  useEffect(() => {
    fetchImposters()
  }, [statusFilter])

  const handleScan = async () => {
    if (!brand?.domain) {
      toast.error('Brand domain is required for scanning')
      return
    }

    setIsScanning(true)
    setShowScanModal(false)

    try {
      const response = await fetch('/api/imposters/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: resolvedParams.id,
          searchKeyword: scanOptions.searchKeyword || brand.name,
          geolocation: scanOptions.geolocation,
          pages: scanOptions.pages,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Scan complete! Found ${data.scan.impostorsFound} potential imposters`)
        fetchImposters()
        fetchScans()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Scan failed')
      }
    } catch (error) {
      console.error('Error running scan:', error)
      toast.error('Failed to run scan')
    } finally {
      setIsScanning(false)
    }
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

  const handleUpdateReport = async (imposterId: string, reportType: string, status: string) => {
    try {
      const response = await fetch(`/api/imposters/${imposterId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, status }),
      })

      if (response.ok) {
        toast.success('Report status updated')
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

  const handleAddImposter = async () => {
    if (!addFormData.domain) {
      toast.error('Domain is required')
      return
    }

    try {
      const response = await fetch('/api/imposters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: resolvedParams.id,
          domain: addFormData.domain,
          notes: addFormData.notes,
        }),
      })

      if (response.ok) {
        toast.success('Imposter added')
        setShowAddModal(false)
        setAddFormData({ domain: '', notes: '' })
        fetchImposters()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to add imposter')
      }
    } catch (error) {
      console.error('Error adding imposter:', error)
      toast.error('Failed to add imposter')
    }
  }

  const getReportStatus = (imposter: Imposter, reportType: string) => {
    const report = imposter.reports.find(r => r.reportType === reportType)
    return report?.status || 'NOT_REPORTED'
  }

  const stats = {
    total: imposters.length,
    suspected: imposters.filter(i => i.status === 'SUSPECTED').length,
    confirmed: imposters.filter(i => i.status === 'CONFIRMED').length,
    resolved: imposters.filter(i => i.status === 'RESOLVED').length,
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="page-content py-4">
          <div className="flex items-center gap-3 mb-1">
            <Link href={`/brands/${resolvedParams.id}`} className="action-btn">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ShieldExclamationIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="page-title">{brand?.name} - Imposter Detection</h1>
              <p className="text-sm text-muted-foreground">
                Monitor and report domains impersonating your brand
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value text-foreground">{stats.total}</div>
            <div className="stat-label">Total Detected</div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'SUSPECTED' ? '' : 'SUSPECTED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'SUSPECTED' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="stat-value text-yellow-600">{stats.suspected}</div>
            <div className="stat-label">Needs Review</div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? '' : 'CONFIRMED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'CONFIRMED' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="stat-value text-red-600">{stats.confirmed}</div>
            <div className="stat-label">Confirmed</div>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? '' : 'RESOLVED')}
            className={`stat-card hover:shadow-md transition-all text-left ${statusFilter === 'RESOLVED' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="stat-value text-green-600">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </button>
          <div className="stat-card">
            <div className="stat-value text-blue-600">{recentScans.length > 0 ? recentScans[0].pagesScanned * 10 : 0}</div>
            <div className="stat-label">URLs Scanned</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setShowScanModal(true)}
            disabled={isScanning || !brand?.domain}
            className="btn-primary"
          >
            {isScanning ? (
              <>
                <span className="spinner-sm"></span>
                Scanning Google...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-4 w-4" />
                Scan for Imposters
              </>
            )}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary">
            <PlusIcon className="h-4 w-4" />
            Add Manually
          </button>
          <button onClick={() => fetchImposters()} className="btn-secondary">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {!brand?.domain && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="font-medium">Brand domain not set</span>
            </div>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
              Set the brand domain in brand settings to enable automatic imposter detection.
            </p>
          </div>
        )}

        {/* Imposters List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : imposters.length === 0 ? (
            <div className="empty-state">
              <ShieldExclamationIcon className="empty-state-icon" />
              <p className="empty-state-title">
                {statusFilter ? 'No imposters match this filter' : 'No imposters detected yet'}
              </p>
              <p className="empty-state-description">
                Click &quot;Scan for Imposters&quot; to search Google for potential impersonators
              </p>
            </div>
          ) : (
            imposters.map(imposter => (
              <div key={imposter.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Main Row */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedImposter(expandedImposter === imposter.id ? null : imposter.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {expandedImposter === imposter.id ? (
                          <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <GlobeAltIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <a
                            href={`https://${imposter.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-foreground hover:text-primary truncate"
                          >
                            {imposter.domain}
                          </a>
                          {imposter.searchRank && (
                            <span className="text-xs text-muted-foreground">
                              (Rank #{imposter.searchRank})
                            </span>
                          )}
                        </div>
                        {imposter.pageTitle && (
                          <p className="text-sm text-muted-foreground truncate mt-1 ml-8">
                            {imposter.pageTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.color}`}>
                        {STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.label}
                      </span>

                      {/* Quick Report Status Icons */}
                      <div className="hidden md:flex items-center gap-1">
                        {REPORT_TYPES.map(type => {
                          const status = getReportStatus(imposter, type.id)
                          const config = REPORT_STATUS_CONFIG[status as keyof typeof REPORT_STATUS_CONFIG]
                          return (
                            <span
                              key={type.id}
                              className={`px-1.5 py-0.5 text-[10px] rounded ${config?.color}`}
                              title={`${type.label}: ${config?.label}`}
                            >
                              {type.shortLabel}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedImposter === imposter.id && (
                  <div className="border-t border-border p-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Details */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Source</dt>
                              <dd className="text-foreground">{imposter.source.replace('_', ' ')}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Detected</dt>
                              <dd className="text-foreground">{new Date(imposter.detectedAt).toLocaleDateString()}</dd>
                            </div>
                            {imposter.confirmedAt && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Confirmed</dt>
                                <dd className="text-foreground">{new Date(imposter.confirmedAt).toLocaleDateString()}</dd>
                              </div>
                            )}
                            {imposter.reviewedBy && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Reviewed by</dt>
                                <dd className="text-foreground">{imposter.reviewedBy.name || imposter.reviewedBy.email}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {imposter.pageDescription && (
                          <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">Page Description</h4>
                            <p className="text-sm text-muted-foreground">{imposter.pageDescription}</p>
                          </div>
                        )}

                        {/* Status Actions */}
                        {imposter.status === 'SUSPECTED' && (
                          <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">Review</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateStatus(imposter.id, 'CONFIRMED')}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                              >
                                Confirm Imposter
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(imposter.id, 'FALSE_POSITIVE')}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                              >
                                False Positive
                              </button>
                            </div>
                          </div>
                        )}

                        {imposter.status === 'CONFIRMED' && (
                          <div>
                            <button
                              onClick={() => handleUpdateStatus(imposter.id, 'RESOLVED')}
                              className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors"
                            >
                              Mark as Resolved
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: Report Tracking */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Report Tracking</h4>
                        <div className="space-y-2">
                          {REPORT_TYPES.map(type => {
                            const status = getReportStatus(imposter, type.id)
                            const report = imposter.reports.find(r => r.reportType === type.id)

                            return (
                              <div key={type.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{type.label}</p>
                                  {report?.reportedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Reported: {new Date(report.reportedAt).toLocaleDateString()}
                                      {report.followUpCount > 0 && ` (${report.followUpCount} follow-ups)`}
                                    </p>
                                  )}
                                </div>
                                <select
                                  value={status}
                                  onChange={(e) => handleUpdateReport(imposter.id, type.id, e.target.value)}
                                  className="text-xs px-2 py-1 rounded border border-border bg-background"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {Object.entries(REPORT_STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Scans</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Keyword</th>
                    <th>Pages</th>
                    <th>Total Results</th>
                    <th>Imposters Found</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map(scan => (
                    <tr key={scan.id}>
                      <td className="text-sm">{new Date(scan.createdAt).toLocaleString()}</td>
                      <td className="font-medium">{scan.searchKeyword}</td>
                      <td>{scan.pagesScanned}</td>
                      <td>{scan.totalResults.toLocaleString()}</td>
                      <td className={scan.impostorsFound > 0 ? 'text-red-600 font-medium' : ''}>
                        {scan.impostorsFound}
                      </td>
                      <td>
                        <span className={`badge ${scan.status === 'COMPLETED' ? 'badge-success' : scan.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                          {scan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Scan Options Modal */}
      {showScanModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">Scan for Imposters</h3>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="input-label">Search Keyword</label>
                <input
                  type="text"
                  value={scanOptions.searchKeyword}
                  onChange={(e) => setScanOptions(prev => ({ ...prev, searchKeyword: e.target.value }))}
                  className="input-field"
                  placeholder={brand?.name || 'Brand name'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The keyword to search in Google (defaults to brand name)
                </p>
              </div>
              <div>
                <label className="input-label">Region</label>
                <select
                  value={scanOptions.geolocation}
                  onChange={(e) => setScanOptions(prev => ({ ...prev, geolocation: e.target.value }))}
                  className="input-field"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="AU">Australia</option>
                  <option value="CA">Canada</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>
              <div>
                <label className="input-label">Pages to Scan</label>
                <select
                  value={scanOptions.pages}
                  onChange={(e) => setScanOptions(prev => ({ ...prev, pages: parseInt(e.target.value) }))}
                  className="input-field"
                >
                  <option value={5}>5 pages (~50 results)</option>
                  <option value={10}>10 pages (~100 results)</option>
                  <option value={15}>15 pages (~150 results)</option>
                  <option value={20}>20 pages (~200 results)</option>
                </select>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This will search Google for &quot;{scanOptions.searchKeyword || brand?.name}&quot; in {scanOptions.geolocation} and analyze the first {scanOptions.pages * 10} results for potential imposters.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowScanModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleScan} className="btn-primary">
                <MagnifyingGlassIcon className="h-4 w-4" />
                Start Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Imposter Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">Add Imposter Manually</h3>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="input-label">Domain *</label>
                <input
                  type="text"
                  value={addFormData.domain}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, domain: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., fake-brand.com"
                />
              </div>
              <div>
                <label className="input-label">Notes</label>
                <textarea
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAddImposter}
                className="btn-primary"
                disabled={!addFormData.domain}
              >
                Add Imposter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
