'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
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

export default function AddRankTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  const appId = params.appId as string;

  const [app, setApp] = useState<App | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    // Redirect back to the rank tracker page
    router.push(`/brands/${brandId}/apps/${appId}/rank-tracker`);
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
                onClick={() => router.push(`/brands/${brandId}/apps/${appId}/rank-tracker`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add Keyword to Rank Tracker</h1>
                <p className="text-gray-600 mt-1">
                  {brand.name} • {app.name} • {app.platform}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Track Keyword Rankings</h2>
            <p className="text-gray-600">
              Add a keyword to track its ranking position over time. The system will use SEMrush API 
              to fetch current ranking data and store it historically for trend analysis.
            </p>
          </div>

          <RankTrackerForm 
            appId={appId} 
            onSuccess={handleAddSuccess}
          />

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Tips for Effective Keyword Tracking</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Choose keywords that are relevant to your business and target audience</li>
              <li>Track a mix of high-volume and long-tail keywords</li>
              <li>Monitor competitor keywords to understand market positioning</li>
              <li>Set the correct country and domain for accurate ranking data</li>
              <li>Regularly fetch data to maintain up-to-date ranking information</li>
            </ul>
          </div>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Country Codes Reference</h3>
            <p className="text-gray-600 mb-3">
              Select the appropriate country code for your target market:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div><strong>us</strong> - United States</div>
              <div><strong>gb</strong> - United Kingdom</div>
              <div><strong>ca</strong> - Canada</div>
              <div><strong>au</strong> - Australia</div>
              <div><strong>de</strong> - Germany</div>
              <div><strong>fr</strong> - France</div>
              <div><strong>es</strong> - Spain</div>
              <div><strong>it</strong> - Italy</div>
              <div><strong>in</strong> - India</div>
              <div><strong>jp</strong> - Japan</div>
              <div><strong>kr</strong> - South Korea</div>
              <div><strong>cn</strong> - China</div>
              <div><strong>br</strong> - Brazil</div>
              <div><strong>mx</strong> - Mexico</div>
              <div><strong>ru</strong> - Russia</div>
              <div><strong>sa</strong> - Saudi Arabia</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
