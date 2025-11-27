'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface AppRankingUploadProps {
  appId: string
  appName?: string
  brandName?: string
}

export default function AppRankingUpload({ appId, appName, brandName }: AppRankingUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
        setError('Please upload a CSV or TXT file')
        return
      }
      setFile(selectedFile)
      setError('')
      setSuccess('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!file) {
      setError('Please select a file to upload')
      setIsLoading(false)
      return
    }

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
        throw new Error(result.error || 'Failed to upload rankings')
      }

      setSuccess(result.message)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Keyword Rankings</h2>
        
        {appName && brandName && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Uploading rankings for: <span className="font-semibold text-gray-900">{appName}</span>
            </p>
            <p className="text-sm text-gray-600">
              Brand: <span className="font-semibold text-gray-900">{brandName}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              CSV File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                {file ? (
                  <div className="flex items-center justify-center space-x-2">
                    <DocumentTextIcon className="h-10 w-10 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="csv-file" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <span>Upload a file</span>
                        <input
                          id="csv-file"
                          name="csv-file"
                          type="file"
                          className="sr-only"
                          accept=".csv,.txt"
                          onChange={handleFileChange}
                          disabled={isLoading}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV or TXT up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Formats:</h4>
            <div className="text-xs text-blue-700 space-y-2">
              <div>
                <p className="font-medium">CSV Format:</p>
                <code className="bg-blue-100 px-1 rounded">Keyword, Country, Rank, Score, Traffic</code>
              </div>
              <div>
                <p className="font-medium">Space-Separated (when copying from CSV):</p>
                <code className="bg-blue-100 px-1 rounded">Keyword Country Rank Score Traffic</code>
              </div>
              <div>
                <p className="font-medium text-blue-600">Example Data:</p>
                <div className="bg-white p-2 rounded text-gray-700 font-mono text-xs">
                  betting, GB, 0, 61, 1274<br/>
                  betting apps, GB, 192, 45, 264<br/>
                  betting apps for real cash, GB, 0, 5, 0
                </div>
                <p className="text-blue-600 mt-1">OR (space-separated):</p>
                <div className="bg-white p-2 rounded text-gray-700 font-mono text-xs">
                  betting GB 0 61 1274<br/>
                  betting apps GB 192 45 264<br/>
                  betting apps for real cash GB 0 5 0
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !file}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Uploading...' : 'Upload Rankings'}
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
  )
}
