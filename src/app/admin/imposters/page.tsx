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
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface Report {
  id: string
  reportType: string
  status: string
  reportedAt: string | null
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

const REPORT_TYPES = [
  { id: 'CLOUDFLARE', shortLabel: 'CF' },
  { id: 'HOSTING', shortLabel: 'Host' },
  { id: 'GOOGLE_LEGAL', shortLabel: 'G-Legal' },
  { id: 'GOOGLE_COPYRIGHT', shortLabel: 'G-DMCA' },
  { id: 'DOMAIN_REGISTRAR', shortLabel: 'Reg' },
  { id: 'DOMAIN_OWNER', shortLabel: 'Owner' },
]

export default function AdminImpostersPage() {
  const [imposters, setImposters] = useState<Imposter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('SUSPECTED')
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])

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

  const getReportStatus = (imposter: Imposter, reportType: string) => {
    const report = imposter.reports.find(r => r.reportType === reportType)
    return report?.status || 'NOT_REPORTED'
  }

  const stats = {
    suspected: imposters.filter(i => i.status === 'SUSPECTED').length,
    confirmed: imposters.filter(i => i.status === 'CONFIRMED').length,
    resolved: imposters.filter(i => i.status === 'RESOLVED').length,
  }

  // Group by brand for display
  const impostersByBrand = imposters.reduce((acc, imposter) => {
    const brandId = imposter.brand.id
    if (!acc[brandId]) {
      acc[brandId] = {
        brand: imposter.brand,
        imposters: [],
      }
    }
    acc[brandId].imposters.push(imposter)
    return acc
  }, {} as Record<string, { brand: Imposter['brand']; imposters: Imposter[] }>)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="page-content py-4">
          <div className="flex items-center gap-3 mb-1">
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
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
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

        {/* Imposters List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner-md text-primary"></div>
          </div>
        ) : imposters.length === 0 ? (
          <div className="empty-state">
            <ShieldExclamationIcon className="empty-state-icon" />
            <p className="empty-state-title">No imposters found</p>
            <p className="empty-state-description">
              {statusFilter ? 'No imposters match your filter criteria' : 'Run scans on brands to detect potential imposters'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(impostersByBrand).map(({ brand, imposters: brandImposters }) => (
              <div key={brand.id}>
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Link
                    href={`/brands/${brand.id}/imposters`}
                    className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <BuildingOfficeIcon className="h-5 w-5" />
                    {brand.name}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    ({brand.domain}) • {brandImposters.length} imposter{brandImposters.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Imposters Table */}
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th>Status</th>
                        <th>Detected</th>
                        <th className="hidden lg:table-cell">Source</th>
                        <th>Reports</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandImposters.map(imposter => (
                        <tr key={imposter.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <GlobeAltIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <a
                                  href={`https://${imposter.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-foreground hover:text-primary"
                                >
                                  {imposter.domain}
                                </a>
                                {imposter.pageTitle && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                                    {imposter.pageTitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.color}`}>
                              {STATUS_CONFIG[imposter.status as keyof typeof STATUS_CONFIG]?.label}
                            </span>
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(imposter.detectedAt).toLocaleDateString()}
                          </td>
                          <td className="hidden lg:table-cell text-sm text-muted-foreground">
                            {imposter.source.replace('_', ' ')}
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              {REPORT_TYPES.map(type => {
                                const status = getReportStatus(imposter, type.id)
                                const config = REPORT_STATUS_CONFIG[status as keyof typeof REPORT_STATUS_CONFIG]
                                return (
                                  <span
                                    key={type.id}
                                    className={`px-1.5 py-0.5 text-[10px] rounded ${config?.color}`}
                                    title={`${type.shortLabel}: ${config?.label}`}
                                  >
                                    {type.shortLabel}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {imposter.status === 'SUSPECTED' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(imposter.id, 'CONFIRMED')}
                                    className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors"
                                    title="Confirm as imposter"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(imposter.id, 'FALSE_POSITIVE')}
                                    className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                                    title="Mark as false positive"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {imposter.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleUpdateStatus(imposter.id, 'RESOLVED')}
                                  className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors"
                                  title="Mark as resolved"
                                >
                                  Resolve
                                </button>
                              )}
                              <Link
                                href={`/brands/${brand.id}/imposters`}
                                className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors"
                              >
                                Details
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
