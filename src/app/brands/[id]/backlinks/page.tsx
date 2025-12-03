'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  LinkIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface Backlink {
  id: string
  rootDomain: string
  referringPageUrl: string
  referringPageTitle: string | null
  dr: number | null
  ur: number | null
  domainTraffic: number | null
  targetUrl: string
  anchor: string | null
  linkType: string | null
  content: string | null
  platform: string | null
  firstSeen: string | null
  lastSeen: string | null
  price: number | null
  remarks: string | null
  createdAt: string
}

interface Brand {
  id: string
  name: string
  domain: string | null
}

function extractRootDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    const parts = hostname.split('.')
    const multiPartTLDs = ['co.uk', 'com.au', 'com.br', 'co.nz', 'co.za', 'com.mx', 'co.jp', 'co.kr', 'co.in']
    const lastTwo = parts.slice(-2).join('.')
    if (multiPartTLDs.includes(lastTwo) && parts.length > 2) {
      return parts.slice(-3).join('.')
    }
    if (parts.length > 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  } catch {
    return url
  }
}

export default function BrandBacklinksPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBacklink, setEditingBacklink] = useState<Backlink | null>(null)
  const [formData, setFormData] = useState({
    referringPageUrl: '',
    targetUrl: '',
    anchor: '',
    linkType: 'dofollow',
    dr: '',
    price: '',
    remarks: ''
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [csvData, setCsvData] = useState<Array<Record<string, string>>>([])
  const [isUploading, setIsUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [avgDR, setAvgDR] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const limit = 50

  useEffect(() => {
    fetchBrand()
  }, [resolvedParams.id])

  useEffect(() => {
    fetchBacklinks()
  }, [resolvedParams.id, page])

  const fetchBrand = async () => {
    try {
      const response = await fetch(`/api/brands/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setBrand(data)
      }
    } catch (error) {
      console.error('Error fetching brand:', error)
    }
  }

  const fetchBacklinks = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/brands/${resolvedParams.id}/backlinks?page=${page}&limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setBacklinks(data.backlinks)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setAvgDR(data.avgDR)
        setTotalSpent(data.totalSpent)
      }
    } catch (error) {
      console.error('Error fetching backlinks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingBacklink(null)
    setFormData({
      referringPageUrl: '',
      targetUrl: brand?.domain ? `https://${brand.domain}` : '',
      anchor: '',
      linkType: 'dofollow',
      dr: '',
      price: '',
      remarks: ''
    })
    setShowModal(true)
  }

  const handleEdit = (backlink: Backlink) => {
    setEditingBacklink(backlink)
    setFormData({
      referringPageUrl: backlink.referringPageUrl,
      targetUrl: backlink.targetUrl,
      anchor: backlink.anchor || '',
      linkType: backlink.linkType || 'dofollow',
      dr: backlink.dr?.toString() || '',
      price: backlink.price?.toString() || '',
      remarks: backlink.remarks || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      const rootDomain = extractRootDomain(formData.referringPageUrl)
      const payload = {
        ...formData,
        rootDomain,
        dr: formData.dr ? parseInt(formData.dr) : null,
        price: formData.price ? parseFloat(formData.price) : null
      }

      const url = `/api/brands/${resolvedParams.id}/backlinks`
      const method = editingBacklink ? 'PUT' : 'POST'
      const body = editingBacklink ? { id: editingBacklink.id, ...payload } : payload

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowModal(false)
        fetchBacklinks()
        toast.success(editingBacklink ? 'Backlink updated' : 'Backlink added')
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to save backlink')
      }
    } catch (error) {
      console.error('Error saving backlink:', error)
      toast.error('Failed to save backlink')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backlink?')) return

    try {
      const response = await fetch(`/api/brands/${resolvedParams.id}/backlinks?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchBacklinks()
        toast.success('Backlink deleted')
      }
    } catch (error) {
      console.error('Error deleting backlink:', error)
    }
  }

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : ','
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const rows: Array<Record<string, string>> = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }
    return rows
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setCsvData(parsed)
    }
    reader.readAsText(file)
  }

  const handleBulkImport = async () => {
    if (csvData.length === 0) return
    setIsUploading(true)
    let successCount = 0
    let errorCount = 0

    for (const row of csvData) {
      try {
        const referringPageUrl = row['referring page url'] || ''
        const targetUrl = row['target url'] || ''
        if (!referringPageUrl || !targetUrl) {
          errorCount++
          continue
        }
        const rootDomain = extractRootDomain(referringPageUrl)
        const referringPageTitle = row['referring page title'] || null
        const dr = row['domain rating'] || ''
        const ur = row['ur'] || ''
        const domainTraffic = row['domain traffic'] || ''
        const anchor = row['anchor'] || ''
        const isTruthy = (val: string | undefined) => {
          const v = val?.toString().trim().toLowerCase()
          return v === 'true' || v === '1' || v === 'yes'
        }
        let linkType = 'Dofollow'
        if (isTruthy(row['sponsored'])) linkType = 'Sponsored'
        else if (isTruthy(row['ugc'])) linkType = 'UGC'
        else if (isTruthy(row['nofollow'])) linkType = 'Nofollow'
        const content = row['content'] || null
        const platform = row['platform'] || null
        const firstSeen = row['first seen'] || null
        const lastSeen = row['last seen'] || null
        const price = row['price'] || ''
        const remarks = row['remarks'] || null

        const response = await fetch(`/api/brands/${resolvedParams.id}/backlinks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referringPageUrl,
            referringPageTitle,
            targetUrl,
            rootDomain,
            dr: dr ? parseInt(dr) : null,
            ur: ur ? parseInt(ur) : null,
            domainTraffic: domainTraffic ? parseInt(domainTraffic.replace(/,/g, '')) : null,
            anchor: anchor || null,
            linkType,
            content,
            platform,
            firstSeen,
            lastSeen,
            price: price ? parseFloat(price.replace(/[$,]/g, '')) : null,
            remarks
          })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }

    setIsUploading(false)
    setShowUploadModal(false)
    setCsvData([])
    setPage(1)
    fetchBacklinks()

    if (successCount > 0) {
      toast.success(`Imported ${successCount} backlinks successfully`)
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} rows`)
    }
  }

  const downloadTemplate = () => {
    const csvContent = 'DR,Referring Page URL,Link URL,Anchor,Type,Price,Remarks\n50,https://example.com/article,https://yourbrand.com/page,Click Here,dofollow,100,Sample backlink'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backlinks-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLinkTypeBadge = (type: string | null) => {
    const t = type?.toLowerCase()
    if (t === 'dofollow') return 'badge-success'
    if (t === 'nofollow') return 'badge-gray'
    if (t === 'sponsored') return 'badge-purple'
    if (t === 'ugc') return 'badge-warning'
    return 'badge-info'
  }

  const getDRColor = (dr: number | null) => {
    if (!dr) return 'text-muted-foreground'
    if (dr >= 50) return 'text-green-600 font-semibold'
    if (dr >= 30) return 'text-amber-600 font-medium'
    return 'text-muted-foreground'
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="page-content py-4">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/brands/${resolvedParams.id}`}
              className="action-btn"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="p-2 bg-primary/10 rounded-lg">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="page-title">{brand?.name} - Backlinks</h1>
              <p className="text-sm text-muted-foreground">Manage backlinks for this brand</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value text-foreground">{total.toLocaleString()}</div>
            <div className="stat-label">Total Backlinks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-primary">{avgDR}</div>
            <div className="stat-label">Avg. Domain Rating</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-green-600">${totalSpent.toLocaleString()}</div>
            <div className="stat-label">Total Spent</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-secondary"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Upload CSV
          </button>
          <button onClick={handleAdd} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Backlink
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : backlinks.length === 0 ? (
            <div className="empty-state">
              <LinkIcon className="empty-state-icon" />
              <p className="empty-state-title">No backlinks yet</p>
              <p className="empty-state-description">Click &quot;Add Backlink&quot; to get started</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper scrollbar-thin">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Root Domain</th>
                      <th>DR</th>
                      <th>UR</th>
                      <th>Traffic</th>
                      <th>Referring Page URL</th>
                      <th>Target URL</th>
                      <th>Anchor</th>
                      <th>Type</th>
                      <th>Content</th>
                      <th>First Seen</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {backlinks.map(backlink => (
                      <tr key={backlink.id}>
                        <td className="cell-primary whitespace-nowrap">
                          {backlink.rootDomain}
                        </td>
                        <td className={`whitespace-nowrap ${getDRColor(backlink.dr)}`}>
                          {backlink.dr || '-'}
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {backlink.ur || '-'}
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {backlink.domainTraffic ? backlink.domainTraffic.toLocaleString() : '-'}
                        </td>
                        <td className="cell-truncate">
                          <a
                            href={backlink.referringPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-external"
                            title={`${backlink.referringPageTitle || ''}\n${backlink.referringPageUrl}`}
                          >
                            {backlink.referringPageUrl.replace(/^https?:\/\//, '').slice(0, 35)}...
                          </a>
                        </td>
                        <td className="cell-truncate">
                          <a
                            href={backlink.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-external"
                            title={backlink.targetUrl}
                          >
                            {backlink.targetUrl.replace(/^https?:\/\//, '').slice(0, 30)}...
                          </a>
                        </td>
                        <td className="cell-truncate cell-secondary" title={backlink.anchor || ''}>
                          {backlink.anchor || '-'}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={getLinkTypeBadge(backlink.linkType)}>
                            {backlink.linkType || '-'}
                          </span>
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
                          {backlink.content || '-'}
                        </td>
                        <td className="cell-secondary text-xs whitespace-nowrap">
                          {backlink.firstSeen || '-'}
                        </td>
                        <td className="cell-secondary whitespace-nowrap">
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <div className="pagination-info">
                    Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
                  </div>
                  <div className="pagination-controls">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBacklink ? 'Edit Backlink' : 'Add New Backlink'}
              </h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="input-label">Referring Page URL *</label>
                  <input
                    type="url"
                    value={formData.referringPageUrl}
                    onChange={(e) => setFormData({...formData, referringPageUrl: e.target.value})}
                    className="input-field"
                    placeholder="https://example.com/page"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="input-label">Link URL (Target) *</label>
                  <input
                    type="url"
                    value={formData.targetUrl}
                    onChange={(e) => setFormData({...formData, targetUrl: e.target.value})}
                    className="input-field"
                    placeholder="https://yourbrand.com/page"
                  />
                </div>
                <div>
                  <label className="input-label">Link Anchor</label>
                  <input
                    type="text"
                    value={formData.anchor}
                    onChange={(e) => setFormData({...formData, anchor: e.target.value})}
                    className="input-field"
                    placeholder="Click here"
                  />
                </div>
                <div>
                  <label className="input-label">Type</label>
                  <select
                    value={formData.linkType}
                    onChange={(e) => setFormData({...formData, linkType: e.target.value})}
                    className="input-field"
                  >
                    <option value="dofollow">Dofollow</option>
                    <option value="nofollow">Nofollow</option>
                    <option value="sponsored">Sponsored</option>
                    <option value="ugc">UGC</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Domain Rating (DR)</label>
                  <input
                    type="number"
                    value={formData.dr}
                    onChange={(e) => setFormData({...formData, dr: e.target.value})}
                    className="input-field"
                    min="0"
                    max="100"
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <label className="input-label">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="input-field"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="input-label">Remarks</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="input-field"
                    rows={3}
                    placeholder="Any notes about this backlink..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={!formData.referringPageUrl || !formData.targetUrl}
              >
                {editingBacklink ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="modal-header">
              <h3 className="modal-title">Upload Backlinks CSV</h3>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with your backlinks data
                </p>
                <button
                  onClick={downloadTemplate}
                  className="btn-link text-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download Template
                </button>
              </div>

              <div className="file-upload-zone">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                  <ArrowUpTrayIcon className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to select CSV/TSV file
                  </span>
                  <span className="text-xs text-muted-foreground/70 mt-1">
                    Supports Ahrefs exports (Referring Page URL, Target URL, Domain Rating, Anchor, etc.)
                  </span>
                </label>
              </div>

              {csvData.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Preview ({csvData.length} rows)
                  </p>
                  <div className="table-container max-h-64 overflow-y-auto scrollbar-thin">
                    <table className="data-table text-xs">
                      <thead className="sticky top-0">
                        <tr>
                          {Object.keys(csvData[0]).slice(0, 5).map(key => (
                            <th key={key}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).slice(0, 5).map((val, j) => (
                              <td key={j} className="cell-truncate">{val}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ...and {csvData.length - 5} more rows
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setCsvData([])
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="btn-primary"
                disabled={csvData.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-sm"></span>
                    Importing...
                  </>
                ) : (
                  `Import ${csvData.length} Backlinks`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
