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
  GlobeAltIcon,
  EllipsisVerticalIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  CheckCircleIcon
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
  // Price/Supplier info
  supplierName: string | null
  supplierEmail: string | null
  currentPrice: number | null
  currency: string | null
  createdAt: string
  totalBacklinks: number
  totalProspects: number
  totalSpent: number
  brands: Brand[]
  hasLiveBacklinks: boolean
  category: 'SPAM' | 'FREE_AFFILIATE' | 'FREE_LINK' | null
}

interface PriceHistory {
  id: string
  price: number
  effectiveFrom: string
  notes: string | null
}

interface DomainDetails {
  id: string
  rootDomain: string
  currentPrice: number | null
  supplierName: string | null
  supplierEmail: string | null
  priceHistory: PriceHistory[]
  backlinksByBrand: Array<{
    brand: { id: string; name: string; domain: string | null }
    backlinks: Array<{
      id: string
      referringPageUrl: string
      referringPageTitle: string | null
      targetUrl: string
      dr: number | null
      ur: number | null
      domainTraffic: number | null
      anchor: string | null
      linkType: string | null
      content: string | null
      firstSeen: string | null
      publishDate: string | null
      price: number | null
    }>
    totalSpent: number
  }>
  stats: {
    totalBacklinks: number
    totalBrands: number
    totalSpent: number
  }
}

// Helper functions
const getLinkTypeBadge = (type: string | null) => {
  const t = type?.toLowerCase()
  if (t === 'dofollow') return 'badge-success'
  if (t === 'nofollow') return 'badge-default'
  if (t === 'sponsored') return 'badge-purple'
  if (t === 'ugc') return 'badge-warning'
  return 'badge-default'
}

