import React, { useState } from 'react';
import { ArrowLeftRight, Bitcoin, Ethereum, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateSwap: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    direction: 'btc-to-eth',
    btc_amount: '',
    eth_amount: '',
    eth_address: '',
    btc_pubkey: '',
    expiration_hours: '24'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/swap/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create swap');
      }

      const data = await response.json();
      navigate(`/swap/${data.swap_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create swap');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <Bitcoin className="w-12 h-12 text-orange-500" />
            <ArrowLeftRight className="w-8 h-8 text-gray-600" />
            <Ethereum className="w-12 h-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Atomic Swap</h1>
          <p className="text-gray-600">Set up a trustless exchange between Bitcoin and Ethereum</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swap Direction
            </label>
            <select
              name="direction"
              value={formData.direction}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="btc-to-eth">Bitcoin → Ethereum</option>
              <option value="eth-to-btc">Ethereum → Bitcoin</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitcoin Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="btc_amount"
                  value={formData.btc_amount}
                  onChange={handleInputChange}
                  step="0.00000001"
                  min="0"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                  placeholder="0.001"
                />
                <Bitcoin className="absolute right-3 top-3 w-6 h-6 text-orange-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ethereum Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="eth_amount"
                  value={formData.eth_amount}
                  onChange={handleInputChange}
                  step="0.000000000000000001"
                  min="0"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                  placeholder="0.1"
                />
                <Ethereum className="absolute right-3 top-3 w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ethereum Address
            </label>
            <input
              type="text"
              name="eth_address"
              value={formData.eth_address}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0x..."
            />
          </div>

          {formData.direction === 'btc-to-eth' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bitcoin Public Key (Optional)
              </label>
              <input
                type="text"
                name="btc_pubkey"
                value={formData.btc_pubkey}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="03..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Time
            </label>
            <div className="relative">
              <select
                name="expiration_hours"
                value={formData.expiration_hours}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
              <Clock className="absolute right-3 top-3 w-6 h-6 text-gray-400" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• A secret is generated and locked in both Bitcoin and Ethereum contracts</li>
              <li>• Both parties fund their respective contracts</li>
              <li>• The first party reveals the secret to claim funds</li>
              <li>• The second party uses the revealed secret to claim their funds</li>
              <li>• If either party doesn't participate, funds are automatically refunded</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating Swap...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-5 h-5" />
                <span>Create Swap</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSwap;