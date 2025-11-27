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
    fetchBacklinks()
    fetchBrands()
  }, [])

  const fetchBacklinks = async () => {
    try {
      const response = await fetch('/api/backlinks')
      const data = await response.json()
      setBacklinks(data)
    } catch (error) {
      console.error('Error fetching backlinks:', error)
    }
  }

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      const data = await response.json()
      setBrands(data)
    } catch (error) {
      console.error('Error fetching brands:', error)
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
        headers: {
          'Content-Type': 'application/json',
        },
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
        await fetch(`/api/backlinks?id=${id}`, {
          method: 'DELETE',
        })
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'status-success'
      case 'PENDING':
        return 'status-warning'
      case 'REJECTED':
        return 'status-error'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backlinks</h1>
            <p className="text-gray-600 mt-2">Manage your backlink portfolio</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingBacklink(null)
              resetForm()
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Backlink
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search backlinks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Backlinks Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Root Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referring Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traffic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBacklinks.map((backlink) => (
                  <tr key={backlink.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <LinkIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {backlink.rootDomain}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={backlink.referringPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-800 truncate block max-w-xs"
                      >
                        {backlink.referringPageUrl}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backlink.dr || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backlink.traffic || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backlink.brand.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${getStatusColor(backlink.status)}`}>
                        {backlink.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backlink.price ? `$${backlink.price}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(backlink)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(backlink.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Backlink Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editingBacklink ? 'Edit Backlink' : 'Add New Backlink'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Root Domain *
                    </label>
                    <input
                      type="text"
                      value={formData.rootDomain}
                      onChange={(e) => setFormData({ ...formData, rootDomain: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referring Page URL *
                    </label>
                    <input
                      type="url"
                      value={formData.referringPageUrl}
                      onChange={(e) => setFormData({ ...formData, referringPageUrl: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target URL *
                    </label>
                    <input
                      type="url"
                      value={formData.targetUrl}
                      onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand *
                    </label>
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select a brand...</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain Rating
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Traffic
                    </label>
                    <input
                      type="number"
                      value={formData.traffic}
                      onChange={(e) => setFormData({ ...formData, traffic: e.target.value })}
                      className="input-field"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Anchor Text
                    </label>
                    <input
                      type="text"
                      value={formData.anchor}
                      onChange={(e) => setFormData({ ...formData, anchor: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Built On
                    </label>
                    <input
                      type="date"
                      value={formData.builtOn}
                      onChange={(e) => setFormData({ ...formData, builtOn: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={formData.supplierEmail}
                      onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Live For (days)
                    </label>
                    <input
                      type="number"
                      value={formData.liveFor}
                      onChange={(e) => setFormData({ ...formData, liveFor: e.target.value })}
                      className="input-field"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice
                    </label>
                    <input
                      type="text"
                      value={formData.invoice}
                      onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="dofollow"
                    checked={formData.dofollow}
                    onChange={(e) => setFormData({ ...formData, dofollow: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="dofollow" className="ml-2 block text-sm text-gray-900">
                    Dofollow
                  </label>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingBacklink(null)
                      resetForm()
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
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
