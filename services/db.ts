import { createClient } from '@supabase/supabase-js';
import { RawSalesData } from '../types';
import { getStaffId } from '../utils/dataHelpers';

// --- CONFIGURATION ---
// Helper to safely get env vars in Vite or CRA environments
const getEnv = (key: string, viteKey?: string) => {
  // Check Vite (import.meta.env)
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    if (viteKey && meta.env[viteKey]) return meta.env[viteKey];
    if (meta.env[key]) return meta.env[key];
  }
  // Check Node/CRA (process.env)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// PASTE YOUR SUPABASE DETAILS HERE
const SUPABASE_URL = getEnv('REACT_APP_SUPABASE_URL', 'VITE_SUPABASE_URL') || 'https://mjwgbtivwbiwwaxkdftv.supabase.co';
const SUPABASE_KEY = getEnv('REACT_APP_SUPABASE_KEY', 'VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qd2didGl2d2Jpd3dheGtkZnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTYyNjIsImV4cCI6MjA4MTA5MjI2Mn0.BYPthvDD6A_hhVoZ__4FJN9fgO_AqmZlS-TF6o6MO_o';

// Toggle this to TRUE to enable the database connection
const USE_SUPABASE = true;

let supabase: any = null;

// Only initialize if we have values
if (USE_SUPABASE && SUPABASE_URL.startsWith('http')) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const STORAGE_KEY = 'app_sales_data';

export const db = {
  // Fetch data
  getData: async (): Promise<RawSalesData[]> => {
    if (USE_SUPABASE && supabase) {
      // Fetch both the main data ('latest') and the training status overrides ('training_map')
      // This reduces data transfer when only updating statuses
      const { data, error } = await supabase
        .from('sales_data')
        .select('*')
        .in('id', ['latest', 'training_map']);
      
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Supabase fetch error:', error);
        }
        return [];
      }

      const latestRow = data?.find((r: any) => r.id === 'latest');
      const mapRow = data?.find((r: any) => r.id === 'training_map');

      const rawData: RawSalesData[] = latestRow?.data || [];
      const statusMap: Record<string, string> = mapRow?.data || {};

      // Merge Overrides: Apply status map to the raw data
      if (Object.keys(statusMap).length > 0 && rawData.length > 0) {
        return rawData.map(item => {
           const id = getStaffId(item);
           if (statusMap[id]) {
             return { ...item, TrainingStatus: statusMap[id] };
           }
           return item;
        });
      }

      return rawData;
    } else {
      // Fallback to LocalStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  // Save full dataset (Used when uploading Excel)
  saveData: async (data: RawSalesData[]): Promise<void> => {
    if (USE_SUPABASE && supabase) {
      // Save the heavy excel data to 'latest'
      const { error } = await supabase
        .from('sales_data')
        .upsert({ id: 'latest', data: data });
      
      if (error) {
        console.error('Supabase save error:', error);
        throw error;
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  },

  // Optimized update for training status
  updateTrainingStatus: async (fullData: RawSalesData[]): Promise<void> => {
     if (USE_SUPABASE && supabase) {
        // FAST SAVE: Extract only the status map and save that.
        // This payload is tiny (~KB) compared to the full dataset (~MB).
        const statusMap: Record<string, string> = {};
        
        fullData.forEach(item => {
           // We map the status by ID. 
           // Only save status if it is meaningful (though saving all ensures consistency)
           if (item.TrainingStatus) {
              const id = getStaffId(item);
              statusMap[id] = item.TrainingStatus;
           }
        });

        const { error } = await supabase
          .from('sales_data')
          .upsert({ id: 'training_map', data: statusMap });
        
        if (error) throw error;

     } else {
        // Fallback for localstorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
     }
  }
};