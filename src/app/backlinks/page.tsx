'use client'

import { useState, useEffect } from 'react'
import { LinkIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Backlink {
  id: string
  rootDomain: string
  referringPageUrl: string
  dr?: number
  traffic?: number
  targetUrl: string
  anchor?: string
  dofollow: boolean
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'EXPIRED'
  price?: number
  builtOn?: string
  supplierEmail?: string
  liveFor?: number
  invoice?: string
  brand: {
    id: string
    name: string
  }
}

export default function BacklinksPage() {
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBacklink, setEditingBacklink] = useState<Backlink | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    rootDomain: '',
    referringPageUrl: '',
    dr: '',
    traffic: '',
    targetUrl: '',
    anchor: '',
    dofollow: true,
    status: 'PENDING',
    price: '',
    builtOn: '',
    supplierEmail: '',
    liveFor: '',
    invoice: '',
    brandId: '',
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      // Fetch backlinks and brands in parallel
      const [backlinksResponse, brandsResponse] = await Promise.all([
        fetch('/api/backlinks'),
        fetch('/api/brands')
      ])

      const [backlinksData, brandsData] = await Promise.all([
        backlinksResponse.json(),
        brandsResponse.json()
      ])

      setBacklinks(backlinksData)
      setBrands(brandsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBacklinks = async () => {
    try {
      const response = await fetch('/api/backlinks')
      const data = await response.json()
      setBacklinks(data)
    } catch (error) {
      console.error('Error fetching backlinks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        dr: formData.dr ? parseInt(formData.dr) : null,
        traffic: formData.traffic ? parseInt(formData.traffic) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        liveFor: formData.liveFor ? parseInt(formData.liveFor) : null,
        builtOn: formData.builtOn || null,
      }

      const response = await fetch('/api/backlinks', {
        method: editingBacklink ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBacklink ? { ...payload, id: editingBacklink.id } : payload),
      })

      if (response.ok) {
        setShowAddForm(false)
        setEditingBacklink(null)
        resetForm()
        fetchBacklinks()
      }
    } catch (error) {
      console.error('Error saving backlink:', error)
    }
  }

  const handleEdit = (backlink: Backlink) => {
    setEditingBacklink(backlink)
    setFormData({
      rootDomain: backlink.rootDomain,
      referringPageUrl: backlink.referringPageUrl,
      dr: backlink.dr?.toString() || '',
      traffic: backlink.traffic?.toString() || '',
      targetUrl: backlink.targetUrl,
      anchor: backlink.anchor || '',
      dofollow: backlink.dofollow,
      status: backlink.status,
      price: backlink.price?.toString() || '',
      builtOn: backlink.builtOn || '',
      supplierEmail: backlink.supplierEmail || '',
      liveFor: backlink.liveFor?.toString() || '',
      invoice: backlink.invoice || '',
      brandId: backlinks.find(b => b.id === backlink.id)?.brand?.id || '',
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this backlink?')) {
      try {
        await fetch(`/api/backlinks?id=${id}`, { method: 'DELETE' })
        fetchBacklinks()
      } catch (error) {
        console.error('Error deleting backlink:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      rootDomain: '',
      referringPageUrl: '',
      dr: '',
      traffic: '',
      targetUrl: '',
      anchor: '',
      dofollow: true,
      status: 'PENDING',
      price: '',
      builtOn: '',
      supplierEmail: '',
      liveFor: '',
      invoice: '',
      brandId: '',
    })
  }

  const filteredBacklinks = backlinks.filter(backlink => {
    const matchesSearch = backlink.rootDomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         backlink.referringPageUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         backlink.brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || backlink.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'badge-success'
      case 'PENDING': return 'badge-warning'
      case 'REJECTED': return 'badge-destructive'
      case 'EXPIRED': return 'badge-gray'
      default: return 'badge-default'
    }
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LinkIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Backlinks</h1>
              <p className="text-sm text-muted-foreground">Manage your backlink portfolio</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingBacklink(null)
              resetForm()
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Add Backlink
          </button>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search backlinks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Backlinks Table */}
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
                    <th>Root Domain</th>
                    <th>Referring Page</th>
                    <th>DR</th>
                    <th>Traffic</th>
                    <th>Brand</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBacklinks.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <LinkIcon className="empty-state-icon" />
                          <p className="empty-state-title">No backlinks found</p>
                          <p className="empty-state-description">
                            {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Add your first backlink to get started'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBacklinks.map((backlink) => (
                      <tr key={backlink.id}>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="cell-primary">{backlink.rootDomain}</span>
                          </div>
                        </td>
                        <td className="cell-truncate">
                          <a
                            href={backlink.referringPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-external"
                          >
                            {backlink.referringPageUrl}
                          </a>
                        </td>
                        <td className="whitespace-nowrap">{backlink.dr || '-'}</td>
                        <td className="whitespace-nowrap">{backlink.traffic?.toLocaleString() || '-'}</td>
                        <td className="whitespace-nowrap">{backlink.brand.name}</td>
                        <td className="whitespace-nowrap">
                          <span className={getStatusBadge(backlink.status)}>
                            {backlink.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          {backlink.price ? `$${backlink.price}` : '-'}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(backlink)}
                              className="action-btn"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(backlink.id)}
                              className="action-btn-danger"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Backlink Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content max-w-2xl">
              <div className="modal-header">
                <h3 className="modal-title">
                  {editingBacklink ? 'Edit Backlink' : 'Add New Backlink'}
                </h3>
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
                      />
                    </div>
                    <div>
                      <label className="input-label">Referring Page URL *</label>
                      <input
                        type="url"
                        value={formData.referringPageUrl}
                        onChange={(e) => setFormData({ ...formData, referringPageUrl: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Target URL *</label>
                      <input
                        type="url"
                        value={formData.targetUrl}
                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Brand *</label>
                      <select
                        value={formData.brandId}
                        onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                        className="input-field"
                        required
                      >
                        <option value="">Select a brand...</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Domain Rating</label>
                      <input
                        type="number"
                        value={formData.dr}
                        onChange={(e) => setFormData({ ...formData, dr: e.target.value })}
                        className="input-field"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="input-label">Traffic</label>
                      <input
                        type="number"
                        value={formData.traffic}
                        onChange={(e) => setFormData({ ...formData, traffic: e.target.value })}
                        className="input-field"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="input-label">Anchor Text</label>
                      <input
                        type="text"
                        value={formData.anchor}
                        onChange={(e) => setFormData({ ...formData, anchor: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="input-field"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="input-field"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="input-label">Built On</label>
                      <input
                        type="date"
                        value={formData.builtOn}
                        onChange={(e) => setFormData({ ...formData, builtOn: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Supplier Email</label>
                      <input
                        type="email"
                        value={formData.supplierEmail}
                        onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Live For (days)</label>
                      <input
                        type="number"
                        value={formData.liveFor}
                        onChange={(e) => setFormData({ ...formData, liveFor: e.target.value })}
                        className="input-field"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="input-label">Invoice</label>
                      <input
                        type="text"
                        value={formData.invoice}
                        onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        id="dofollow"
                        checked={formData.dofollow}
                        onChange={(e) => setFormData({ ...formData, dofollow: e.target.checked })}
                        className="h-4 w-4 text-primary rounded border-input focus:ring-ring"
                      />
                      <label htmlFor="dofollow" className="text-sm text-foreground">
                        Dofollow
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingBacklink(null)
                      resetForm()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingBacklink ? 'Update' : 'Add'} Backlink
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
