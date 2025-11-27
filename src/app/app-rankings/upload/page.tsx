'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CloudArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface App {
  id: string
  name: string
  platform: string
  brand: {
    id: string
    name: string
  }
}

interface UploadStatus {
  status: 'pending' | 'uploading' | 'success' | 'failed'
  message?: string
  file?: File
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [apps, setApps] = useState<App[]>([])
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({})
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps')
      const data = await response.json()

      // Sort apps: Android first, then iOS, then by name
      const sortedApps = data.sort((a: App, b: App) => {
        // Android comes before iOS
        if (a.platform === 'ANDROID' && b.platform === 'IOS') return -1
        if (a.platform === 'IOS' && b.platform === 'ANDROID') return 1
        // Same platform - sort by name
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

    const uploadPromises = appsToUpload.map(app => uploadSingleApp(app.id))

    await Promise.all(uploadPromises)

    setIsUploading(false)
  }

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'uploading':
        return <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
      default:
        return null
    }
  }

  const pendingCount = Object.values(uploadStatuses).filter(s => s.file && s.status === 'pending').length
  const successCount = Object.values(uploadStatuses).filter(s => s.status === 'success').length
  const failedCount = Object.values(uploadStatuses).filter(s => s.status === 'failed').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Rankings</h1>
                <p className="text-gray-600 mt-1">
                  Upload CSV files for multiple apps at once
                </p>
              </div>
            </div>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              Upload All ({pendingCount})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {successCount > 0 || failedCount > 0 ? (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Upload Summary: {successCount} successful, {failedCount} failed, {pendingCount} pending
            </p>
          </div>
        ) : null}

        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSV File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apps.map((app) => {
                  const status = uploadStatuses[app.id] || { status: 'pending' }

                  return (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {app.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          app.platform === 'ANDROID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {app.platform === 'ANDROID' ? 'Play Store' : 'App Store'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.brand.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="file"
                          accept=".csv,.txt,.tsv"
                          onChange={(e) => handleFileSelect(app.id, e.target.files?.[0] || null)}
                          disabled={isUploading}
                          className="text-xs"
                        />
                        {status.file && (
                          <p className="text-xs text-gray-400 mt-1">{status.file.name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status.status)}
                          {status.message && (
                            <span className={`text-xs ${
                              status.status === 'success' ? 'text-green-600' :
                              status.status === 'failed' ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {status.message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium mb-2">
            CSV Format Instructions
          </p>
          <p className="text-xs text-blue-600 mb-2">
            Each CSV file should contain rankings for one app with the following format:
          </p>
          <div className="text-xs text-blue-600">
            <p className="font-medium mb-1">Required columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Keyword, Country, Rank (minimum required)</li>
              <li>Optional: Score, Traffic, Date</li>
            </ul>
            <p className="mt-2 font-medium">Example format:</p>
            <code className="block mt-1 p-2 bg-white rounded text-[10px]">
              casino game,US,15,85,1200<br/>
              poker app,US,23,72,850
            </code>
          </div>
        </div>
      </main>
    </div>
  )
}
