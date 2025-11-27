'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RankTrackerFormProps {
  appId: string;
  onSuccess?: () => void;
}

export default function RankTrackerForm({ appId, onSuccess }: RankTrackerFormProps) {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('us');
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rank-tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appId,
          keyword: keyword.trim(),
          country: country.toLowerCase(),
          domain: domain.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create rank tracker');
        return;
      }

      // Reset form
      setKeyword('');
      setCountry('us');
      setDomain('');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Refresh the page to show new data
        router.refresh();
      }
    } catch (err) {
      console.error('Error creating rank tracker:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Common country codes for SEMrush
  const countries = [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'ca', name: 'Canada' },
    { code: 'au', name: 'Australia' },
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'es', name: 'Spain' },
    { code: 'it', name: 'Italy' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'se', name: 'Sweden' },
    { code: 'no', name: 'Norway' },
    { code: 'dk', name: 'Denmark' },
    { code: 'fi', name: 'Finland' },
    { code: 'pl', name: 'Poland' },
    { code: 'br', name: 'Brazil' },
    { code: 'mx', name: 'Mexico' },
    { code: 'ar', name: 'Argentina' },
    { code: 'in', name: 'India' },
    { code: 'jp', name: 'Japan' },
    { code: 'kr', name: 'South Korea' },
    { code: 'cn', name: 'China' },
    { code: 'sg', name: 'Singapore' },
    { code: 'my', name: 'Malaysia' },
    { code: 'th', name: 'Thailand' },
    { code: 'vn', name: 'Vietnam' },
    { code: 'id', name: 'Indonesia' },
    { code: 'ph', name: 'Philippines' },
    { code: 'ru', name: 'Russia' },
    { code: 'tr', name: 'Turkey' },
    { code: 'sa', name: 'Saudi Arabia' },
    { code: 'ae', name: 'United Arab Emirates' },
    { code: 'za', name: 'South Africa' },
    { code: 'eg', name: 'Egypt' },
    { code: 'ng', name: 'Nigeria' },
    { code: 'ke', name: 'Kenya' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add Keyword to Rank Tracker</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
            Keyword *
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter keyword to track"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
            Domain *
          </label>
          <input
            type="text"
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter the domain you want to track rankings for (without https://)
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setCountry('us');
              setDomain('');
              setError('');
            }}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Keyword'}
          </button>
        </div>
      </form>
    </div>
  );
}
