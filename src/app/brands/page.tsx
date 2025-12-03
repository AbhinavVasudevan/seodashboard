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
      <div className="page-container">
        <div className="page-content">
          <div className="flex items-center justify-center py-12">
            <div className="spinner-lg text-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Brands</h1>
              <p className="text-sm text-muted-foreground">{brands.length} brands total</p>
            </div>
          </div>
          <Link href="/brands/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Brand
          </Link>
        </div>

        {/* Brands Grid */}
        {brands.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <BuildingOfficeIcon className="empty-state-icon" />
              <p className="empty-state-title">No brands found</p>
              <p className="empty-state-description">Get started by adding your first brand</p>
              <Link href="/brands/new" className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Add Your First Brand
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid-cards">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-3 mb-3">
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
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{brand.name}</h3>
                      {brand.domain && (
                        <p className="text-xs text-primary truncate">{brand.domain}</p>
                      )}
                    </div>
                  </div>

                  {brand.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{brand.description}</p>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center border-t border-border pt-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{brand._count.apps}</p>
                      <p className="text-xs text-muted-foreground">Apps</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{brand._count.keywords}</p>
                      <p className="text-xs text-muted-foreground">Keywords</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{brand._count.backlinks}</p>
                      <p className="text-xs text-muted-foreground">Links</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{brand._count.articles}</p>
                      <p className="text-xs text-muted-foreground">Articles</p>
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
