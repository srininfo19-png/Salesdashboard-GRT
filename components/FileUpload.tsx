import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { RawSalesData } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: RawSalesData[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const binaryStr = event.target?.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Parse data
      const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
      
      // Robust key finder helper
      const getVal = (row: any, keys: string[]) => {
        // 1. Direct match
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
        }
        // 2. Case insensitive or space-insensitive match (e.g. "Show Room" vs "ShowRoom")
        const rowKeys = Object.keys(row);
        for (const k of keys) {
           const normalizedKey = k.toLowerCase().replace(/\s/g, '');
           const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/\s/g, '') === normalizedKey);
           if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      // Normalize data with expanded key list
      const normalizedData: RawSalesData[] = rawData.map(row => ({
        SalesmanCode: getVal(row, ['SalesmanCode', 'Salesman Code', 'SALEMANCO', 'Code', 'Staff Code', 'EmpID']) || 0,
        SalesmanName: getVal(row, ['SalesmanName', 'Salesman Name', 'SALESMANNAME', 'Name', 'Staff Name']) || '',
        ShowRoom: getVal(row, ['ShowRoom', 'Showroom', 'Show Room', 'Branch']) || '',
        BillMo: getVal(row, ['BillMo', 'Bill Month', 'BillMonth', 'Month', 'Date']) || '',
        Counter: getVal(row, ['Counter', 'Count', 'Department']) || 'Others',
        TotalSales: getVal(row, ['TotalSales', 'Total Sales', 'TotalSale', 'Total Sale', 'Sales', 'Net Sales']) || 0,
        CrossSales: getVal(row, ['CrossSales', 'Cross Sales', 'CrossSale', 'Cross Sale']) || 0,
        TrainingStatus: getVal(row, ['TrainingStatus', 'Training Status', 'Training', 'Status']) || 'Not Available',
        ...row 
      }));

      onDataLoaded(normalizedData);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col items-center justify-center text-center">
      <div 
        className="cursor-pointer group flex flex-col items-center"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Upload size={24} />
        </div>
        <h3 className="text-gray-900 font-medium">Upload Sales Data</h3>
        <p className="text-gray-500 text-sm mt-1">Click to select an Excel (.xlsx) file</p>
      </div>
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};
