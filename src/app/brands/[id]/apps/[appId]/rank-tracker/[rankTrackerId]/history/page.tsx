'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import RankTrackerHistory from '@/components/RankTrackerHistory';

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

interface RankTracker {
  id: string;
  keyword: string;
  country: string;
  domain: string;
  isActive: boolean;
  lastChecked: Date | null;
  createdAt: Date;
}

export default function RankTrackerHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  const appId = params.appId as string;
  const rankTrackerId = params.rankTrackerId as string;

  const [app, setApp] = useState<App | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [rankTracker, setRankTracker] = useState<RankTracker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [brandId, appId, rankTrackerId]);

  const fetchData = async () => {
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

      // Fetch rank tracker details
      const rankTrackersResponse = await fetch(`/api/rank-tracker?appId=${appId}`);
      if (rankTrackersResponse.ok) {
        const rankTrackers = await rankTrackersResponse.json();
        const currentRankTracker = rankTrackers.find((rt: RankTracker) => rt.id === rankTrackerId);
        
        if (!currentRankTracker) {
          throw new Error('Rank tracker not found');
        }
        
        setRankTracker(currentRankTracker);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
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

  if (error || !app || !brand || !rankTracker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-red-600">
            {error || 'Rank tracker not found'}
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
                <h1 className="text-3xl font-bold text-gray-900">Ranking History</h1>
                <p className="text-gray-600 mt-1">
                  {brand.name} • {app.name} • {app.platform}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Keyword: {rankTracker.keyword} • {rankTracker.country} • {rankTracker.domain}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <RankTrackerHistory
          rankTrackerId={rankTrackerId}
          keyword={rankTracker.keyword}
          country={rankTracker.country}
          domain={rankTracker.domain}
        />
      </main>
    </div>
  );
}
