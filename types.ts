
export interface RawSalesData {
  SalesmanCode: string | number;
  SalesmanName: string;
  ShowRoom: string;
  BillMo: string;
  Counter: string;
  TotalSales: number;
  CrossSales: number;
  TrainingStatus: string;
  [key: string]: any; // Allow for dynamic product columns like Bangle, Chain etc.
}

export interface AggregatedStaffData {
  id: string; // Unique identifier (code or composite) for updates
  displayCode: string; // Visual code to show in table
  name: string;
  counter: string;
  showroom: string;
  totalSales: number;
  crossSales: number;
  crossSalePercentage: number;
  trainingStatus: string;
  saleRank: number;
  crossSaleRank: number;
}

export interface DashboardMetrics {
  totalSales: number;
  totalCrossSales: number;
  crossSalePercentage: number;
  topProducts: { name: string; value: number }[];
}

export type TrainingStatusType = 'Completed' | 'In Progress' | 'Not Applicable' | 'Not Available';

export const TRAINING_STATUS_OPTIONS: TrainingStatusType[] = [
  'Completed',
  'In Progress',
  'Not Applicable',
  'Not Available'
];

export interface FilterState {
  showroom: string;
  billMonth: string;
  counter: string;
}
