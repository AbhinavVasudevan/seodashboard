'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShieldExclamationIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  NoSymbolIcon,
  XMarkIcon,
  GiftIcon,
  LinkIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

type DomainType = 'SPAM' | 'FREE_AFFILIATE' | 'FREE_LINK'

interface BlockedDomain {
  id: string
  domain: string
  type: DomainType
  reason: string | null
  createdAt: string
  blockedBy: {
    name: string | null
    email: string
  } | null
}

interface Stats {
  SPAM: number
  FREE_AFFILIATE: number
  FREE_LINK: number
  total: number
}

const TYPE_CONFIG = {
  SPAM: {
    label: 'Spam',
    description: 'Black hat SEO, link farms, PBNs',
    color: 'red',
    icon: NoSymbolIcon,
    badge: 'badge-destructive'
  },
  FREE_AFFILIATE: {
    label: 'Free Affiliate',
    description: 'Affiliate sites linking for commission',
    color: 'purple',
    icon: GiftIcon,
    badge: 'badge-purple'
  },
  FREE_LINK: {
    label: 'Free Link',
    description: 'Organic/natural editorial links',
    color: 'green',
    icon: LinkIcon,
    badge: 'badge-success'
  }
}

export default function BlockedDomainsPage() {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([])
  const [stats, setStats] = useState<Stats>({ SPAM: 0, FREE_AFFILIATE: 0, FREE_LINK: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<DomainType | ''>('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDomain, setEditingDomain] = useState<BlockedDomain | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [newType, setNewType] = useState<DomainType>('SPAM')
  const [newReason, setNewReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBlockedDomains()
  }, [typeFilter])

  const fetchBlockedDomains = async () => {
    setIsLoading(true)
    try {
      const typeParam = typeFilter ? `?type=${typeFilter}` : ''
      const response = await fetch(`/api/blocked-domains${typeParam}`)
      if (response.ok) {
        const data = await response.json()
        setBlockedDomains(data.domains)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching blocked domains:', error)
      toast.error('Failed to fetch domains')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!newDomain.trim()) {
      toast.error('Domain is required')
      return
    }

    setIsSubmitting(true)
    try {
      const method = editingDomain ? 'PUT' : 'POST'
      const body = editingDomain
        ? { id: editingDomain.id, type: newType, reason: newReason.trim() || null }
        : { domain: newDomain.trim(), type: newType, reason: newReason.trim() || null }

      const response = await fetch('/api/blocked-domains', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(editingDomain ? 'Domain updated' : `"${newDomain}" added`)
        resetForm()
        fetchBlockedDomains()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to save domain')
      }
    } catch (error) {
      console.error('Error saving domain:', error)
      toast.error('Failed to save domain')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (domain: BlockedDomain) => {
    setEditingDomain(domain)
    setNewDomain(domain.domain)
    setNewType(domain.type)
    setNewReason(domain.reason || '')
    setShowAddModal(true)
  }

  const handleDelete = async (id: string, domain: string) => {
    if (!confirm(`Remove "${domain}" from the list?\n\nBacklinks from this domain will be visible again.`)) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/blocked-domains?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success(`"${domain}" removed`)
        fetchBlockedDomains()
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to remove domain')
      }
    } catch (error) {
      console.error('Error removing domain:', error)
      toast.error('Failed to remove domain')
    } finally {
      setDeletingId(null)
    }
  }

  const resetForm = () => {
    setShowAddModal(false)
    setEditingDomain(null)
    setNewDomain('')
    setNewType('SPAM')
    setNewReason('')
  }

  const filteredDomains = blockedDomains.filter(bd =>
    bd.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bd.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/users" className="action-btn">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ShieldExclamationIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="page-title">Domain Categories</h1>
              <p className="text-sm text-muted-foreground">
                Manage spam, free affiliate, and free link domains
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Add Domain
          </button>
        </div>

        {/* Stats by Type */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setTypeFilter('')}
            className={`stat-card hover:shadow-md transition-all text-left ${typeFilter === '' ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">All Domains</div>
          </button>
          <button
            onClick={() => setTypeFilter('SPAM')}
            className={`stat-card hover:shadow-md transition-all text-left ${typeFilter === 'SPAM' ? 'ring-2 ring-red-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              <NoSymbolIcon className="h-5 w-5 text-red-500" />
              <div>
                <div className="stat-value text-red-500">{stats.SPAM}</div>
                <div className="stat-label">Spam</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setTypeFilter('FREE_AFFILIATE')}
            className={`stat-card hover:shadow-md transition-all text-left ${typeFilter === 'FREE_AFFILIATE' ? 'ring-2 ring-purple-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              <GiftIcon className="h-5 w-5 text-purple-500" />
              <div>
                <div className="stat-value text-purple-500">{stats.FREE_AFFILIATE}</div>
                <div className="stat-label">Free Affiliates</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setTypeFilter('FREE_LINK')}
            className={`stat-card hover:shadow-md transition-all text-left ${typeFilter === 'FREE_LINK' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-green-500" />
              <div>
                <div className="stat-value text-green-500">{stats.FREE_LINK}</div>
                <div className="stat-label">Free Links</div>
              </div>
            </div>
          </button>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-red-500">Spam:</strong> Always hidden from backlinks list</p>
            <p><strong className="text-purple-500">Free Affiliate:</strong> Hidden by default, can be toggled on in backlinks page</p>
            <p><strong className="text-green-500">Free Link:</strong> Always visible, shown with "Free" badge</p>
          </div>
        </div>

        {/* Search */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          ) : filteredDomains.length === 0 ? (
            <div className="empty-state">
              <ShieldExclamationIcon className="empty-state-icon" />
              <p className="empty-state-title">
                {searchTerm || typeFilter ? 'No matching domains' : 'No domains added'}
              </p>
              <p className="empty-state-description">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Categorize domains from any brand\'s backlinks page'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Added By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map((bd) => {
                    const config = TYPE_CONFIG[bd.type]
                    const IconComponent = config.icon
                    return (
                      <tr key={bd.id}>
                        <td className="cell-primary whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`h-4 w-4 text-${config.color}-500`} />
                            {bd.domain}
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={config.badge}>
                            {config.label}
                          </span>
                        </td>
                        <td className="cell-secondary max-w-[200px]">
                          <span className="line-clamp-1" title={bd.reason || undefined}>
                            {bd.reason || <span className="text-muted-foreground">-</span>}
                          </span>
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {bd.blockedBy?.name || bd.blockedBy?.email || 'Unknown'}
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {formatDate(bd.createdAt)}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(bd)}
                              className="action-btn"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(bd.id, bd.domain)}
                              className="action-btn-danger"
                              title="Remove"
                              disabled={deletingId === bd.id}
                            >
                              {deletingId === bd.id ? (
                                <span className="spinner-xs" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDomain ? 'Edit Domain' : 'Add Domain'}
              </h3>
              <button onClick={resetForm} className="action-btn">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="input-label">Domain *</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="input-field"
                  placeholder="example.com"
                  disabled={!!editingDomain}
                  autoFocus={!editingDomain}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the root domain without http:// or www.
                </p>
              </div>

              <div>
                <label className="input-label">Category *</label>
                <div className="space-y-2 mt-2">
                  {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                    const IconComponent = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setNewType(type as DomainType)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                          newType === type
                            ? `border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-900/20`
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`h-5 w-5 text-${config.color}-500`} />
                          <div>
                            <p className="font-medium text-sm">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="input-label">Reason (optional)</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="input-field"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={(!editingDomain && !newDomain.trim()) || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-sm" />
                    Saving...
                  </>
                ) : editingDomain ? (
                  'Update'
                ) : (
                  'Add Domain'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
