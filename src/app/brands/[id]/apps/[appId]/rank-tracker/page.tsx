'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import RankTrackerList from '@/components/RankTrackerList';
import RankTrackerForm from '@/components/RankTrackerForm';

interface App {
  id: string;
  name: string;
  platform: string;
  createdAt: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function RankTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  const appId = params.appId as string;

  const [app, setApp] = useState<App | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchAppData();
  }, [brandId, appId]);

  const fetchAppData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch brand details
      const brandResponse = await fetch('/api/brands');
      if (brandResponse.ok) {
        const brands = await brandResponse.json();
        const currentBrand = brands.find((b: Brand) => b.id === brandId);
        if (currentBrand) {
          setBrand(currentBrand);
        }
      }

      // Fetch app details
      const appsResponse = await fetch(`/api/apps?brandId=${brandId}`);
      if (appsResponse.ok) {
        const apps = await appsResponse.json();
        const currentApp = apps.find((a: App) => a.id === appId);
        
        if (!currentApp) {
          throw new Error('App not found');
        }
        
        setApp(currentApp);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !app || !brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-red-600">
            {error || 'App not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rank Tracker</h1>
                <p className="text-gray-600 mt-1">
                  {brand.name} • {app.name} • {app.platform}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/brands/${brandId}/apps/${appId}`}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to App
              </Link>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Keyword
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {/* Add Form */}
          {showAddForm && (
            <RankTrackerForm 
              appId={appId} 
              onSuccess={handleAddSuccess}
            />
          )}

          {/* Rank Tracker List */}
          <RankTrackerList 
            appId={appId}
            onRefresh={() => {
              // Refresh logic if needed
            }}
          />

          {/* Navigation to individual keyword history */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Keyword History & Analytics</h3>
            <p className="text-gray-600 mb-4">
              Click on any keyword in the list above and then click "View History" to see detailed analytics, 
              charts, and historical ranking data for that specific keyword.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span>Positions 1-3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Positions 4-10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                <span>Positions 11-20</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Positions 21-50</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Positions 51+</span>
              </div>
            </div>
          </div>

          {/* SEMrush API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">About SEMrush Integration</h3>
            <p className="text-blue-800 mb-4">
              This rank tracker uses the SEMrush API to fetch real-time keyword ranking data. 
              When you click "Fetch Data" for a keyword, the system will:
            </p>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Query SEMrush for current keyword rankings</li>
              <li>Retrieve position, traffic, search volume, and difficulty data</li>
              <li>Store the data historically for trend analysis</li>
              <li>Update the ranking position and metrics</li>
            </ul>
            <p className="text-blue-800 mt-4 text-sm">
              Make sure your SEMrush API key is configured in the environment variables for this feature to work.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
