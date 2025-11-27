'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

interface RankTracker {
  id: string;
  keyword: string;
  country: string;
  domain: string;
  isActive: boolean;
  lastChecked: Date | null;
  createdAt: Date;
  rankings: RankTrackerHistory[];
}

interface RankTrackerHistory {
  id: string;
  position: number;
  url: string | null;
  traffic: number | null;
  searchVolume: number | null;
  difficulty: number | null;
  date: Date;
}

interface RankTrackerListProps {
  appId: string;
  onRefresh?: () => void;
}

export default function RankTrackerList({ appId, onRefresh }: RankTrackerListProps) {
  const [rankTrackers, setRankTrackers] = useState<RankTracker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRankTrackers();
  }, [appId]);

  const fetchRankTrackers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/rank-tracker?appId=${appId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rank trackers');
      }
      const data = await response.json();
      setRankTrackers(data);
    } catch (err) {
      console.error('Error fetching rank trackers:', err);
      setError('Failed to load rank trackers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchData = async (rankTrackerId: string) => {
    setFetchingId(rankTrackerId);
    try {
      const response = await fetch('/api/rank-tracker/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rankTrackerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to fetch ranking data');
        return;
      }

      // Refresh the list to show updated data
      await fetchRankTrackers();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error fetching ranking data:', err);
      alert('An unexpected error occurred while fetching ranking data');
    } finally {
      setFetchingId(null);
    }
  };

  const handleToggleActive = async (rankTrackerId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/rank-tracker', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: rankTrackerId, isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rank tracker');
      }

      await fetchRankTrackers();
    } catch (err) {
      console.error('Error updating rank tracker:', err);
      alert('Failed to update rank tracker');
    }
  };

  const handleDelete = async (rankTrackerId: string) => {
    if (!confirm('Are you sure you want to delete this rank tracker? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/rank-tracker?id=${rankTrackerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rank tracker');
      }

      await fetchRankTrackers();
    } catch (err) {
      console.error('Error deleting rank tracker:', err);
      alert('Failed to delete rank tracker');
    }
  };

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'text-green-600 font-semibold';
    if (position <= 10) return 'text-green-500';
    if (position <= 20) return 'text-yellow-600';
    if (position <= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCountryName = (code: string) => {
    const countries: Record<string, string> = {
      us: 'United States',
      gb: 'United Kingdom',
      ca: 'Canada',
      au: 'Australia',
      de: 'Germany',
      fr: 'France',
      es: 'Spain',
      it: 'Italy',
      nl: 'Netherlands',
      se: 'Sweden',
      no: 'Norway',
      dk: 'Denmark',
      fi: 'Finland',
      pl: 'Poland',
      br: 'Brazil',
      mx: 'Mexico',
      ar: 'Argentina',
      in: 'India',
      jp: 'Japan',
      kr: 'South Korea',
      cn: 'China',
      sg: 'Singapore',
      my: 'Malaysia',
      th: 'Thailand',
      vn: 'Vietnam',
      id: 'Indonesia',
      ph: 'Philippines',
      ru: 'Russia',
      tr: 'Turkey',
      sa: 'Saudi Arabia',
      ae: 'United Arab Emirates',
      za: 'South Africa',
      eg: 'Egypt',
      ng: 'Nigeria',
      ke: 'Kenya',
    };
    return countries[code] || code.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (rankTrackers.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500 mb-4">No keywords are being tracked yet.</p>
        <p className="text-sm text-gray-400">Add your first keyword to start tracking rankings.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Tracked Keywords</h2>
        <p className="text-sm text-gray-600 mt-1">
          {rankTrackers.length} keyword{rankTrackers.length !== 1 ? 's' : ''} being tracked
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {rankTrackers.map((tracker) => {
          const latestRanking = tracker.rankings[0];
          
          return (
            <div key={tracker.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {tracker.keyword}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>🌍 {getCountryName(tracker.country)}</span>
                        <span>🌐 {tracker.domain}</span>
                        <span>📅 Added {format(new Date(tracker.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    {latestRanking && (
                      <div className="text-right">
                        <div className={`text-2xl ${getPositionColor(latestRanking.position)}`}>
                          #{latestRanking.position}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last checked: {format(new Date(latestRanking.date), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    )}
                  </div>

                  {latestRanking && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {latestRanking.traffic && (
                        <div>
                          <span className="text-gray-500">Traffic:</span>
                          <span className="ml-1 font-medium">{latestRanking.traffic.toLocaleString()}</span>
                        </div>
                      )}
                      {latestRanking.searchVolume && (
                        <div>
                          <span className="text-gray-500">Search Volume:</span>
                          <span className="ml-1 font-medium">{latestRanking.searchVolume.toLocaleString()}</span>
                        </div>
                      )}
                      {latestRanking.difficulty && (
                        <div>
                          <span className="text-gray-500">Difficulty:</span>
                          <span className="ml-1 font-medium">{latestRanking.difficulty}%</span>
                        </div>
                      )}
                      {latestRanking.url && (
                        <div className="col-span-2 md:col-span-1">
                          <span className="text-gray-500">URL:</span>
                          <a 
                            href={latestRanking.url.startsWith('http') ? latestRanking.url : `https://${latestRanking.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:text-blue-800 truncate block"
                          >
                            {latestRanking.url}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {!latestRanking && (
                    <div className="mt-3">
                      <span className="text-sm text-gray-500">
                        No ranking data available. Click "Fetch Data" to get current rankings.
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleFetchData(tracker.id)}
                    disabled={fetchingId === tracker.id}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fetchingId === tracker.id ? 'Fetching...' : 'Fetch Data'}
                  </button>
                  
                  <Link
                    href={`/brands/${appId.split('-')[0]}/apps/${appId}/rank-tracker/${tracker.id}/history`}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    View History
                  </Link>
                  
                  <button
                    onClick={() => handleToggleActive(tracker.id, tracker.isActive)}
                    className={`px-3 py-1 text-sm rounded ${
                      tracker.isActive
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {tracker.isActive ? 'Active' : 'Inactive'}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(tracker.id)}
                    className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
