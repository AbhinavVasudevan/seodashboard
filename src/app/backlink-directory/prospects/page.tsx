'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Prospect {
  id: string
  referringPageUrl: string
  rootDomain: string
  domainRating: number | null
  domainTraffic: number | null
  nofollow: boolean
  contactedOn: string | null
  contactMethod: string | null
  contactEmail: string | null
  contactFormUrl: string | null
  remarks: string | null
  content: string | null
  status: string
  source: string | null
  brandDeals: Array<{
    id: string
    brand: { id: string; name: string }
  }>
}

const STATUS_OPTIONS = [
  { value: 'NOT_CONTACTED', label: 'Not Contacted', color: 'bg-gray-100 text-gray-800' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-800' },
  { value: 'RESPONDED', label: 'Responded', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'NEGOTIATING', label: 'Negotiating', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DEAL_LOCKED', label: 'Deal Locked', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'NO_RESPONSE', label: 'No Response', color: 'bg-orange-100 text-orange-800' },
]

const CONTACT_METHODS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'CONTACT_FORM', label: 'Contact Form' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'OTHER', label: 'Other' },
]

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [formData, setFormData] = useState({
    referringPageUrl: '',
    rootDomain: '',
    domainRating: '',
    domainTraffic: '',
    nofollow: false,
    contactedOn: '',
    contactMethod: '',
    contactEmail: '',
    contactFormUrl: '',
    remarks: '',
    content: '',
    status: 'NOT_CONTACTED',
    source: 'manual'
  })

  useEffect(() => {
    fetchProspects()
  }, [statusFilter])

  const fetchProspects = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/backlink-prospects?${params}`)
      const data = await response.json()
      setProspects(data)
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = '/api/backlink-prospects'
      const method = editingProspect ? 'PUT' : 'POST'
      const body = editingProspect
        ? { id: editingProspect.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchProspects()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save prospect')
      }
    } catch (error) {
      console.error('Error saving prospect:', error)
      alert('Failed to save prospect')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return

    try {
      const response = await fetch(`/api/backlink-prospects?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Error deleting prospect:', error)
    }
  }

  const openEditModal = (prospect: Prospect) => {
    setEditingProspect(prospect)
    setFormData({
      referringPageUrl: prospect.referringPageUrl,
      rootDomain: prospect.rootDomain,
      domainRating: prospect.domainRating?.toString() || '',
      domainTraffic: prospect.domainTraffic?.toString() || '',
      nofollow: prospect.nofollow,
      contactedOn: prospect.contactedOn?.split('T')[0] || '',
      contactMethod: prospect.contactMethod || '',
      contactEmail: prospect.contactEmail || '',
      contactFormUrl: prospect.contactFormUrl || '',
      remarks: prospect.remarks || '',
      content: prospect.content || '',
      status: prospect.status,
      source: prospect.source || 'manual'
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingProspect(null)
    setFormData({
      referringPageUrl: '',
      rootDomain: '',
      domainRating: '',
      domainTraffic: '',
      nofollow: false,
      contactedOn: '',
      contactMethod: '',
      contactEmail: '',
      contactFormUrl: '',
      remarks: '',
      content: '',
      status: 'NOT_CONTACTED',
      source: 'manual'
    })
  }

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url)
      setFormData(prev => ({ ...prev, rootDomain: parsed.hostname }))
    } catch {
      // Invalid URL
    }
  }

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status
  }

  const filteredProspects = prospects.filter(p =>
    p.referringPageUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rootDomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Stats
  const stats = {
    total: prospects.length,
    notContacted: prospects.filter(p => p.status === 'NOT_CONTACTED').length,
    contacted: prospects.filter(p => ['CONTACTED', 'RESPONDED', 'NEGOTIATING'].includes(p.status)).length,
    locked: prospects.filter(p => p.status === 'DEAL_LOCKED').length,
    rejected: prospects.filter(p => ['REJECTED', 'NO_RESPONSE'].includes(p.status)).length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backlink Prospects</h1>
              <p className="text-gray-600 mt-1">Manage and track your outreach efforts</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Prospect
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Not Contacted</div>
            <div className="text-2xl font-semibold text-gray-500">{stats.notContacted}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">In Progress</div>
            <div className="text-2xl font-semibold text-blue-600">{stats.contacted}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Deal Locked</div>
            <div className="text-2xl font-semibold text-green-600">{stats.locked}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Rejected/No Response</div>
            <div className="text-2xl font-semibold text-red-600">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by URL, domain, or email..."
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
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No prospects found
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map(prospect => (
                    <tr key={prospect.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{prospect.rootDomain}</div>
                          <a
                            href={prospect.referringPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                          >
                            {prospect.referringPageUrl}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`font-medium ${prospect.domainRating && prospect.domainRating >= 50 ? 'text-green-600' : 'text-gray-900'}`}>
                          {prospect.domainRating || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prospect.domainTraffic ? prospect.domainTraffic.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prospect.status)}`}>
                          {getStatusLabel(prospect.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prospect.contactedOn ? new Date(prospect.contactedOn).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prospect.contactMethod?.replace('_', ' ') || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {prospect.brandDeals.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {prospect.brandDeals.map(deal => (
                              <span key={deal.id} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                {deal.brand.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(prospect)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(prospect.id)}
                            className="text-red-600 hover:text-red-900"
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
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingProspect ? 'Edit Prospect' : 'Add Prospect'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referring Page URL *
                  </label>
                  <input
                    type="url"
                    value={formData.referringPageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, referringPageUrl: e.target.value })
                      extractDomain(e.target.value)
                    }}
                    className="input-field"
                    required
                    placeholder="https://example.com/page"
                  />
                </div>

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
                    placeholder="example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
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
                    placeholder="Notes about this prospect..."
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
                    <span className="ml-2 text-sm text-gray-700">Nofollow Link</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProspect ? 'Update' : 'Add'} Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
