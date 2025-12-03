'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  ArrowsRightLeftIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface Brand {
  id: string
  name: string
}

interface Deal {
  id: string
  brandId: string
  brand: { id: string; name: string }
  prospectId: string | null
  prospect: { id: string; referringPageUrl: string; rootDomain: string; status: string } | null
  referringPageUrl: string
  linkUrl: string
  linkAnchor: string | null
  domainRating: number | null
  linkType: string | null
  price: number | null
  status: string
  remarks: string | null
  publishedOn: string | null
  expiresOn: string | null
  createdAt: string
}

interface ComparisonEntry {
  domain: string
  dr: number | null
  deals: Record<string, { dealId: string; status: string; price: number | null }>
}

interface ComparisonData {
  brands: Brand[]
  comparison: ComparisonEntry[]
  totalDomains: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  LIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

export default function BrandDealsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list')
  const [deals, setDeals] = useState<Deal[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState({
    brandId: '',
    referringPageUrl: '',
    linkUrl: '',
    linkAnchor: '',
    domainRating: '',
    linkType: '',
    price: '',
    status: 'PENDING',
    remarks: '',
    publishedOn: '',
    expiresOn: ''
  })

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (viewMode === 'list') {
      fetchDeals()
    } else {
      fetchComparison()
    }
  }, [viewMode, selectedBrandId, selectedStatus])

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

  const fetchDeals = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedBrandId) params.append('brandId', selectedBrandId)
      if (selectedStatus) params.append('status', selectedStatus)

      const response = await fetch(`/api/brand-deals?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDeals(data)
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComparison = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/brand-deals?compare=true')
      if (response.ok) {
        const data = await response.json()
        setComparisonData(data)
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingDeal(null)
    setFormData({
      brandId: selectedBrandId || '',
      referringPageUrl: '',
      linkUrl: '',
      linkAnchor: '',
      domainRating: '',
      linkType: '',
      price: '',
      status: 'PENDING',
      remarks: '',
      publishedOn: '',
      expiresOn: ''
    })
    setShowModal(true)
  }

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setFormData({
      brandId: deal.brandId,
      referringPageUrl: deal.referringPageUrl,
      linkUrl: deal.linkUrl,
      linkAnchor: deal.linkAnchor || '',
      domainRating: deal.domainRating?.toString() || '',
      linkType: deal.linkType || '',
      price: deal.price?.toString() || '',
      status: deal.status,
      remarks: deal.remarks || '',
      publishedOn: deal.publishedOn ? deal.publishedOn.split('T')[0] : '',
      expiresOn: deal.expiresOn ? deal.expiresOn.split('T')[0] : ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      const url = '/api/brand-deals'
      const method = editingDeal ? 'PUT' : 'POST'
      const body = editingDeal
        ? { id: editingDeal.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowModal(false)
        fetchDeals()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to save deal')
      }
    } catch (error) {
      console.error('Error saving deal:', error)
      alert('Failed to save deal')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return

    try {
      const response = await fetch(`/api/brand-deals?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchDeals()
      }
    } catch (error) {
      console.error('Error deleting deal:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LIVE':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'PENDING':
      case 'APPROVED':
        return <ClockIcon className="h-4 w-4 text-yellow-600" />
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  // Stats for list view
  const stats = {
    total: deals.length,
    live: deals.filter(d => d.status === 'LIVE').length,
    pending: deals.filter(d => d.status === 'PENDING' || d.status === 'APPROVED').length,
    totalSpent: deals.filter(d => d.status === 'LIVE').reduce((sum, d) => sum + (d.price || 0), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Brand Deals</h1>
              <p className="text-gray-600 mt-1">Manage backlink deals across brands</p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TableCellsIcon className="h-4 w-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 ${
                    viewMode === 'comparison' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ArrowsRightLeftIcon className="h-4 w-4" />
                  Compare
                </button>
              </div>
              <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Add Deal
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Deals</div>
              </div>
              <div className="card">
                <div className="text-2xl font-bold text-green-600">{stats.live}</div>
                <div className="text-sm text-gray-500">Live Links</div>
              </div>
              <div className="card">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pending/Approved</div>
              </div>
              <div className="card">
                <div className="text-2xl font-bold text-primary-600">${stats.totalSpent.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Spent (Live)</div>
              </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Brands</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="LIVE">Live</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Deals Table */}
            <div className="card">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : deals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No deals found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referring Page</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link URL</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deals.map(deal => (
                        <tr key={deal.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{deal.brand.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={deal.referringPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm truncate block max-w-xs"
                            >
                              {new URL(deal.referringPageUrl).hostname}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={deal.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <LinkIcon className="h-3 w-3" />
                              View
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={deal.domainRating && deal.domainRating >= 50 ? 'text-green-600 font-medium' : ''}>
                              {deal.domainRating || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {deal.price ? `$${deal.price}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status]}`}>
                              {getStatusIcon(deal.status)}
                              {deal.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(deal)}
                                className="text-primary-600 hover:text-primary-800 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(deal.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Comparison View */
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Cross-Brand Comparison</h2>
            <p className="text-sm text-gray-600 mb-4">
              See which domains have deals with multiple brands
            </p>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : !comparisonData || comparisonData.comparison.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No deals to compare</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                        Domain
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        DR
                      </th>
                      {comparisonData.brands.map(brand => (
                        <th key={brand.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          {brand.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisonData.comparison.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 sticky left-0 bg-white">
                          <span className="font-medium text-gray-900">{entry.domain}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={entry.dr && entry.dr >= 50 ? 'text-green-600 font-medium' : ''}>
                            {entry.dr || '-'}
                          </span>
                        </td>
                        {comparisonData.brands.map(brand => {
                          const deal = entry.deals[brand.id]
                          return (
                            <td key={brand.id} className="px-4 py-3 text-center">
                              {deal ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[deal.status]}`}>
                                    {deal.status}
                                  </span>
                                  {deal.price && (
                                    <span className="text-xs text-gray-500">${deal.price}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingDeal ? 'Edit Deal' : 'Add New Deal'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                <select
                  value={formData.brandId}
                  onChange={(e) => setFormData({...formData, brandId: e.target.value})}
                  className="input-field"
                  disabled={!!editingDeal}
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referring Page URL *</label>
                  <input
                    type="url"
                    value={formData.referringPageUrl}
                    onChange={(e) => setFormData({...formData, referringPageUrl: e.target.value})}
                    className="input-field"
                    placeholder="https://example.com/page"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link URL *</label>
                  <input
                    type="url"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                    className="input-field"
                    placeholder="https://yourbrand.com/target"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anchor Text</label>
                  <input
                    type="text"
                    value={formData.linkAnchor}
                    onChange={(e) => setFormData({...formData, linkAnchor: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating</label>
                  <input
                    type="number"
                    value={formData.domainRating}
                    onChange={(e) => setFormData({...formData, domainRating: e.target.value})}
                    className="input-field"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
                  <select
                    value={formData.linkType}
                    onChange={(e) => setFormData({...formData, linkType: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Type</option>
                    <option value="dofollow">Dofollow</option>
                    <option value="nofollow">Nofollow</option>
                    <option value="sponsored">Sponsored</option>
                    <option value="ugc">UGC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="input-field"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="LIVE">Live</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Published On</label>
                  <input
                    type="date"
                    value={formData.publishedOn}
                    onChange={(e) => setFormData({...formData, publishedOn: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires On</label>
                  <input
                    type="date"
                    value={formData.expiresOn}
                    onChange={(e) => setFormData({...formData, expiresOn: e.target.value})}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="input-field"
                  rows={3}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                {editingDeal ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
