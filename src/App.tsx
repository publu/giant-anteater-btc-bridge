import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ArrowLeftRight, Bitcoin, Ethereum, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import CreateSwap from './components/CreateSwap';
import SwapDetails from './components/SwapDetails';
import SwapList from './components/SwapList';

function App() {
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);

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
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'funded': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-red-600 bg-red-50';
      case 'refunded': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
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

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Bitcoin className="w-8 h-8 text-orange-500" />
                  <ArrowLeftRight className="w-6 h-6 text-gray-600" />
                  <Ethereum className="w-8 h-8 text-blue-500" />
                </div>
                <span className="text-xl font-bold text-gray-900">Atomic Swap</span>
              </Link>
              
              <div className="flex items-center space-x-4">
                <Link 
                  to="/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Swap
                </Link>
                <Link 
                  to="/swaps"
                  className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  View Swaps
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <div className="mb-8">
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <Bitcoin className="w-16 h-16 text-orange-500" />
                    <ArrowLeftRight className="w-12 h-12 text-gray-600" />
                    <Ethereum className="w-16 h-16 text-blue-500" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Atomic Swap Platform
                  </h1>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Trustless, decentralized swaps between Bitcoin and Ethereum using Hash Time Lock Contracts (HTLCs)
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <ArrowLeftRight className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Trustless Swaps</h3>
                    <p className="text-gray-600">
                      No intermediaries required. Smart contracts ensure secure, atomic transactions.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Fast</h3>
                    <p className="text-gray-600">
                      Cryptographic proofs ensure security. Complete swaps in minutes, not hours.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatic Refunds</h3>
                    <p className="text-gray-600">
                      Failed swaps are automatically refunded. Your funds are always protected.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Swaps</h2>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : swaps.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No swaps yet</p>
                      <Link 
                        to="/create"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Create Your First Swap
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {swaps.slice(0, 5).map((swap: any) => (
                        <div key={swap.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {swap.direction === 'btc-to-eth' ? (
                                <>
                                  <Bitcoin className="w-5 h-5 text-orange-500" />
                                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                                  <Ethereum className="w-5 h-5 text-blue-500" />
                                </>
                              ) : (
                                <>
                                  <Ethereum className="w-5 h-5 text-blue-500" />
                                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                                  <Bitcoin className="w-5 h-5 text-orange-500" />
                                </>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {swap.btc_amount} BTC ↔ {parseFloat(swap.eth_amount).toFixed(4)} ETH
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(swap.created_at * 1000).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swap.status)}`}>
                            {getStatusIcon(swap.status)}
                            <span className="capitalize">{swap.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            } />
            <Route path="/create" element={<CreateSwap />} />
            <Route path="/swaps" element={<SwapList />} />
            <Route path="/swap/:id" element={<SwapDetails />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;