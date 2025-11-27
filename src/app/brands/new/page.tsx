import BrandForm from '@/components/BrandForm'

export default function NewBrandPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Create New Brand</h1>
            <p className="text-gray-600 mt-1">Add a new brand to your SEO dashboard</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BrandForm />
      </main>
    </div>
  )
}
