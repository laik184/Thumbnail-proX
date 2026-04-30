import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentActivityEntry {
  id: string;
  type: 'download' | 'create';
  thumbnailUri: string;
  title: string;
  createdAt: number;
}

interface RecentActivityContextType {
  entries: RecentActivityEntry[];
  addEntry: (entry: Omit<RecentActivityEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  isLoaded: boolean;
}

const RecentActivityContext = createContext<RecentActivityContextType | null>(null);

export function RecentActivityProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<RecentActivityEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem('@recent_activity');
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent activity', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const addEntry = async (entry: Omit<RecentActivityEntry, 'id' | 'createdAt'>) => {
    try {
      const newEntry: RecentActivityEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        createdAt: Date.now(),
      };
      
      const updatedEntries = [newEntry, ...entries].slice(0, 20); // Keep max 20
      await AsyncStorage.setItem('@recent_activity', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (e) {
      console.error('Failed to add entry', e);
    }
  };

  const removeEntry = async (id: string) => {
    try {
      const updatedEntries = entries.filter((e) => e.id !== id);
      await AsyncStorage.setItem('@recent_activity', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (e) {
      console.error('Failed to remove entry', e);
    }
  };

  return (
    <RecentActivityContext.Provider value={{ entries, addEntry, removeEntry, isLoaded }}>
      {children}
    </RecentActivityContext.Provider>
  );
}

export function useRecentActivity() {
  const context = useContext(RecentActivityContext);
  if (!context) throw new Error('useRecentActivity must be used within RecentActivityProvider');
  return context;
}
