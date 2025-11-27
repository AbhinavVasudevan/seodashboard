'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface KeywordFormProps {
  brandId: string
  brandName?: string
}

export default function KeywordForm({ brandId, brandName }: KeywordFormProps) {
  const [keywords, setKeywords] = useState('')
  const [country, setCountry] = useState('US')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Split keywords by line and filter out empty lines
      const keywordList = keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywordList.length === 0) {
        throw new Error('Please enter at least one keyword')
      }

      // Create keywords one by one
      const promises = keywordList.map(keyword =>
        fetch('/api/keywords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword,
            country: country.toUpperCase(),
            brandId,
          }),
        })
      )

      const responses = await Promise.all(promises)
      
      // Check if all responses were successful
      const hasError = responses.some(response => !response.ok)
      if (hasError) {
        throw new Error('Some keywords failed to be created')
      }

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Organic SEO Keywords</h2>

        {brandName && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-1">
              📊 Organic Website SEO Tracking
            </p>
            <p className="text-sm text-blue-700">
              Adding keywords for: <span className="font-semibold">{brandName}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              These keywords will track your website's organic search rankings on Google and other search engines.
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
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
              Organic Keywords *
            </label>
            <textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="input-field"
              rows={8}
              placeholder="Example:
best online casino
casino bonuses
online slots
live casino games"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter one keyword per line. Add keywords you want to track for organic search rankings.
            </p>
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input-field"
              required
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="IE">Ireland</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="NL">Netherlands</option>
              <option value="SE">Sweden</option>
              <option value="NO">Norway</option>
              <option value="FI">Finland</option>
              <option value="DK">Denmark</option>
              <option value="IN">India</option>
              <option value="JP">Japan</option>
              <option value="SG">Singapore</option>
              <option value="MY">Malaysia</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !keywords.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding Keywords...' : 'Add Organic Keywords'}
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
