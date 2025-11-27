'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

interface RankTrackerHistory {
  id: string;
  position: number;
  url: string | null;
  traffic: number | null;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  competition: number | null;
  trend: number | null;
  date: Date;
}

interface RankTrackerHistoryProps {
  rankTrackerId: string;
  keyword: string;
  country: string;
  domain: string;
}

interface Statistics {
  totalRecords: number;
  averagePosition: number | null;
  bestPosition: number | null;
  worstPosition: number | null;
  currentPosition: number | null;
  previousPosition: number | null;
  positionChange: number | null;
  averageTraffic: number | null;
  averageSearchVolume: number | null;
  firstRecorded: Date | null;
  lastRecorded: Date | null;
  daysTracked: number;
  trend: string;
}

export default function RankTrackerHistory({ 
  rankTrackerId, 
  keyword, 
  country, 
  domain 
}: RankTrackerHistoryProps) {
  const [history, setHistory] = useState<RankTrackerHistory[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchHistory();
    fetchStatistics();
  }, [rankTrackerId, dateRange]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');

    try {
      let startDate;
      const endDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        case 'all':
        default:
          startDate = null;
          break;
      }

      const params = new URLSearchParams({
        rankTrackerId,
      });

      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }

      const response = await fetch(`/api/rank-tracker/history?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load history data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      let startDate;
      const endDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        case 'all':
        default:
          startDate = null;
          break;
      }

      const response = await fetch('/api/rank-tracker/history', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rankTrackerId,
          startDate: startDate?.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
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

  const formatChartData = (data: RankTrackerHistory[]) => {
    return data.map(item => ({
      date: format(new Date(item.date), 'MMM dd'),
      position: item.position,
      traffic: item.traffic || 0,
      searchVolume: item.searchVolume || 0,
      difficulty: item.difficulty || 0,
    }));
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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

  if (history.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500 mb-4">No historical data available for this keyword.</p>
        <p className="text-sm text-gray-400">Fetch ranking data to start tracking history.</p>
      </div>
    );
  }

  const chartData = formatChartData(history);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Ranking History</h2>
            <p className="text-sm text-gray-600">
              {keyword} • {getCountryName(country)} • {domain}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Current Position</div>
              <div className="text-2xl font-bold text-blue-600">
                #{statistics.currentPosition || 'N/A'}
              </div>
              {statistics.positionChange !== null && (
                <div className={`text-sm ${statistics.positionChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {statistics.positionChange < 0 ? '↑' : '↓'} {Math.abs(statistics.positionChange)}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Average Position</div>
              <div className="text-2xl font-bold text-gray-700">
                #{statistics.averagePosition || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                Best: #{statistics.bestPosition || 'N/A'}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Days Tracked</div>
              <div className="text-2xl font-bold text-gray-700">
                {statistics.daysTracked}
              </div>
              <div className="text-sm text-gray-500">
                {statistics.totalRecords} records
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Trend</div>
              <div className={`text-2xl ${getTrendColor(statistics.trend)}`}>
                {getTrendIcon(statistics.trend)} {statistics.trend}
              </div>
              <div className="text-sm text-gray-500">
                {statistics.averageSearchVolume 
                  ? `${statistics.averageSearchVolume.toLocaleString()} avg. volume`
                  : 'No volume data'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Position Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Position Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis reversed domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'position' ? `#${value}` : value,
                  name === 'position' ? 'Position' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="position" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Traffic and Search Volume Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Traffic & Search Volume</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Area 
                type="monotone" 
                dataKey="traffic" 
                stackId="1" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="searchVolume" 
                stackId="2" 
                stroke="#F59E0B" 
                fill="#F59E0B"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Difficulty Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Keyword Difficulty</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Bar dataKey="difficulty" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Historical Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Traffic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Search Volume
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(record.date), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{record.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.traffic ? record.traffic.toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.searchVolume ? record.searchVolume.toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.difficulty ? `${record.difficulty}%` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {record.url ? (
                      <a 
                        href={record.url.startsWith('http') ? record.url : `https://${record.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {record.url}
                      </a>
                    ) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
