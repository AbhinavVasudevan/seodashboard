'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getCountryFlag } from '@/lib/utils'

export default function AddAppKeywordsPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string
  const appId = params.appId as string

  const [appName, setAppName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [country, setCountry] = useState('US')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const keywordList = keywords
        .split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywordList.length === 0) {
        throw new Error('Please enter at least one keyword')
      }

      const promises = keywordList.map(keyword =>
        fetch('/api/keywords', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            keyword,
            country,
            appId,
          }),
        })
      )

      const responses = await Promise.all(promises)
      const hasError = responses.some(response => !response.ok)

      if (hasError) {
        throw new Error('Some keywords failed to add')
      }

      setSuccess(`Successfully added ${keywordList.length} keyword(s)`)
      setKeywords('')

      setTimeout(() => {
        router.push(`/brands/${brandId}/apps/${appId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
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
              <h1 className="text-3xl font-bold text-gray-900">Add ASO Keywords</h1>
              <p className="text-gray-600 mt-1">
                Track app store keyword rankings for {appName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add ASO Keywords</h2>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-1">
                📱 App Store Optimization (ASO) Tracking
              </p>
              <p className="text-sm text-blue-700">
                Adding keywords for: <span className="font-semibold">{appName}</span> ({brandName})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                These keywords will track your app's rankings in the {country} app store. Upload daily CSV files to update rankings.
              </p>
            </div>

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
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
                  ASO Keywords *
                </label>
                <textarea
                  id="keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="input-field"
                  rows={8}
                  placeholder="Example:
casino game
slots free
poker app
blackjack online"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter one keyword per line. These will be tracked in your daily CSV uploads.
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
                  <option value="US">{getCountryFlag('US')} United States</option>
                  <option value="GB">{getCountryFlag('GB')} United Kingdom</option>
                  <option value="CA">{getCountryFlag('CA')} Canada</option>
                  <option value="AU">{getCountryFlag('AU')} Australia</option>
                  <option value="IE">{getCountryFlag('IE')} Ireland</option>
                  <option value="DE">{getCountryFlag('DE')} Germany</option>
                  <option value="FR">{getCountryFlag('FR')} France</option>
                  <option value="IT">{getCountryFlag('IT')} Italy</option>
                  <option value="ES">{getCountryFlag('ES')} Spain</option>
                  <option value="NL">{getCountryFlag('NL')} Netherlands</option>
                  <option value="SE">{getCountryFlag('SE')} Sweden</option>
                  <option value="NO">{getCountryFlag('NO')} Norway</option>
                  <option value="FI">{getCountryFlag('FI')} Finland</option>
                  <option value="DK">{getCountryFlag('DK')} Denmark</option>
                  <option value="IN">{getCountryFlag('IN')} India</option>
                  <option value="JP">{getCountryFlag('JP')} Japan</option>
                  <option value="SG">{getCountryFlag('SG')} Singapore</option>
                  <option value="MY">{getCountryFlag('MY')} Malaysia</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading || !keywords.trim()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Adding Keywords...' : 'Add ASO Keywords'}
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
