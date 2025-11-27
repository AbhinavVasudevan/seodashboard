'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import AppForm from '@/components/AppForm'

export default function NewAppPage() {
  const params = useParams()
  const brandId = params.id as string
  const [brandName, setBrandName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBrandName()
  }, [brandId])

  const fetchBrandName = async () => {
    try {
      const response = await fetch('/api/brands')
      if (response.ok) {
        const brands = await response.json()
        const brand = brands.find((b: any) => b.id === brandId)
        if (brand) {
          setBrandName(brand.name)
        }
      }
    } catch (error) {
      console.error('Error fetching brand:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New App</h1>
            <p className="text-gray-600 mt-1">Add a new app to your brand</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AppForm brandId={brandId} brandName={brandName} />
      </main>
    </div>
  )
}