const getDRColor = (dr: number | null) => {
  if (!dr) return 'text-muted-foreground'
  if (dr >= 50) return 'text-green-600 font-semibold'
  if (dr >= 30) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
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
  const [hiddenCounts, setHiddenCounts] = useState({
    spam: 0,
    freeAffiliate: 0,
    freeLink: 0,
  })

  // Category filters
  const [hideSpam, setHideSpam] = useState(true)
  const [hideFreeAffiliate, setHideFreeAffiliate] = useState(true)
  const [hideFreeLink, setHideFreeLink] = useState(true)

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
    supplierName: '',
    supplierEmail: '',
    currentPrice: '',
    currency: 'USD',
    priceChangeNote: '',
  })

  // Import state
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)

  // Category actions dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const handleCategoryAction = async (domain: Domain, action: 'SPAM' | 'FREE_AFFILIATE' | 'FREE_LINK' | 'UNBLOCK') => {
    setOpenDropdown(null)
    try {
      if (action === 'UNBLOCK') {
        const response = await fetch(`/api/blocked-domains?domain=${encodeURIComponent(domain.rootDomain)}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to unblock domain')
          return
        }
      } else {
        const response = await fetch('/api/blocked-domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: domain.rootDomain,
            type: action,
          }),
        })
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to update domain category')
          return
        }
      }
      // Refresh the list
      fetchDomains()
    } catch (error) {
      console.error('Error updating domain category:', error)
      alert('Failed to update domain category')
    }
  }

  const fetchDomains = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sortBy: 'domainRating',
        sortOrder: 'desc',
        hideSpam: hideSpam.toString(),
        hideFreeAffiliate: hideFreeAffiliate.toString(),
        hideFreeLink: hideFreeLink.toString(),
      })
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/link-directory?${params}`)
      const data = await response.json()

      setDomains(data.domains)
      setTotalPages(data.totalPages)
      setStats(data.stats)
      setHiddenCounts(data.hiddenCounts || { spam: 0, freeAffiliate: 0, freeLink: 0 })
    } catch (error) {
      console.error('Error fetching domains:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, searchTerm, hideSpam, hideFreeAffiliate, hideFreeLink])

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
          // Only store if response was successful (has backlinksByBrand)
          if (response.ok && !data.error) {
            setDomainDetails(prev => ({ ...prev, [domainId]: data }))
          } else {
            // Store empty structure for virtual/backlink-only domains
            setDomainDetails(prev => ({ ...prev, [domainId]: {
              backlinksByBrand: [],
              priceHistory: [],
              stats: null,
              error: true
            } as unknown as DomainDetails }))
          }
        } catch (error) {
          console.error('Error fetching domain details:', error)
          setDomainDetails(prev => ({ ...prev, [domainId]: {
            backlinksByBrand: [],
            priceHistory: [],
            stats: null,
            error: true
          } as unknown as DomainDetails }))
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
      supplierName: domain.supplierName || '',
      supplierEmail: domain.supplierEmail || '',
      currentPrice: domain.currentPrice?.toString() || '',
      currency: domain.currency || 'USD',
      priceChangeNote: '',
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
                  supplierName: '',
                  supplierEmail: '',
                  currentPrice: '',
                  currency: 'USD',
                  priceChangeNote: '',
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

        {/* Search & Filters */}
        <div className="filter-bar flex-wrap gap-3">
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

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setHideSpam(!hideSpam); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                hideSpam
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-red-500 text-white'
              }`}
            >
              {hideSpam ? `Hiding ${hiddenCounts.spam} Spam` : `Showing Spam (${hiddenCounts.spam})`}
            </button>
            <button
              onClick={() => { setHideFreeAffiliate(!hideFreeAffiliate); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                hideFreeAffiliate
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {hideFreeAffiliate ? `Hiding ${hiddenCounts.freeAffiliate} Free Affiliate` : `Showing Free Affiliate (${hiddenCounts.freeAffiliate})`}
            </button>
            <button
              onClick={() => { setHideFreeLink(!hideFreeLink); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                hideFreeLink
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {hideFreeLink ? `Hiding ${hiddenCounts.freeLink} Free Links` : `Showing Free Links (${hiddenCounts.freeLink})`}
            </button>
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
                    <th>Price</th>
                    <th>Total Spent</th>
                    <th>Brands</th>
                    <th>Contacted</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
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
                                <div className="flex items-center gap-2">
                                  <span className="cell-primary">{domain.rootDomain}</span>
                                  {domain.category === 'SPAM' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                      SPAM
                                    </span>
                                  )}
                                  {domain.category === 'FREE_AFFILIATE' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                      FREE AFF
                                    </span>
                                  )}
                                  {domain.category === 'FREE_LINK' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      FREE
                                    </span>
                                  )}
                                </div>
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
                          <td className="whitespace-nowrap">
                            {domain.currentPrice ? (
                              <span className="font-medium text-green-600 dark:text-green-400">
                                ${domain.currentPrice}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap">
                            {domain.totalSpent > 0 ? (
                              <span className="text-foreground">
                                ${domain.totalSpent.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
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
                          <td className="whitespace-nowrap text-muted-foreground">
                            {domain.contactedOn ? new Date(domain.contactedOn).toLocaleDateString() : '-'}
                          </td>
                          <td className="cell-truncate max-w-[150px]" title={domain.remarks || ''}>
                            {domain.remarks || '-'}
                          </td>
                          <td className="whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(domain)}
                                className="action-btn"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>

                              {/* Category dropdown */}
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === domain.id ? null : domain.id)}
                                  className="action-btn"
                                  title="Mark as..."
                                >
                                  <EllipsisVerticalIcon className="h-4 w-4" />
                                </button>

                                {openDropdown === domain.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenDropdown(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
                                        Mark as...
                                      </div>
                                      <button
                                        onClick={() => handleCategoryAction(domain, 'SPAM')}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors ${
                                          domain.category === 'SPAM' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-foreground'
                                        }`}
                                      >
                                        <ShieldExclamationIcon className="h-4 w-4 text-red-500" />
                                        Spam
                                        {domain.category === 'SPAM' && <CheckCircleIcon className="h-4 w-4 ml-auto text-red-500" />}
                                      </button>
                                      <button
                                        onClick={() => handleCategoryAction(domain, 'FREE_AFFILIATE')}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors ${
                                          domain.category === 'FREE_AFFILIATE' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-foreground'
                                        }`}
                                      >
                                        <LinkIcon className="h-4 w-4 text-amber-500" />
                                        Free Affiliate
                                        {domain.category === 'FREE_AFFILIATE' && <CheckCircleIcon className="h-4 w-4 ml-auto text-amber-500" />}
                                      </button>
                                      <button
                                        onClick={() => handleCategoryAction(domain, 'FREE_LINK')}
                                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors ${
                                          domain.category === 'FREE_LINK' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-foreground'
                                        }`}
                                      >
                                        <GlobeAltIcon className="h-4 w-4 text-blue-500" />
                                        Free Link
                                        {domain.category === 'FREE_LINK' && <CheckCircleIcon className="h-4 w-4 ml-auto text-blue-500" />}
                                      </button>
                                      {domain.category && (
                                        <>
                                          <div className="border-t border-border my-1" />
                                          <button
                                            onClick={() => handleCategoryAction(domain, 'UNBLOCK')}
                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors text-green-600"
                                          >
                                            <NoSymbolIcon className="h-4 w-4" />
                                            Remove from list
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {expandedDomains.has(domain.id) && (
                          <tr key={`${domain.id}-details`}>
                            <td colSpan={9} className="bg-muted/20 p-0">
                              {loadingDetails.has(domain.id) ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="spinner-sm text-primary"></div>
                                  <span className="ml-2 text-muted-foreground">Loading details...</span>
                                </div>
                              ) : domainDetails[domain.id] ? (
                                <div className="p-4 space-y-4">
                                  {/* Summary Stats Row */}
                                  <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                                      <span className="text-xs text-muted-foreground">Total Backlinks:</span>
                                      <span className="text-sm font-semibold text-foreground">{domainDetails[domain.id].stats?.totalBacklinks ?? domain.totalBacklinks}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                                      <span className="text-xs text-muted-foreground">Brands:</span>
                                      <span className="text-sm font-semibold text-foreground">{domainDetails[domain.id].stats?.totalBrands ?? domain.brands.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                                      <span className="text-xs text-muted-foreground">Total Spent:</span>
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">${(domainDetails[domain.id].stats?.totalSpent ?? domain.totalSpent).toFixed(2)}</span>
                                    </div>
                                    {domainDetails[domain.id].currentPrice && (
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                                        <span className="text-xs text-muted-foreground">Current Price:</span>
                                        <span className="text-sm font-semibold text-primary">${domainDetails[domain.id].currentPrice}</span>
                                      </div>
                                    )}
                                    {domainDetails[domain.id].supplierName && (
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                                        <span className="text-xs text-muted-foreground">Supplier:</span>
                                        <span className="text-sm text-foreground">{domainDetails[domain.id].supplierName}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Backlinks by Brand - Table Format */}
                                  <div className="space-y-4">
                                    {(domainDetails[domain.id].backlinksByBrand || []).length > 0 ? (
                                      domainDetails[domain.id].backlinksByBrand.map(brandGroup => (
                                      <div key={brandGroup.brand.id} className="bg-card rounded-lg border border-border overflow-hidden">
                                        {/* Brand Header */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                                          <div className="flex items-center gap-3">
                                            <span className="badge-purple">{brandGroup.brand.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {brandGroup.backlinks.length} {brandGroup.backlinks.length === 1 ? 'backlink' : 'backlinks'}
                                            </span>
                                          </div>
                                          {brandGroup.totalSpent > 0 && (
                                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                              ${brandGroup.totalSpent.toFixed(2)} spent
                                            </span>
                                          )}
                                        </div>

                                        {/* Backlinks Table */}
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead className="bg-muted/30">
                                              <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Referring Page</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Target URL</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Anchor</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">DR</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Price</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Published</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                              {brandGroup.backlinks.map(backlink => (
                                                <tr key={backlink.id} className="hover:bg-muted/20 transition-colors">
                                                  <td className="px-3 py-2.5 max-w-[200px]">
                                                    <a
                                                      href={backlink.referringPageUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs text-primary hover:underline truncate block"
                                                      title={backlink.referringPageTitle || backlink.referringPageUrl}
                                                    >
                                                      {backlink.referringPageUrl.replace(/^https?:\/\//, '').slice(0, 40)}...
                                                    </a>
                                                  </td>
                                                  <td className="px-3 py-2.5 max-w-[180px]">
                                                    <a
                                                      href={backlink.targetUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-xs text-muted-foreground hover:text-foreground truncate block"
                                                      title={backlink.targetUrl}
                                                    >
                                                      {backlink.targetUrl.replace(/^https?:\/\//, '').slice(0, 35)}...
                                                    </a>
                                                  </td>
                                                  <td className="px-3 py-2.5 max-w-[120px]">
                                                    <span className="text-xs text-muted-foreground truncate block" title={backlink.anchor || ''}>
                                                      {backlink.anchor || '-'}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {backlink.linkType ? (
                                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getLinkTypeBadge(backlink.linkType)}`}>
                                                        {backlink.linkType}
                                                      </span>
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <span className={`text-xs ${getDRColor(backlink.dr)}`}>
                                                      {backlink.dr || '-'}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                                    {backlink.price ? (
                                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                        ${backlink.price}
                                                      </span>
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                                    <span className="text-xs text-muted-foreground">
                                                      {backlink.publishDate ? new Date(backlink.publishDate).toLocaleDateString() : '-'}
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    ))
                                    ) : (
                                      <div className="text-center text-muted-foreground py-6 bg-card rounded-lg border border-border">
                                        No backlink details available for this domain
                                      </div>
                                    )}
                                  </div>

                                  {/* Price History */}
                                  {domainDetails[domain.id].priceHistory?.length > 0 && (
                                    <div className="pt-3 border-t border-border">
                                      <div className="text-xs font-medium text-muted-foreground mb-2">Price History</div>
                                      <div className="flex flex-wrap gap-2">
                                        {domainDetails[domain.id].priceHistory.slice(0, 5).map((ph: PriceHistory) => (
                                          <div key={ph.id} className="text-xs px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-2">
                                            <span className="text-green-600 dark:text-green-400 font-medium">${ph.price}</span>
                                            <span className="text-muted-foreground">{new Date(ph.effectiveFrom).toLocaleDateString()}</span>
                                            {ph.notes && <span className="text-muted-foreground/60">({ph.notes})</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-8">No details available</div>
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
          <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col">
            <div className="modal-header flex-shrink-0">
              <h3 className="modal-title">
                {editingDomain ? 'Edit Domain' : 'Add Domain'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body overflow-y-auto flex-1">
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

                  <div className="md:col-span-2">
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

                  <div className="md:col-span-2">
                    <label className="input-label">Contact Form URL</label>
                    <input
                      type="url"
                      value={formData.contactFormUrl}
                      onChange={(e) => setFormData({ ...formData, contactFormUrl: e.target.value })}
                      className="input-field"
                      placeholder="https://example.com/contact"
                    />
                  </div>

                  {/* Supplier/Price Section */}
                  <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                    <h4 className="text-sm font-medium text-foreground mb-3">Supplier & Pricing</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Supplier Name</label>
                        <input
                          type="text"
                          value={formData.supplierName}
                          onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                          className="input-field"
                          placeholder="Supplier/Agency name"
                        />
                      </div>

                      <div>
                        <label className="input-label">Supplier Email</label>
                        <input
                          type="email"
                          value={formData.supplierEmail}
                          onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                          className="input-field"
                          placeholder="supplier@example.com"
                        />
                      </div>

                      <div>
                        <label className="input-label">Current Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.currentPrice}
                          onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                          className="input-field"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="input-label">Currency</label>
                        <select
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="input-field"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>

                      {editingDomain && editingDomain.currentPrice && (
                        <div className="md:col-span-2">
                          <label className="input-label">Price Change Note</label>
                          <input
                            type="text"
                            value={formData.priceChangeNote}
                            onChange={(e) => setFormData({ ...formData, priceChangeNote: e.target.value })}
                            className="input-field"
                            placeholder="Reason for price change (optional)"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current price: ${editingDomain.currentPrice} {editingDomain.currency || 'USD'}
                          </p>
                        </div>
                      )}
                    </div>
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

              <div className="modal-footer flex-shrink-0">
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
