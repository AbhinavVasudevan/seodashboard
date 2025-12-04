'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface App {
  id: string
  name: string
  platform: string
  brand: {
    id: string
    name: string
  }
  _count: {
    rankings: number
  }
  uniqueKeywordCount: number
  lastRankingDate: string | null
}

interface UploadStatus {
  status: 'pending' | 'uploading' | 'success' | 'failed'
  message?: string
  file?: File
}

type FilterTab = 'all' | 'with-data' | 'no-data' | 'selected'

export default function BulkUploadPage() {
  const router = useRouter()
  const [apps, setApps] = useState<App[]>([])
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [dragOverAppId, setDragOverAppId] = useState<string | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const dragCounter = useState({ count: 0 })[0]

  useEffect(() => {
    fetchApps()
  }, [])

  // Global drag events for smoother experience
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.count++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingFile(true)
      }
    }

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.count--
      if (dragCounter.count === 0) {
        setIsDraggingFile(false)
        setDragOverAppId(null)
      }
    }

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.count = 0
      setIsDraggingFile(false)
      setDragOverAppId(null)
    }

    window.addEventListener('dragenter', handleWindowDragEnter)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('drop', handleWindowDrop)

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [dragCounter])

  const fetchApps = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/apps')
      const data = await response.json()

      // Sort apps: Android first, then iOS, then by name
      const sortedApps = data.sort((a: App, b: App) => {
        if (a.platform === 'ANDROID' && b.platform === 'IOS') return -1
        if (a.platform === 'IOS' && b.platform === 'ANDROID') return 1
        return a.name.localeCompare(b.name)
      })

      setApps(sortedApps)

      const initialStatuses: Record<string, UploadStatus> = {}
      sortedApps.forEach((app: App) => {
        initialStatuses[app.id] = { status: 'pending' }
      })
      setUploadStatuses(initialStatuses)
    } catch (error) {
      console.error('Error fetching apps:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (appId: string, file: File | null) => {
    setUploadStatuses(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        file: file || undefined,
        status: 'pending',
        message: undefined,
      }
    }))
  }

  const handleDragEnter = useCallback((e: React.DragEvent, appId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverAppId(appId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, appId: string) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear if we're actually leaving the row (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (!currentTarget.contains(relatedTarget)) {
      if (dragOverAppId === appId) {
        setDragOverAppId(null)
      }
    }
  }, [dragOverAppId])

  const handleDrop = useCallback((e: React.DragEvent, appId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverAppId(null)
    setIsDraggingFile(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
        handleFileSelect(appId, file)
      }
    }
  }, [])

  const clearFile = (appId: string) => {
    setUploadStatuses(prev => ({
      ...prev,
      [appId]: { status: 'pending' }
    }))
  }

  const clearAllFiles = () => {
    const clearedStatuses: Record<string, UploadStatus> = {}
    apps.forEach(app => {
      clearedStatuses[app.id] = { status: 'pending' }
    })
    setUploadStatuses(clearedStatuses)
  }

  const uploadSingleApp = async (appId: string): Promise<void> => {
    const status = uploadStatuses[appId]

    if (!status.file) {
      return
    }

    setUploadStatuses(prev => ({
      ...prev,
      [appId]: { ...prev[appId], status: 'uploading' }
    }))

    try {
      const formData = new FormData()
      formData.append('file', status.file)
      formData.append('appId', appId)

      const response = await fetch('/api/app-rankings/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadStatuses(prev => ({
          ...prev,
          [appId]: {
            ...prev[appId],
            status: 'success',
            message: result.message || `Processed ${result.processed} rankings`
          }
        }))
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      setUploadStatuses(prev => ({
        ...prev,
        [appId]: {
          ...prev[appId],
          status: 'failed',
          message: error instanceof Error ? error.message : 'Upload failed'
        }
      }))
    }
  }

  const handleUploadAll = async () => {
    setIsUploading(true)

    const appsToUpload = apps.filter(app => uploadStatuses[app.id]?.file)

    for (const app of appsToUpload) {
      await uploadSingleApp(app.id)
    }

    setIsUploading(false)
    // Refresh app data to get updated counts
    await fetchApps()
  }

  const filteredApps = useMemo(() => {
    let filtered = apps

    // Apply tab filter
    switch (activeTab) {
      case 'with-data':
        filtered = filtered.filter(app => app._count.rankings > 0)
        break
      case 'no-data':
        filtered = filtered.filter(app => app._count.rankings === 0)
        break
      case 'selected':
        filtered = filtered.filter(app => uploadStatuses[app.id]?.file)
        break
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.brand.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [apps, activeTab, searchQuery, uploadStatuses])

  const pendingCount = Object.values(uploadStatuses).filter(s => s.file && s.status === 'pending').length
  const successCount = Object.values(uploadStatuses).filter(s => s.status === 'success').length
  const failedCount = Object.values(uploadStatuses).filter(s => s.status === 'failed').length
  const uploadingCount = Object.values(uploadStatuses).filter(s => s.status === 'uploading').length
  const selectedCount = Object.values(uploadStatuses).filter(s => s.file).length

  const appsWithData = apps.filter(app => app._count.rankings > 0).length
  const appsWithoutData = apps.filter(app => app._count.rankings === 0).length

  const uploadProgress = selectedCount > 0
    ? Math.round(((successCount + failedCount) / selectedCount) * 100)
    : 0

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 relative">
      {/* Global drag indicator */}
      {isDraggingFile && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-start justify-center pt-20">
          <div className="bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <CloudArrowUpIcon className="h-5 w-5" />
            <span className="font-medium">Drop CSV on any app row</span>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk Upload Rankings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload CSV files for multiple apps at once
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCount > 0 && (
                <button
                  onClick={clearAllFiles}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={handleUploadAll}
                disabled={isUploading || pendingCount === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-5 w-5" />
                    Upload All ({pendingCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Apps</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{apps.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">With Data</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{appsWithData}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">No Data</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{appsWithoutData}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Selected</div>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{selectedCount}</div>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {successCount + failedCount} / {selectedCount} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Summary */}
        {(successCount > 0 || failedCount > 0) && !isUploading && (
          <div className={`mb-6 p-4 rounded-xl border ${
            failedCount > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-3">
              {failedCount > 0 ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Upload Complete: {successCount} successful
                {failedCount > 0 && <span className="text-red-600 dark:text-red-400">, {failedCount} failed</span>}
                {pendingCount > 0 && <span className="text-gray-500">, {pendingCount} pending</span>}
              </p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: apps.length },
                  { key: 'with-data', label: 'With Data', count: appsWithData },
                  { key: 'no-data', label: 'No Data', count: appsWithoutData },
                  { key: 'selected', label: 'Selected', count: selectedCount },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as FilterTab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.key
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Apps List */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-12">
                <DocumentIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No apps found</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">

                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      App
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      CSV File
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Upload Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredApps.map((app) => {
                    const status = uploadStatuses[app.id] || { status: 'pending' }
                    const hasData = app._count.rankings > 0
                    const isDragOver = dragOverAppId === app.id

                    return (
                      <tr
                        key={app.id}
                        onDragEnter={(e) => handleDragEnter(e, app.id)}
                        onDragOver={handleDragOver}
                        onDragLeave={(e) => handleDragLeave(e, app.id)}
                        onDrop={(e) => handleDrop(e, app.id)}
                        className={`transition-all duration-150 ease-in-out ${
                          isDragOver
                            ? 'bg-primary-100 dark:bg-primary-900/30 scale-[1.01] shadow-sm'
                            : status.file
                              ? 'bg-primary-50/50 dark:bg-primary-900/10'
                              : status.status === 'success'
                                ? 'bg-green-50/50 dark:bg-green-900/10'
                                : status.status === 'failed'
                                  ? 'bg-red-50/50 dark:bg-red-900/10'
                                  : hasData
                                    ? 'bg-white dark:bg-gray-800'
                                    : 'bg-orange-50/30 dark:bg-orange-900/5'
                        } ${isDraggingFile && !status.file ? 'cursor-copy' : ''}`}
                      >
                        {/* Data Indicator */}
                        <td className="px-4 py-3">
                          <div className={`w-2 h-2 rounded-full ${
                            hasData
                              ? 'bg-green-500'
                              : 'bg-orange-400'
                          }`} title={hasData ? 'Has data' : 'No data'} />
                        </td>

                        {/* App Info */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {app.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {app.brand.name}
                            </span>
                          </div>
                        </td>

                        {/* Platform */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            app.platform === 'ANDROID'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {app.platform === 'ANDROID' ? 'Android' : 'iOS'}
                          </span>
                        </td>

                        {/* Data Status */}
                        <td className="px-4 py-3">
                          {hasData ? (
                            <div className="flex flex-col text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {formatNumber(app._count.rankings)} rankings
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {formatNumber(app.uniqueKeywordCount)} keywords
                                </span>
                              </div>
                              {app.lastRankingDate && (
                                <span className="text-gray-400 dark:text-gray-500 mt-0.5">
                                  Updated {formatDate(app.lastRankingDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium">
                              <ExclamationTriangleIcon className="h-4 w-4" />
                              No data uploaded
                            </span>
                          )}
                        </td>

                        {/* File Upload */}
                        <td className="px-4 py-3">
                          {status.file ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg max-w-xs transition-all duration-150">
                              <DocumentArrowUpIcon className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                              <span className="text-sm text-primary-700 dark:text-primary-300 truncate">
                                {status.file.name}
                              </span>
                              {!isUploading && status.status === 'pending' && (
                                <button
                                  onClick={() => clearFile(app.id)}
                                  className="p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded ml-auto transition-colors"
                                >
                                  <XMarkIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 border-2 border-dashed ${
                              isDragOver
                                ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/30 scale-105'
                                : isDraggingFile
                                  ? 'border-primary-300 bg-primary-50/50 dark:bg-primary-900/10 dark:border-primary-700'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}>
                              <CloudArrowUpIcon className={`h-4 w-4 transition-colors duration-150 ${
                                isDragOver
                                  ? 'text-primary-600 dark:text-primary-400'
                                  : isDraggingFile
                                    ? 'text-primary-400 dark:text-primary-500'
                                    : 'text-gray-400'
                              }`} />
                              <span className={`text-xs transition-colors duration-150 ${
                                isDragOver
                                  ? 'text-primary-700 dark:text-primary-300 font-medium'
                                  : isDraggingFile
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {isDragOver ? 'Drop here!' : 'Drop or select CSV'}
                              </span>
                              <input
                                type="file"
                                accept=".csv,.txt,.tsv"
                                onChange={(e) => handleFileSelect(app.id, e.target.files?.[0] || null)}
                                disabled={isUploading}
                                className="hidden"
                              />
                            </label>
                          )}
                        </td>

                        {/* Upload Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {status.status === 'success' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="h-4 w-4" />
                                Success
                              </span>
                            )}
                            {status.status === 'failed' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                                <XCircleIcon className="h-4 w-4" />
                                Failed
                              </span>
                            )}
                            {status.status === 'uploading' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                Uploading...
                              </span>
                            )}
                            {status.status === 'pending' && status.file && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                Ready
                              </span>
                            )}
                            {status.message && (
                              <span className={`text-xs ${
                                status.status === 'success'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                ({status.message})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CSV Format Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-2">
            CSV Format Instructions
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
            Each CSV file should contain rankings for one app with the following format:
          </p>
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium mb-1">Required columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Keyword, Country, Rank (minimum required)</li>
              <li>Optional: Score, Traffic, Date</li>
            </ul>
            <p className="mt-2 font-medium">Example format:</p>
            <code className="block mt-1 p-2 bg-white dark:bg-gray-800 rounded text-[10px] border border-blue-200 dark:border-blue-700">
              casino game,US,15,85,1200<br/>
              poker app,US,23,72,850
            </code>
          </div>
        </div>
      </main>
    </div>
  )
}
