
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, Users, ShoppingBag, TrendingUp, Filter, MoreVertical, X, Lock } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { StaffTable } from './components/StaffTable';
import { AdminToggle } from './components/AdminToggle';
import { processSalesData, formatCurrency, getStaffId } from './utils/dataHelpers';
import { RawSalesData, FilterState, AggregatedStaffData } from './types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from './services/db';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

const App: React.FC = () => {
  const [rawData, setRawData] = useState<RawSalesData[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    showroom: 'All Showrooms',
    billMonth: 'All Months',
    counter: 'All Counters'
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await db.getData();
        if (data && data.length > 0) {
          setRawData(data);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Persist Training Status Changes
  const handleStatusUpdate = async (id: string, status: string) => {
    // We update all raw records that match this staff ID.
    // This ensures consistency next time data is aggregated.
    const newRawData = rawData.map(d => {
      const currentId = getStaffId(d);
      if (currentId === id) {
        return { ...d, TrainingStatus: status };
      }
      return d;
    });

    setRawData(newRawData);
    // Debounce save or save immediately
    await db.updateTrainingStatus(newRawData);
  };

  const handleDataLoaded = async (data: RawSalesData[]) => {
    setRawData(data);
    setShowUploadModal(false);
    await db.saveData(data); // Persist to DB/Local
  };

  // Memoize unique filter options based on raw data
  const filterOptions = useMemo(() => {
    const showrooms = Array.from(new Set(rawData.map(d => d.ShowRoom).filter(Boolean)));
    const months = Array.from(new Set(rawData.map(d => d.BillMo).filter(Boolean)));
    const counters = Array.from(new Set(rawData.map(d => d.Counter).filter(Boolean)));
    return { showrooms, months, counters };
  }, [rawData]);

  // Process data based on filters
  const { staffData, metrics } = useMemo(() => {
    return processSalesData(rawData, filters);
  }, [rawData, filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  // MAIN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Sales Performance</h1>
            <h1 className="text-xl font-bold text-gray-900 sm:hidden">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs text-gray-400 hidden md:block">
               Last updated: {new Date().toLocaleTimeString()}
             </div>
             
             <AdminToggle 
              isAdmin={isAdmin} 
              onLoginSuccess={() => setIsAdmin(true)} 
              onLogout={() => setIsAdmin(false)} 
            />

            {/* 3 Dots Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical size={20} className="text-gray-600" />
              </button>

              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          setShowUploadModal(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                      >
                        Upload New Excel
                      </button>
                    ) : (
                      <div className="px-4 py-2 text-xs text-gray-400 italic">
                        Admin access required for actions
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Upload Modal (Triggered by 3 dots) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Update Sales Data</h3>
            <p className="text-sm text-gray-500 mb-6">Uploading a new file will overwrite the current sales data. Training statuses for matching staff IDs will be preserved if possible.</p>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Filters Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Filter size={18} />
            <span>Filters</span>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
             <select 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
              value={filters.showroom}
              onChange={(e) => handleFilterChange('showroom', e.target.value)}
            >
              <option>All Showrooms</option>
              {filterOptions.showrooms.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
              value={filters.billMonth}
              onChange={(e) => handleFilterChange('billMonth', e.target.value)}
            >
              <option>All Months</option>
              {filterOptions.months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select 
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
              value={filters.counter}
              onChange={(e) => handleFilterChange('counter', e.target.value)}
            >
              <option>All Counters</option>
              {filterOptions.counters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Empty State Banner for Admins */}
        {isAdmin && rawData.length === 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
            <h3 className="text-blue-900 font-semibold text-lg mb-2">Setup Required</h3>
            <p className="text-blue-700 mb-4">The dashboard is currently empty. Use the menu above or the button below to upload data.</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Upload Data Now
            </button>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Sales (Consolidated)</p>
            <h3 className="text-3xl font-bold text-gray-900">
              {isAdmin ? formatCurrency(metrics.totalSales) : '***,***'}
            </h3>
            {!isAdmin && <p className="text-xs text-blue-400 mt-2 flex items-center gap-1"><Users size={12}/> Admin access required</p>}
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Cross Sales</p>
            <h3 className="text-3xl font-bold text-gray-900">
              {isAdmin ? formatCurrency(metrics.totalCrossSales) : '***,***'}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Cross Sale %</p>
            <h3 className="text-3xl font-bold text-purple-600">{metrics.crossSalePercentage}%</h3>
            <p className="text-xs text-gray-400 mt-2">Target: 10%+</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bar Chart: Top Products */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Top Products / Counters</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topProducts} margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{fontSize: 12}} />
                  <ReTooltip formatter={(value: number) => [formatCurrency(value), 'Sales']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart: Cross Sale Rate */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2 w-full text-left">Cross Sale Rate</h3>
            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cross Sales', value: metrics.crossSalePercentage },
                      { name: 'Regular Sales', value: 100 - metrics.crossSalePercentage }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-800">{metrics.crossSalePercentage}%</span>
              </div>
            </div>
            <div className="flex gap-4 text-xs mt-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Cross Sales</span>
              </div>
               <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                <span>Other</span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <StaffTable 
          data={staffData} 
          isAdmin={isAdmin} 
          onUpdateStatus={handleStatusUpdate}
        />

      </main>
    </div>
  );
};

export default App;
