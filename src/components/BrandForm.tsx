'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BrandForm() {
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          domain: domain || undefined,
          description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create brand')
      }

      await response.json()
      router.push('/')
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Brand</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Enter brand name"
              required
            />
          </div>

          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain
            </label>
            <input
              type="text"
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="input-field"
              placeholder="e.g. example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the main domain for this brand (without https://)
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Enter brand description (optional)"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !name}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Brand'}
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
