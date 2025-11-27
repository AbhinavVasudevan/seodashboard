'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AppFormProps {
  brandId: string
  brandName?: string
}

export default function AppForm({ brandId, brandName }: AppFormProps) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState<'ANDROID' | 'IOS'>('ANDROID')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          platform,
          brandId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create app')
      }

      const app = await response.json()
      router.push(`/brands/${brandId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New App</h2>
        
        {brandName && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Creating app for: <span className="font-semibold text-gray-900">{brandName}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              App Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Enter app name"
              required
            />
          </div>

          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
              Platform *
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'ANDROID' | 'IOS')}
              className="input-field"
              required
            >
              <option value="ANDROID">Android</option>
              <option value="IOS">iOS</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !name}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create App'}
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
