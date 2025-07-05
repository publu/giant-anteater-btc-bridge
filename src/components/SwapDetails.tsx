import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bitcoin, Ethereum, Clock, CheckCircle, XCircle, Copy, ExternalLink, AlertCircle } from 'lucide-react';

interface Swap {
  id: number;
  direction: string;
  hashlock: string;
  secret?: string;
  btc_amount: number;
  eth_amount: string;
  btc_pubkey?: string;
  eth_address: string;
  expiration: number;
  btc_funded: boolean;
  eth_funded: boolean;
  eth_escrow_address?: string;
  btc_redeem_script?: string;
  btc_txid?: string;
  secret_revealed: boolean;
  secret_revealed_at?: number;
  status: string;
  created_at: number;
  updated_at: number;
}

const SwapDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [swap, setSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSwapDetails();
  }, [id]);

  const fetchSwapDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3001/swap/${id}`);
      if (!response.ok) {
        throw new Error('Swap not found');
      }
      const data = await response.json();
      setSwap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch swap details');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'funded': return <Clock className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'expired': return <XCircle className="w-5 h-5" />;
      case 'refunded': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const handleFundEth = async () => {
    if (!swap) return;
    
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/swap/${swap.id}/fund-eth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fund ETH');
      }

      await fetchSwapDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fund ETH');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !swap) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-red-900 mb-2">Error Loading Swap</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Link to="/swaps" className="text-blue-600 hover:text-blue-800">
            ← Back to Swaps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link 
          to="/swaps" 
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Swaps</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Swap #{swap.id}
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {swap.direction === 'btc-to-eth' ? (
                    <>
                      <Bitcoin className="w-6 h-6 text-orange-500" />
                      <span className="text-lg font-medium">→</span>
                      <Ethereum className="w-6 h-6 text-blue-500" />
                    </>
                  ) : (
                    <>
                      <Ethereum className="w-6 h-6 text-blue-500" />
                      <span className="text-lg font-medium">→</span>
                      <Bitcoin className="w-6 h-6 text-orange-500" />
                    </>
                  )}
                </div>
                <span className="text-lg font-medium text-gray-900">
                  {swap.btc_amount} BTC ↔ {parseFloat(swap.eth_amount).toFixed(4)} ETH
                </span>
              </div>
            </div>
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getStatusColor(swap.status)}`}>
              {getStatusIcon(swap.status)}
              <span className="font-medium capitalize">{swap.status}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Swap Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <p className="text-gray-900 capitalize">{swap.direction.replace('-', ' → ')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-gray-900">{new Date(swap.created_at * 1000).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                <p className="text-gray-900">{new Date(swap.expiration * 1000).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ethereum Address</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono text-sm">{swap.eth_address}</p>
                  <button
                    onClick={() => copyToClipboard(swap.eth_address)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashlock</label>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-900 font-mono text-sm break-all">{swap.hashlock}</p>
                  <button
                    onClick={() => copyToClipboard(swap.hashlock)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {swap.secret && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secret</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono text-sm break-all">{swap.secret}</p>
                    <button
                      onClick={() => copyToClipboard(swap.secret!)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              {swap.eth_escrow_address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ETH Escrow Address</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono text-sm break-all">{swap.eth_escrow_address}</p>
                    <button
                      onClick={() => copyToClipboard(swap.eth_escrow_address!)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              {swap.btc_txid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitcoin Transaction</label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-900 font-mono text-sm break-all">{swap.btc_txid}</p>
                    <button
                      onClick={() => copyToClipboard(swap.btc_txid!)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Status</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${swap.btc_funded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  <Bitcoin className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">Bitcoin</span>
                  {swap.btc_funded ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {swap.btc_funded ? 'Funded' : 'Waiting for funding'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border ${swap.eth_funded ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center space-x-2">
                  <Ethereum className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Ethereum</span>
                  {swap.eth_funded ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {swap.eth_funded ? 'Funded' : 'Waiting for funding'}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {swap.status === 'pending' && !swap.eth_funded && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleFundEth}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {actionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Funding ETH...</span>
                  </>
                ) : (
                  <>
                    <Ethereum className="w-5 h-5" />
                    <span>Fund ETH Escrow</span>
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapDetails;