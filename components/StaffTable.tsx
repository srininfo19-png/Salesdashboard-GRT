
import React, { useState } from 'react';
import { ArrowUpDown, Download, Trophy, Medal } from 'lucide-react';
import { AggregatedStaffData, TRAINING_STATUS_OPTIONS, TrainingStatusType } from '../types';
import { formatCurrency } from '../utils/dataHelpers';
import * as XLSX from 'xlsx';

interface StaffTableProps {
  data: AggregatedStaffData[];
  isAdmin: boolean;
  onUpdateStatus: (id: string, status: string) => void;
}

type SortField = 'saleRank' | 'crossSaleRank' | 'totalSales' | 'crossSales';
type SortOrder = 'asc' | 'desc';

export const StaffTable: React.FC<StaffTableProps> = ({ data, isAdmin, onUpdateStatus }) => {
  const [sortField, setSortField] = useState<SortField>('saleRank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const factor = sortOrder === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * factor;
  });

  const downloadReport = () => {
    // Create clean data for export
    const exportData = sortedData.map(item => ({
      Code: item.displayCode,
      'Salesman Name': item.name,
      Showroom: item.showroom,
      Counter: item.counter,
      'Total Sales': item.totalSales,
      'Cross Sales': item.crossSales,
      'Cross Sale %': item.crossSalePercentage + '%',
      'Training Status': item.trainingStatus
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Training Report");
    XLSX.writeFile(wb, "Sales_Training_Report.xlsx");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-gray-900">Salesman Rankings</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => handleSort('saleRank')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${sortField === 'saleRank' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            Sort Sale Rank <ArrowUpDown size={12} />
          </button>
          <button 
             onClick={() => handleSort('crossSaleRank')}
             className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${sortField === 'crossSaleRank' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
          >
            Sort Cross Rank <ArrowUpDown size={12} />
          </button>
          <button 
            onClick={downloadReport}
            className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg flex items-center gap-1 hover:bg-green-100 transition-colors"
          >
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium">Code</th>
              <th className="px-6 py-3 font-medium">Salesman Name</th>
              <th className="px-6 py-3 font-medium">Showroom</th>
              <th className="px-6 py-3 font-medium">Counter</th>
              <th className="px-6 py-3 font-medium">
                {isAdmin ? 'Total Sales' : 'Sale Rank'}
              </th>
              <th className="px-6 py-3 font-medium">
                {isAdmin ? 'Cross Sales' : 'Cross Rank'}
              </th>
              <th className="px-6 py-3 font-medium">Cross %</th>
              <th className="px-6 py-3 font-medium">Training Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.map((staff, idx) => (
              <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{staff.displayCode}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{staff.name}</td>
                <td className="px-6 py-4 text-gray-600">{staff.showroom}</td>
                <td className="px-6 py-4 text-gray-600">{staff.counter}</td>
                
                {/* Total Sales / Rank Logic */}
                <td className="px-6 py-4">
                  {isAdmin ? (
                    <span className="font-mono font-medium text-blue-700">{formatCurrency(staff.totalSales)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${staff.saleRank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        #{staff.saleRank}
                      </span>
                      {staff.saleRank === 1 && <Trophy size={14} className="text-amber-500" />}
                    </div>
                  )}
                </td>

                {/* Cross Sales / Rank Logic */}
                <td className="px-6 py-4">
                   {isAdmin ? (
                    <span className="font-mono font-medium text-purple-700">{formatCurrency(staff.crossSales)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                       <span className={`inline-flex items-center justify-center w-10 h-6 rounded-md font-medium text-xs ${staff.crossSaleRank <= 3 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        #{staff.crossSaleRank}
                      </span>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 font-bold text-gray-800">{staff.crossSalePercentage}%</td>
                
                <td className="px-6 py-4">
                  <select 
                    value={staff.trainingStatus}
                    onChange={(e) => onUpdateStatus(staff.id, e.target.value)}
                    className="bg-transparent text-xs border-0 border-b border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 cursor-pointer py-1"
                  >
                    {TRAINING_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  No staff data matches the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
