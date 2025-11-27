'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function UploadRankingsPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string
  const appId = params.appId as string

  const [appName, setAppName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadResult, setUploadResult] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [brandId, appId])

  const fetchData = async () => {
    try {
      // Fetch brand details
      const brandResponse = await fetch('/api/brands')
      if (brandResponse.ok) {
        const brands = await brandResponse.json()
        const brand = brands.find((b: any) => b.id === brandId)
        if (brand) {
          setBrandName(brand.name)
        }
      }

      // Fetch app details
      const appsResponse = await fetch(`/api/apps?brandId=${brandId}`)
      if (appsResponse.ok) {
        const apps = await appsResponse.json()
        const app = apps.find((a: any) => a.id === appId)
        if (app) {
          setAppName(app.name)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('appId', appId)

      const response = await fetch('/api/app-rankings/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadResult(result)
      setSuccess(`Successfully processed ${result.processed} keyword rankings`)
      setFile(null)

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

      setTimeout(() => {
        router.push(`/brands/${brandId}/apps/${appId}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Rankings CSV</h1>
              <p className="text-gray-600 mt-1">
                Update daily keyword rankings for {appName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Rankings CSV</h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-1">
                📊 CSV Format Instructions
              </p>
              <p className="text-xs text-blue-600 mb-2">
                Upload a CSV file with your daily keyword rankings for <span className="font-semibold">{appName}</span>
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

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {success}
                {uploadResult && (
                  <div className="mt-2 text-sm">
                    <p>Created: {uploadResult.created} new records</p>
                    <p>Updated: {uploadResult.updated} existing records</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV file up to 10MB</p>
                    {file && (
                      <p className="text-sm font-medium text-primary-600 mt-2">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isUploading || !file}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Rankings'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
