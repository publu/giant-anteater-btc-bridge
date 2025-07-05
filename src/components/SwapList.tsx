import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bitcoin, Ethereum, ArrowLeftRight, Clock, CheckCircle, XCircle, RefreshCw, Filter } from 'lucide-react';

interface Swap {
  id: number;
  direction: string;
  btc_amount: number;
  eth_amount: string;
  status: string;
  created_at: number;
  expiration: number;
  btc_funded: boolean;
  eth_funded: boolean;
}

const SwapList: React.FC = () => {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  useEffect(() => {
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    try {
      const response = await fetch('http://localhost:3001/swaps');
      const data = await response.json();
      setSwaps(data);
    } catch (error) {
      console.error('Error fetching swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'funded': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'expired': return 'text-red-600 bg-red-50 border-red-200';
      case 'refunded': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'funded': return <RefreshCw className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <XCircle className="w-4 h-4" />;
      case 'refunded': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredSwaps = swaps.filter(swap => {
    const statusMatch = filter === 'all' || swap.status === filter;
    const directionMatch = directionFilter === 'all' || swap.direction === directionFilter;
    return statusMatch && directionMatch;
  });

  const isExpired = (expiration: number) => {
    return Date.now() / 1000 > expiration;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Atomic Swaps</h1>
          <p className="text-gray-600">Manage your Bitcoin ↔ Ethereum swaps</p>
        </div>
        <Link
          to="/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span>Create New Swap</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="funded">Funded</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Direction:</label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All</option>
              <option value="btc-to-eth">BTC → ETH</option>
              <option value="eth-to-btc">ETH → BTC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Swaps List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {filteredSwaps.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center items-center space-x-4 mb-4">
              <Bitcoin className="w-12 h-12 text-orange-500 opacity-50" />
              <ArrowLeftRight className="w-8 h-8 text-gray-400" />
              <Ethereum className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No swaps found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' && directionFilter === 'all' 
                ? 'No swaps have been created yet.'
                : 'No swaps match your current filters.'
              }
            </p>
            <Link
              to="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span>Create Your First Swap</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSwaps.map((swap) => (
              <Link
                key={swap.id}
                to={`/swap/${swap.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {swap.direction === 'btc-to-eth' ? (
                        <>
                          <Bitcoin className="w-6 h-6 text-orange-500" />
                          <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                          <Ethereum className="w-6 h-6 text-blue-500" />
                        </>
                      ) : (
                        <>
                          <Ethereum className="w-6 h-6 text-blue-500" />
                          <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                          <Bitcoin className="w-6 h-6 text-orange-500" />
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Swap #{swap.id}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {swap.btc_amount} BTC ↔ {parseFloat(swap.eth_amount).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Created: {new Date(swap.created_at * 1000).toLocaleDateString()}
                      </p>
                      <p className={`text-sm ${isExpired(swap.expiration) ? 'text-red-600' : 'text-gray-600'}`}>
                        {isExpired(swap.expiration) ? 'Expired' : 'Expires'}: {new Date(swap.expiration * 1000).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${swap.btc_funded ? 'bg-green-500' : 'bg-gray-300'}`} title="Bitcoin funded" />
                      <div className={`w-3 h-3 rounded-full ${swap.eth_funded ? 'bg-green-500' : 'bg-gray-300'}`} title="Ethereum funded" />
                    </div>

                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(swap.status)}`}>
                      {getStatusIcon(swap.status)}
                      <span className="capitalize">{swap.status}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapList;