
import { RawSalesData, AggregatedStaffData, FilterState, DashboardMetrics } from '../types';

export const getStaffId = (item: RawSalesData): string => {
  let uniqueId = String(item.SalesmanCode);
  // Check for invalid codes
  // We treat '0', 'undefined', 'null', empty string as invalid
  const isCodeInvalid = !uniqueId || uniqueId === '0' || uniqueId === 'undefined' || uniqueId === 'null';
  
  if (isCodeInvalid) {
    // Composite key
    const name = item.SalesmanName || 'Unknown';
    const room = item.ShowRoom || 'Unknown';
    const counter = item.Counter || 'Unknown';
    return `${name}-${room}-${counter}`;
  }
  return uniqueId;
};

export const processSalesData = (data: RawSalesData[], filters: FilterState) => {
  // 1. Filter Data
  const filtered = data.filter((item) => {
    const matchShowroom = filters.showroom === 'All Showrooms' || item.ShowRoom === filters.showroom;
    const matchMonth = filters.billMonth === 'All Months' || item.BillMo === filters.billMonth;
    const matchCounter = filters.counter === 'All Counters' || item.Counter === filters.counter;
    return matchShowroom && matchMonth && matchCounter;
  });

  // 2. Aggregate by Staff
  const staffMap = new Map<string, AggregatedStaffData>();

  filtered.forEach((item) => {
    const uniqueId = getStaffId(item);
    
    // Determine display code (if it was generated from name, show N/A or empty)
    const isGenerated = uniqueId.includes(item.SalesmanName || 'Unknown'); 
    // A simple heuristic: if ID matches the composite pattern or original code was 0
    const originalCode = String(item.SalesmanCode);
    const displayCode = (!originalCode || originalCode === '0' || originalCode === 'undefined') ? 'N/A' : originalCode;

    if (!staffMap.has(uniqueId)) {
      staffMap.set(uniqueId, {
        id: uniqueId,
        displayCode: displayCode,
        name: item.SalesmanName,
        counter: item.Counter,
        showroom: item.ShowRoom,
        totalSales: 0,
        crossSales: 0,
        crossSalePercentage: 0,
        trainingStatus: item.TrainingStatus || 'Not Available',
        saleRank: 0,
        crossSaleRank: 0,
      });
    }

    const staff = staffMap.get(uniqueId)!;
    
    // Parse values to ensure they are numbers (handle potential dirty excel data)
    const sales = Number(item.TotalSales) || 0;
    const cross = Number(item.CrossSales) || 0;

    staff.totalSales += sales;
    staff.crossSales += cross;
    
    // We maintain the latest status or default.
    if (item.TrainingStatus && item.TrainingStatus !== 'Not Available') {
      staff.trainingStatus = item.TrainingStatus;
    }
  });

  const staffList = Array.from(staffMap.values());

  // 3. Calculate Percentages
  staffList.forEach(staff => {
    staff.crossSalePercentage = staff.totalSales > 0 
      ? parseFloat(((staff.crossSales / staff.totalSales) * 100).toFixed(1)) 
      : 0;
  });

  // 4. Calculate Ranks
  // Sort by Total Sales for Sales Rank
  const bySales = [...staffList].sort((a, b) => b.totalSales - a.totalSales);
  bySales.forEach((staff, index) => {
    // We match by reference since objects in staffList are the same as in bySales
    staff.saleRank = index + 1;
  });

  // Sort by Cross Sales for Cross Sale Rank
  const byCross = [...staffList].sort((a, b) => b.crossSales - a.crossSales);
  byCross.forEach((staff, index) => {
    staff.crossSaleRank = index + 1;
  });

  // 5. Dashboard Metrics
  const totalSales = filtered.reduce((acc, curr) => acc + (Number(curr.TotalSales) || 0), 0);
  const totalCrossSales = filtered.reduce((acc, curr) => acc + (Number(curr.CrossSales) || 0), 0);
  const crossSalePercentage = totalSales > 0 ? (totalCrossSales / totalSales) * 100 : 0;

  // Aggregate Product Categories for Chart
  const productCategories = ['Bangle', 'Chain', 'Earrings', 'Ethnic&Vint', 'Kids', 'Necklace', 'Oriana', 'Ring', 'Others'];
  const topProductsMap = new Map<string, number>();
  
  filtered.forEach(item => {
    productCategories.forEach(cat => {
      // Basic normalization of keys from Excel
      // Try exact match, then case insensitive match
      let val = Number(item[cat]);
      if (isNaN(val)) {
         const key = Object.keys(item).find(k => k.toLowerCase().includes(cat.toLowerCase()));
         val = key ? Number(item[key]) : 0;
      }
      topProductsMap.set(cat, (topProductsMap.get(cat) || 0) + (val || 0));
    });
  });

  const topProducts = Array.from(topProductsMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8

  return {
    staffData: staffList,
    metrics: {
      totalSales,
      totalCrossSales,
      crossSalePercentage: parseFloat(crossSalePercentage.toFixed(1)),
      topProducts
    }
  };
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value);
};
