'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { getFaviconUrl } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  domain?: string
  description?: string
  createdAt: string
  _count: {
    apps: number
    keywords: number
    backlinks: number
    articles: number
  }
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands')
      if (!response.ok) throw new Error('Failed to fetch brands')
      const data = await response.json()
      setBrands(data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading brands...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
              <p className="text-sm text-gray-500">{brands.length} brands total</p>
            </div>
          </div>
          <Link
            href="/brands/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Brand
          </Link>
        </div>

        {/* Brands Grid */}
        {brands.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No brands found</p>
            <Link
              href="/brands/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Add Your First Brand
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-3 mb-4">
                    {brand.domain ? (
                      <img
                        src={getFaviconUrl(brand.domain, 32)}
                        alt={`${brand.name} favicon`}
                        width={32}
                        height={32}
                        className="rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{brand.name}</h3>
                      {brand.domain && (
                        <p className="text-xs text-primary-600 truncate">{brand.domain}</p>
                      )}
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{brand.description}</p>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center border-t border-gray-100 pt-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{brand._count.apps}</p>
                      <p className="text-xs text-gray-500">Apps</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{brand._count.keywords}</p>
                      <p className="text-xs text-gray-500">Keywords</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{brand._count.backlinks}</p>
                      <p className="text-xs text-gray-500">Links</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{brand._count.articles}</p>
                      <p className="text-xs text-gray-500">Articles</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
