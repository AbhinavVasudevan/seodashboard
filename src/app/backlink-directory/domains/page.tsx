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
  LinkIcon
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Link Directory</h1>
              <p className="text-gray-600 mt-1">Master list of all domains - view which brands use each domain</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
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
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Domain
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total Domains</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.totalDomains.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Avg DR</div>
            <div className="text-2xl font-semibold text-blue-600">{stats.avgDomainRating}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Contacted</div>
            <div className="text-2xl font-semibold text-green-600">{stats.contactedDomains.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">With Backlinks</div>
            <div className="text-2xl font-semibold text-purple-600">{stats.domainsWithBacklinks.toLocaleString()}</div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains, URLs, or emails..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Root Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nofollow</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brands</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : domains.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No domains found
                    </td>
                  </tr>
                ) : (
                  domains.map(domain => (
                    <>
                      <tr key={domain.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {domain.totalBacklinks > 0 && (
                            <button
                              onClick={() => toggleExpand(domain.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedDomains.has(domain.id) ? (
                                <ChevronDownIcon className="h-5 w-5" />
                              ) : (
                                <ChevronRightIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {domain.hasLiveBacklinks && (
                              <LinkIcon className="h-4 w-4 text-green-500" title="Has live backlinks" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{domain.rootDomain}</div>
                              {domain.exampleUrl && (
                                <a
                                  href={domain.exampleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                                >
                                  {domain.exampleUrl.substring(0, 50)}...
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`font-medium ${
                            domain.domainRating && domain.domainRating >= 50
                              ? 'text-green-600'
                              : domain.domainRating && domain.domainRating >= 30
                                ? 'text-amber-600'
                                : 'text-gray-900'
                          }`}>
                            {domain.domainRating || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTraffic(domain.domainTraffic)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {domain.nofollow ? (
                            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">Yes</span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {domain.contactedOn ? new Date(domain.contactedOn).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {domain.contactMethod?.replace('_', ' ') || '-'}
                        </td>
                        <td className="px-4 py-4">
                          {domain.brands.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {domain.brands.slice(0, 3).map(brand => (
                                <span key={brand.id} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                  {brand.name} ({brand.count})
                                </span>
                              ))}
                              {domain.brands.length > 3 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  +{domain.brands.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={domain.remarks || ''}>
                          {domain.remarks || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(domain)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {expandedDomains.has(domain.id) && (
                        <tr key={`${domain.id}-details`}>
                          <td colSpan={10} className="px-4 py-4 bg-gray-50">
                            {loadingDetails.has(domain.id) ? (
                              <div className="text-center text-gray-500 py-4">Loading details...</div>
                            ) : domainDetails[domain.id] ? (
                              <div className="space-y-4">
                                <div className="text-sm font-medium text-gray-700">
                                  Backlinks by Brand ({domainDetails[domain.id].stats.totalBacklinks} total,
                                  ${domainDetails[domain.id].stats.totalSpent.toFixed(2)} spent)
                                </div>
                                {domainDetails[domain.id].backlinksByBrand.map(brandGroup => (
                                  <div key={brandGroup.brand.id} className="bg-white rounded-lg p-4 border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-900">{brandGroup.brand.name}</span>
                                      <span className="text-sm text-gray-500">
                                        {brandGroup.backlinks.length} links · ${brandGroup.totalSpent.toFixed(2)} spent
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {brandGroup.backlinks.slice(0, 5).map(backlink => (
                                        <div key={backlink.id} className="text-sm flex items-center gap-4 text-gray-600">
                                          <a
                                            href={backlink.referringPageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 truncate max-w-md"
                                          >
                                            {backlink.referringPageUrl}
                                          </a>
                                          <span className="text-gray-400">→</span>
                                          <span className="truncate max-w-xs">{backlink.targetUrl}</span>
                                          {backlink.dr && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                              DR {backlink.dr}
                                            </span>
                                          )}
                                          {backlink.price && (
                                            <span className="text-xs text-green-600">
                                              ${backlink.price}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {brandGroup.backlinks.length > 5 && (
                                        <div className="text-sm text-gray-500">
                                          +{brandGroup.backlinks.length - 5} more backlinks
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-4">No details available</div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
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
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingDomain ? 'Edit Domain' : 'Add Domain'}
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Root Domain *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Example URL
                  </label>
                  <input
                    type="url"
                    value={formData.exampleUrl}
                    onChange={(e) => setFormData({ ...formData, exampleUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://example.com/page"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Rating
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Traffic
                  </label>
                  <input
                    type="number"
                    value={formData.domainTraffic}
                    onChange={(e) => setFormData({ ...formData, domainTraffic: e.target.value })}
                    className="input-field"
                    placeholder="Monthly traffic"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contacted On
                  </label>
                  <input
                    type="date"
                    value={formData.contactedOn}
                    onChange={(e) => setFormData({ ...formData, contactedOn: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Method
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="input-field"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Form URL
                  </label>
                  <input
                    type="url"
                    value={formData.contactFormUrl}
                    onChange={(e) => setFormData({ ...formData, contactFormUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://example.com/contact"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="input-field"
                    rows={2}
                    placeholder="Notes about this domain..."
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.nofollow}
                      onChange={(e) => setFormData({ ...formData, nofollow: e.target.checked })}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Nofollow Links</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Import Domains</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                <p>Paste your data below (CSV or tab-separated). Expected columns:</p>
                <p className="font-mono text-xs mt-2 bg-gray-100 p-2 rounded">
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

              <div className="flex justify-end gap-3">
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
        </div>
      )}
    </div>
  )
}
