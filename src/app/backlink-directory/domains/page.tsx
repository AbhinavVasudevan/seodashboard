'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  LinkIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

interface Brand {
  id: string
  name: string
  count: number
}

interface Domain {
  id: string
  rootDomain: string
  exampleUrl: string | null
  domainRating: number | null
  domainTraffic: number | null
  nofollow: boolean
  contactedOn: string | null
  contactMethod: string | null
  contactEmail: string | null
  contactFormUrl: string | null
  remarks: string | null
  createdAt: string
  totalBacklinks: number
  totalProspects: number
  brands: Brand[]
  hasLiveBacklinks: boolean
}

interface DomainDetails {
  id: string
  rootDomain: string
  backlinksByBrand: Array<{
    brand: { id: string; name: string; domain: string | null }
    backlinks: Array<{
      id: string
      referringPageUrl: string
      targetUrl: string
      dr: number | null
      anchor: string | null
      linkType: string | null
      price: number | null
      publishDate: string | null
    }>
    totalSpent: number
  }>
  stats: {
    totalBacklinks: number
    totalBrands: number
    totalSpent: number
  }
}

const CONTACT_METHODS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'CONTACT_FORM', label: 'Contact Form' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'OTHER', label: 'Other' },
]

export default function LinkDirectoryPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    totalDomains: 0,
    avgDomainRating: 0,
    contactedDomains: 0,
    domainsWithBacklinks: 0,
  })

  // Expanded rows
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [domainDetails, setDomainDetails] = useState<Record<string, DomainDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [formData, setFormData] = useState({
    rootDomain: '',
    exampleUrl: '',
    domainRating: '',
    domainTraffic: '',
    nofollow: false,
    contactedOn: '',
    contactMethod: '',
    contactEmail: '',
    contactFormUrl: '',
    remarks: '',
  })

  // Import state
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)

  const fetchDomains = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sortBy: 'domainRating',
        sortOrder: 'desc',
      })
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/link-directory?${params}`)
      const data = await response.json()

      setDomains(data.domains)
      setTotalPages(data.totalPages)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching domains:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDomains()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchDomains])

  const toggleExpand = async (domainId: string) => {
    const newExpanded = new Set(expandedDomains)

    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId)
    } else {
      newExpanded.add(domainId)

      // Fetch details if not already loaded
      if (!domainDetails[domainId]) {
        setLoadingDetails(prev => new Set(prev).add(domainId))
        try {
          const response = await fetch(`/api/link-directory/${domainId}`)
          const data = await response.json()
          setDomainDetails(prev => ({ ...prev, [domainId]: data }))
        } catch (error) {
          console.error('Error fetching domain details:', error)
        } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(domainId)
            return newSet
          })
        }
      }
    }

    setExpandedDomains(newExpanded)
  }

  const openEditModal = (domain: Domain) => {
    setEditingDomain(domain)
    setFormData({
      rootDomain: domain.rootDomain,
      exampleUrl: domain.exampleUrl || '',
      domainRating: domain.domainRating?.toString() || '',
      domainTraffic: domain.domainTraffic?.toString() || '',
      nofollow: domain.nofollow,
      contactedOn: domain.contactedOn?.split('T')[0] || '',
      contactMethod: domain.contactMethod || '',
      contactEmail: domain.contactEmail || '',
      contactFormUrl: domain.contactFormUrl || '',
      remarks: domain.remarks || '',
    })
    setShowEditModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/link-directory'
      const method = editingDomain ? 'PUT' : 'POST'
      const body = editingDomain
        ? { id: editingDomain.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingDomain(null)
        fetchDomains()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save domain')
      }
    } catch (error) {
      console.error('Error saving domain:', error)
      alert('Failed to save domain')
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) return

    setImporting(true)
    try {
      // Parse CSV/TSV data
      const lines = importData.trim().split('\n')
      if (lines.length < 2) {
        alert('Please provide data with headers and at least one row')
        return
      }

      const headers = lines[0].split(/[\t,]/).map(h => h.trim())
      const rows = lines.slice(1).map(line => {
        const values = line.split(/[\t,]/)
        const row: Record<string, string> = {}
        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || ''
        })
        return row
      })

      const response = await fetch('/api/link-directory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: rows })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Import complete!\nCreated: ${result.created}\nUpdated: ${result.updated}\nSkipped: ${result.skipped}`)
        setShowImportModal(false)
        setImportData('')
        fetchDomains()
      } else {
        alert(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Error importing:', error)
      alert('Import failed')
    } finally {
      setImporting(false)
    }
  }

  const formatTraffic = (traffic: number | null) => {
    if (!traffic) return '-'
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`
    return traffic.toString()
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GlobeAltIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Link Directory</h1>
              <p className="text-sm text-muted-foreground">Master list of all domains - view which brands use each domain</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              Import
            </button>
            <button
              onClick={() => {
                setEditingDomain(null)
                setFormData({
                  rootDomain: '',
                  exampleUrl: '',
                  domainRating: '',
                  domainTraffic: '',
                  nofollow: false,
                  contactedOn: '',
                  contactMethod: '',
                  contactEmail: '',
                  contactFormUrl: '',
                  remarks: '',
                })
                setShowEditModal(true)
              }}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" />
              Add Domain
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value text-foreground">{stats.totalDomains.toLocaleString()}</div>
            <div className="stat-label">Total Domains</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-blue-600 dark:text-blue-400">{stats.avgDomainRating}</div>
            <div className="stat-label">Avg DR</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-green-600 dark:text-green-400">{stats.contactedDomains.toLocaleString()}</div>
            <div className="stat-label">Contacted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-purple-600 dark:text-purple-400">{stats.domainsWithBacklinks.toLocaleString()}</div>
            <div className="stat-label">With Backlinks</div>
          </div>
        </div>

        {/* Search */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search domains, URLs, or emails..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : (
            <div className="table-wrapper scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Root Domain</th>
                    <th>DR</th>
                    <th>Traffic</th>
                    <th>Nofollow</th>
                    <th>Contacted</th>
                    <th>Method</th>
                    <th>Brands</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state">
                          <GlobeAltIcon className="empty-state-icon" />
                          <p className="empty-state-title">No domains found</p>
                          <p className="empty-state-description">
                            {searchTerm ? 'Try adjusting your search' : 'Add your first domain to get started'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    domains.map(domain => (
                      <>
                        <tr key={domain.id}>
                          <td>
                            {domain.totalBacklinks > 0 && (
                              <button
                                onClick={() => toggleExpand(domain.id)}
                                className="action-btn"
                              >
                                {expandedDomains.has(domain.id) ? (
                                  <ChevronDownIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {domain.hasLiveBacklinks && (
                                <LinkIcon className="h-4 w-4 text-green-500" title="Has live backlinks" />
                              )}
                              <div>
                                <div className="cell-primary">{domain.rootDomain}</div>
                                {domain.exampleUrl && (
                                  <a
                                    href={domain.exampleUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline truncate block max-w-[200px]"
                                  >
                                    {domain.exampleUrl.substring(0, 40)}...
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className={`font-medium ${
                              domain.domainRating && domain.domainRating >= 50
                                ? 'text-green-600'
                                : domain.domainRating && domain.domainRating >= 30
                                  ? 'text-amber-600'
                                  : 'text-foreground'
                            }`}>
                              {domain.domainRating || '-'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground">
                            {formatTraffic(domain.domainTraffic)}
                          </td>
                          <td className="whitespace-nowrap">
                            {domain.nofollow ? (
                              <span className="badge-destructive">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground">
                            {domain.contactedOn ? new Date(domain.contactedOn).toLocaleDateString() : '-'}
                          </td>
                          <td className="whitespace-nowrap text-muted-foreground">
                            {domain.contactMethod?.replace('_', ' ') || '-'}
                          </td>
                          <td>
                            {domain.brands.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {domain.brands.slice(0, 3).map(brand => (
                                  <span key={brand.id} className="badge-purple">
                                    {brand.name} ({brand.count})
                                  </span>
                                ))}
                                {domain.brands.length > 3 && (
                                  <span className="badge-default">
                                    +{domain.brands.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="cell-truncate max-w-[150px]" title={domain.remarks || ''}>
                            {domain.remarks || '-'}
                          </td>
                          <td className="whitespace-nowrap">
                            <button
                              onClick={() => openEditModal(domain)}
                              className="action-btn"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {expandedDomains.has(domain.id) && (
                          <tr key={`${domain.id}-details`}>
                            <td colSpan={10} className="bg-muted/50 p-4">
                              {loadingDetails.has(domain.id) ? (
                                <div className="flex items-center justify-center py-4">
                                  <div className="spinner-sm text-primary"></div>
                                  <span className="ml-2 text-muted-foreground">Loading details...</span>
                                </div>
                              ) : domainDetails[domain.id] ? (
                                <div className="space-y-4">
                                  <div className="text-sm font-medium text-foreground">
                                    Backlinks by Brand ({domainDetails[domain.id].stats.totalBacklinks} total,
                                    ${domainDetails[domain.id].stats.totalSpent.toFixed(2)} spent)
                                  </div>
                                  {domainDetails[domain.id].backlinksByBrand.map(brandGroup => (
                                    <div key={brandGroup.brand.id} className="bg-card rounded-lg p-4 border border-border">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-foreground">{brandGroup.brand.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {brandGroup.backlinks.length} links · ${brandGroup.totalSpent.toFixed(2)} spent
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {brandGroup.backlinks.slice(0, 5).map(backlink => (
                                          <div key={backlink.id} className="text-sm flex items-center gap-4 text-muted-foreground">
                                            <a
                                              href={backlink.referringPageUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline truncate max-w-md"
                                            >
                                              {backlink.referringPageUrl}
                                            </a>
                                            <span className="text-muted-foreground/50">→</span>
                                            <span className="truncate max-w-xs">{backlink.targetUrl}</span>
                                            {backlink.dr && (
                                              <span className="badge-default">
                                                DR {backlink.dr}
                                              </span>
                                            )}
                                            {backlink.price && (
                                              <span className="text-green-600">
                                                ${backlink.price}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                        {brandGroup.backlinks.length > 5 && (
                                          <div className="text-sm text-muted-foreground">
                                            +{brandGroup.backlinks.length - 5} more backlinks
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-4">No details available</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDomain ? 'Edit Domain' : 'Add Domain'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Root Domain *</label>
                    <input
                      type="text"
                      value={formData.rootDomain}
                      onChange={(e) => setFormData({ ...formData, rootDomain: e.target.value })}
                      className="input-field"
                      required
                      disabled={!!editingDomain}
                      placeholder="example.com"
                    />
                  </div>

                  <div>
                    <label className="input-label">Example URL</label>
                    <input
                      type="url"
                      value={formData.exampleUrl}
                      onChange={(e) => setFormData({ ...formData, exampleUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://example.com/page"
                    />
                  </div>

                  <div>
                    <label className="input-label">Domain Rating</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.domainRating}
                      onChange={(e) => setFormData({ ...formData, domainRating: e.target.value })}
                      className="input-field"
                      placeholder="0-100"
                    />
                  </div>

                  <div>
                    <label className="input-label">Domain Traffic</label>
                    <input
                      type="number"
                      value={formData.domainTraffic}
                      onChange={(e) => setFormData({ ...formData, domainTraffic: e.target.value })}
                      className="input-field"
                      placeholder="Monthly traffic"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contacted On</label>
                    <input
                      type="date"
                      value={formData.contactedOn}
                      onChange={(e) => setFormData({ ...formData, contactedOn: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contact Method</label>
                    <select
                      value={formData.contactMethod}
                      onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select...</option>
                      {CONTACT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">Contact Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="input-field"
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div>
                    <label className="input-label">Contact Form URL</label>
                    <input
                      type="url"
                      value={formData.contactFormUrl}
                      onChange={(e) => setFormData({ ...formData, contactFormUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://example.com/contact"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="input-label">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="input-field"
                      rows={2}
                      placeholder="Notes about this domain..."
                    />
                  </div>

                  <div className="flex items-center gap-2 md:col-span-2">
                    <input
                      type="checkbox"
                      id="nofollow"
                      checked={formData.nofollow}
                      onChange={(e) => setFormData({ ...formData, nofollow: e.target.checked })}
                      className="h-4 w-4 text-primary rounded border-input focus:ring-ring"
                    />
                    <label htmlFor="nofollow" className="text-sm text-foreground">
                      Nofollow Links
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDomain ? 'Update' : 'Add'} Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="modal-header">
              <h3 className="modal-title">Import Domains</h3>
              <button onClick={() => setShowImportModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="modal-body">
              <div className="text-sm text-muted-foreground mb-4">
                <p>Paste your data below (CSV or tab-separated). Expected columns:</p>
                <p className="font-mono text-xs mt-2 bg-muted p-2 rounded">
                  Referring page URL, Domain rating, Domain traffic, Nofollow, Contacted On, Contacted, Remarks, Email/Link
                </p>
              </div>

              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="input-field font-mono text-sm"
                rows={15}
                placeholder="Paste your data here..."
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importData.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
