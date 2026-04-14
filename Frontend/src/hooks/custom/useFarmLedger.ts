/**
 * Custom hook for managing Farm Ledger operations
 */

import { useState, useEffect } from 'react';
import { 
  createLedger, 
  updateLedger, 
  deleteLedger, 
  getUserLedgers, 
  getAllLedgers,
  calculateLedgerSummary,
  addActivity,
  updateLedgerStatus
} from '@/services/farmLedgerService';
import { 
  FarmLedger, 
  LedgerSummary, 
  LedgerFilters, 
  ActivityRecord
} from '@/services/types';
import { useToast } from '@/hooks/use-toast';
import { useCrops } from '@/contexts/CropContext';

export const useFarmLedger = (userId?: string, isAdmin: boolean = false) => {
  const { toast } = useToast();
  const { getCropById } = useCrops();
  const [ledgers, setLedgers] = useState<FarmLedger[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalInvestment: 0,
    totalExpenses: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageProfitMargin: 0,
    activeLedgers: 0,
    completedLedgers: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedLedger, setSelectedLedger] = useState<FarmLedger | null>(null);
  const [filters, setFilters] = useState<LedgerFilters>({
    status: 'all',
    crop: 'all',
    dateRange: { start: null, end: null },
    searchQuery: ''
  });

  // Load ledgers on mount or when userId changes
  useEffect(() => {
    if (userId || isAdmin) {
      loadLedgers();
    }
  }, [userId, isAdmin]);

  // Recalculate summary when ledgers change
  useEffect(() => {
    const calculatedSummary = calculateLedgerSummary(ledgers);
    setSummary(calculatedSummary);
  }, [ledgers]);

  const loadLedgers = async () => {
    setLoading(true);
    try {
      let allLedgers: FarmLedger[] = [];
      
      if (isAdmin) {
        // For admin, try to get all ledgers but handle errors gracefully
        try {
          allLedgers = await getAllLedgers(getCropById);
        } catch (adminError) {
          console.warn('Admin could not load all ledgers, falling back:', adminError);
          allLedgers = [];
        }
      } else if (userId) {
        try {
          allLedgers = await getUserLedgers(userId, getCropById);
        } catch (userError) {
          console.warn('User could not load ledgers:', userError);
          allLedgers = [];
        }
      }
      
      // Apply filters
      let filteredLedgers = allLedgers;
      
      if (filters.status !== 'all') {
        filteredLedgers = filteredLedgers.filter(l => l.status === filters.status);
      }
      if (filters.crop !== 'all') {
        filteredLedgers = filteredLedgers.filter(l => 
          l.crop.toLowerCase() === filters.crop.toLowerCase()
        );
      }
      if (filters.dateRange.start) {
        filteredLedgers = filteredLedgers.filter(l => 
          new Date(l.date) >= new Date(filters.dateRange.start!)
        );
      }
      if (filters.dateRange.end) {
        filteredLedgers = filteredLedgers.filter(l => 
          new Date(l.date) <= new Date(filters.dateRange.end!)
        );
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredLedgers = filteredLedgers.filter(l => 
          l.crop.toLowerCase().includes(query) ||
          l.location.toLowerCase().includes(query) ||
          l.generalNotes?.toLowerCase().includes(query)
        );
      }
      
      setLedgers(filteredLedgers);
    } catch (error) {
      console.error('Error loading ledgers:', error);
      // Don't show toast for permission errors or empty collections
      const errorMessage = error instanceof Error ? error.message : '';
      if (!errorMessage.includes('permission') && !errorMessage.includes('does not exist')) {
        toast({
          title: 'Error',
          description: 'Failed to load ledger data.',
          variant: 'destructive'
        });
      }
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewLedger = async (ledgerData: Omit<FarmLedger, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    try {
      if (!userId) {
        toast({
          title: 'Error',
          description: 'User ID is required.',
          variant: 'destructive'
        });
        return null;
      }
      
      const ledgerId = await createLedger({
        ...ledgerData,
        userId
      });
      
      toast({
        title: 'Success',
        description: 'Ledger entry created successfully.'
      });
      
      await loadLedgers();
      return ledgerId;
    } catch (error) {
      console.error('Error creating ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ledger entry.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateExistingLedger = async (ledgerId: string, updates: Partial<FarmLedger>) => {
    try {
      await updateLedger(ledgerId, updates);
      
      toast({
        title: 'Success',
        description: 'Ledger updated successfully.'
      });
      
      await loadLedgers();
    } catch (error) {
      console.error('Error updating ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ledger.',
        variant: 'destructive'
      });
    }
  };

  const removeLedger = async (ledgerId: string) => {
    try {
      await deleteLedger(ledgerId);
      
      toast({
        title: 'Success',
        description: 'Ledger deleted successfully.'
      });
      
      await loadLedgers();
    } catch (error) {
      console.error('Error deleting ledger:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ledger.',
        variant: 'destructive'
      });
    }
  };

  const addActivityToLedger = async (ledgerId: string, activity: Omit<ActivityRecord, 'id' | 'createdAt'>) => {
    try {
      await addActivity(ledgerId, activity);
      
      toast({
        title: 'Success',
        description: 'Activity added successfully.'
      });
      
      await loadLedgers();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to add activity.',
        variant: 'destructive'
      });
    }
  };

  const changeLedgerStatus = async (ledgerId: string, status: string, additionalData?: Partial<FarmLedger>) => {
    try {
      await updateLedgerStatus(ledgerId, status as any, additionalData);
      
      toast({
        title: 'Success',
        description: 'Ledger status updated.'
      });
      
      await loadLedgers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive'
      });
    }
  };

  const updateFilters = (newFilters: Partial<LedgerFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      crop: 'all',
      dateRange: { start: null, end: null },
      searchQuery: ''
    });
  };

  const selectLedger = (ledger: FarmLedger) => {
    setSelectedLedger(ledger);
  };

  return {
    ledgers,
    summary,
    loading,
    selectedLedger,
    filters,
    createNewLedger,
    updateExistingLedger,
    removeLedger,
    addActivityToLedger,
    changeLedgerStatus,
    updateFilters,
    clearFilters,
    selectLedger,
    loadLedgers
  };
};
