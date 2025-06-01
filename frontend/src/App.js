import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [portfolio, setPortfolio] = useState(null);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'stock',
    symbol: '',
    quantity: '',
    value: '',
    manual_value: ''
  });
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: ''
  });

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/portfolio`);
      setPortfolio(response.data.portfolio);
      setTotals(response.data.totals);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAsset = async () => {
    try {
      const assetData = {
        ...newAsset,
        quantity: newAsset.quantity ? parseFloat(newAsset.quantity) : null,
        value: newAsset.value ? parseFloat(newAsset.value) : 0,
        manual_value: newAsset.manual_value ? parseFloat(newAsset.manual_value) : null
      };
      
      await axios.post(`${API_BASE}/api/assets`, assetData);
      setNewAsset({ name: '', type: 'stock', symbol: '', quantity: '', value: '', manual_value: '' });
      setShowAddAsset(false);
      loadPortfolio();
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  const deleteAsset = async (assetId) => {
    try {
      await axios.delete(`${API_BASE}/api/assets/${assetId}`);
      loadPortfolio();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const addSavingsGoal = async () => {
    try {
      const goalData = {
        ...newGoal,
        target_amount: parseFloat(newGoal.target_amount),
        current_amount: newGoal.current_amount ? parseFloat(newGoal.current_amount) : 0
      };
      
      await axios.post(`${API_BASE}/api/savings-goals`, goalData);
      setNewGoal({ name: '', target_amount: '', current_amount: '', deadline: '' });
      setShowAddGoal(false);
      loadPortfolio();
    } catch (error) {
      console.error('Error adding savings goal:', error);
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API_BASE}/api/savings-goals/${goalId}`);
      loadPortfolio();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const updateGoalProgress = async (goalId, newAmount) => {
    try {
      await axios.put(`${API_BASE}/api/savings-goals/${goalId}`, {
        current_amount: parseFloat(newAmount)
      });
      loadPortfolio();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const createSnapshot = async () => {
    try {
      await axios.post(`${API_BASE}/api/net-worth-snapshot`);
      loadPortfolio();
    } catch (error) {
      console.error('Error creating snapshot:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Chart data for net worth history
  const netWorthChartData = {
    labels: portfolio?.net_worth_history?.map(snap => formatDate(snap.date)) || [],
    datasets: [
      {
        label: 'Net Worth',
        data: portfolio?.net_worth_history?.map(snap => snap.net_worth) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Chart data for asset breakdown
  const assetBreakdownData = {
    labels: ['Stocks', 'ETFs', 'Super', 'Savings'],
    datasets: [
      {
        data: [totals.stocks || 0, totals.etfs || 0, totals.super || 0, totals.savings || 0],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Net Worth Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">NetWorth Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Net Worth</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.net_worth || 0)}</p>
              </div>
              <button
                onClick={createSnapshot}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Update Portfolio
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'assets', 'goals'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Stocks</h3>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totals.stocks || 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">ETFs</h3>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(totals.etfs || 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Super</h3>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totals.super || 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">Savings</h3>
                <p className="text-2xl font-bold text-yellow-500">{formatCurrency(totals.savings || 0)}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Net Worth Trend</h3>
                {portfolio?.net_worth_history?.length > 0 ? (
                  <Line data={netWorthChartData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>No data yet. Click "Update Portfolio" to create your first snapshot!</p>
                  </div>
                )}
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Breakdown</h3>
                <Doughnut data={assetBreakdownData} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Assets</h2>
              <button
                onClick={() => setShowAddAsset(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Asset
              </button>
            </div>

            {/* Add Asset Modal */}
            {showAddAsset && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddAsset(false);
                  }
                }}
              >
                <div className="bg-white p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Add New Asset</h3>
                    <button
                      onClick={() => setShowAddAsset(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Asset Name"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={newAsset.type}
                      onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="stock">Stock</option>
                      <option value="etf">ETF</option>
                      <option value="super">Super</option>
                      <option value="savings">Savings</option>
                    </select>
                    {(newAsset.type === 'stock' || newAsset.type === 'etf') && (
                      <>
                        <input
                          type="text"
                          placeholder="Symbol (e.g., AAPL)"
                          value={newAsset.symbol}
                          onChange={(e) => setNewAsset({...newAsset, symbol: e.target.value.toUpperCase()})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={newAsset.quantity}
                          onChange={(e) => setNewAsset({...newAsset, quantity: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </>
                    )}
                    <input
                      type="number"
                      placeholder="Value (USD)"
                      value={newAsset.value}
                      onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowAddAsset(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addAsset}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add Asset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Assets List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio?.assets?.map((asset) => (
                    <tr key={asset.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{asset.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.symbol || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.quantity || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(asset.value)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="hover:text-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
              {!portfolio?.assets?.length && (
                <div className="text-center py-8 text-gray-500">
                  No assets yet. Add your first asset to get started!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Savings Goals</h2>
              <button
                onClick={() => setShowAddGoal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Goal
              </button>
            </div>

            {/* Add Goal Modal */}
            {showAddGoal && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowAddGoal(false);
                  }
                }}
              >
                <div className="bg-white p-6 rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Add New Savings Goal</h3>
                    <button
                      onClick={() => setShowAddGoal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Goal Name"
                      value={newGoal.name}
                      onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Target Amount"
                      value={newGoal.target_amount}
                      onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Current Amount"
                      value={newGoal.current_amount}
                      onChange={(e) => setNewGoal({...newGoal, current_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      placeholder="Deadline"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowAddGoal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addSavingsGoal}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Add Goal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio?.savings_goals?.map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                return (
                  <div key={goal.id} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{goal.name}</h3>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">{progress.toFixed(1)}% complete</p>
                      {goal.deadline && (
                        <p className="text-sm text-gray-600">Due: {formatDate(goal.deadline)}</p>
                      )}
                    </div>
                    <div className="mt-4">
                      <input
                        type="number"
                        placeholder="Update progress"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateGoalProgress(goal.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              }) || []}
            </div>
            {!portfolio?.savings_goals?.length && (
              <div className="text-center py-8 text-gray-500">
                No savings goals yet. Add your first goal to start tracking!
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;