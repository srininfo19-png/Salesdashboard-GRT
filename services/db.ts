import { createClient } from '@supabase/supabase-js';
import { RawSalesData } from '../types';

// --- CONFIGURATION ---
// PASTE YOUR SUPABASE DETAILS HERE
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://mjwgbtivwbiwwaxkdftv.supabase.co';
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qd2didGl2d2Jpd3dheGtkZnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTYyNjIsImV4cCI6MjA4MTA5MjI2Mn0.BYPthvDD6A_hhVoZ__4FJN9fgO_AqmZlS-TF6o6MO_o';

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
      // Fetch the row with id 'latest'
      const { data, error } = await supabase
        .from('sales_data')
        .select('data')
        .eq('id', 'latest')
        .single();
      
      if (error) {
        // If error is "Row not found", it just means it's the first time running.
        if (error.code !== 'PGRST116') {
          console.error('Supabase fetch error:', error);
        }
        return [];
      }
      return data?.data || [];
    } else {
      // Fallback to LocalStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  // Save full dataset
  saveData: async (data: RawSalesData[]): Promise<void> => {
    if (USE_SUPABASE && supabase) {
      // Upsert: Insert if 'latest' doesn't exist, update if it does
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

  updateTrainingStatus: async (fullData: RawSalesData[]): Promise<void> => {
    return db.saveData(fullData);
  }
};