import { createClient } from '@supabase/supabase-js';
import { RawSalesData } from '../types';

// --- CONFIGURATION ---
// To enable Supabase:
// 1. Create a Supabase project at https://supabase.com
// 2. Create a table named 'sales_data' with a 'jsonb' column named 'data' and a 'text' column 'id' (primary key).
// 3. Fill in the url and key below.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

// Toggle this to true once you have configured Supabase
const USE_SUPABASE = false;

let supabase: any = null;
if (USE_SUPABASE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const STORAGE_KEY = 'app_sales_data';

export const db = {
  // Fetch data (from DB or LocalStorage)
  getData: async (): Promise<RawSalesData[]> => {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('sales_data')
        .select('data')
        .eq('id', 'latest')
        .single();
      
      if (error) {
        console.warn('Supabase fetch error (ignoring if first run):', error);
        return [];
      }
      return data?.data || [];
    } else {
      // Fallback to LocalStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  // Save full dataset (Admin upload)
  saveData: async (data: RawSalesData[]): Promise<void> => {
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase
        .from('sales_data')
        .upsert({ id: 'latest', data: data });
      
      if (error) throw error;
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  },

  // Save training status updates
  // In a real relational DB, you'd update specific rows. 
  // For JSON store, we often just save the whole blob again or patch it.
  updateTrainingStatus: async (fullData: RawSalesData[]): Promise<void> => {
    return db.saveData(fullData);
  }
};
