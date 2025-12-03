'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LinkIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { getFaviconUrl } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  domain?: string | null
  description?: string
  _count: {
    apps: number
    keywords: number
    backlinks: number
    articles: number
  }
}

export default function BrandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string

  const [brand, setBrand] = useState<Brand | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBrand()
  }, [brandId])

  const fetchBrand = async () => {
    try {
      const response = await fetch('/api/brands')
      if (response.ok) {
        const brands = await response.json()
        const currentBrand = brands.find((b: Brand) => b.id === brandId)
        setBrand(currentBrand || null)
      }
    } catch (error) {
      console.error('Error:', error)
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

  if (!brand) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="empty-state py-12">
            <BuildingOfficeIcon className="empty-state-icon" />
            <p className="empty-state-title">Brand not found</p>
            <Link href="/brands" className="btn-primary mt-4">
              Back to Brands
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const sections = [
    {
      title: 'Organic SEO',
      description: 'Track website keyword rankings and organic search performance',
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      count: brand._count.keywords,
      countLabel: 'keywords tracked',
      href: `/brands/${brandId}/keywords/new`,
      actionLabel: 'Manage Keywords'
    },
    {
      title: 'Backlinks',
      description: 'Track acquired backlinks, DR, pricing and link details',
      icon: LinkIcon,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      count: brand._count.backlinks,
      countLabel: 'backlinks',
      href: `/brands/${brandId}/backlinks`,
      actionLabel: 'Manage Backlinks'
    },
    {
      title: 'Content',
      description: 'Manage articles, track writing progress and publishing status',
      icon: DocumentTextIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      count: brand._count.articles,
      countLabel: 'articles',
      href: `/brands/${brandId}/articles`,
      actionLabel: 'Manage Articles'
    },
    {
      title: 'App Store (ASO)',
      description: 'Track app keyword rankings across iOS and Android stores',
      icon: DevicePhoneMobileIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      count: brand._count.apps,
      countLabel: 'apps',
      href: `/brands/${brandId}/apps/new`,
      actionLabel: 'Manage Apps'
    },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/brands')}
              className="action-btn"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            {brand.domain ? (
              <img
                src={getFaviconUrl(brand.domain, 40)}
                alt=""
                width={40}
                height={40}
                className="rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="page-title">{brand.name}</h1>
              {brand.domain && (
                <p className="text-sm text-muted-foreground">{brand.domain}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="stat-value">{brand._count.keywords}</div>
            <div className="stat-label">Keywords</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{brand._count.backlinks}</div>
            <div className="stat-label">Backlinks</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{brand._count.articles}</div>
            <div className="stat-label">Articles</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{brand._count.apps}</div>
            <div className="stat-label">Apps</div>
          </div>
        </div>

        {/* Sections */}
        <div className="grid gap-4">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="card p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`${section.bgColor} p-3 rounded-lg`}>
                    <section.icon className={`h-6 w-6 ${section.color}`} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-2">
                      {section.count} {section.countLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {section.actionLabel}
                  <ArrowRightIcon className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
