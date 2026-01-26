import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DiscoveredAccount, AccountCategory, RiskLevel } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('discovered_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as DiscoveredAccount[];
    },
    enabled: !!user,
  });

  const addAccountMutation = useMutation({
    mutationFn: async (account: {
      service_name: string;
      domain: string;
      category: AccountCategory;
      first_seen: string;
      risk_score?: RiskLevel;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('discovered_accounts')
        .insert({
          user_id: user.id,
          service_name: account.service_name,
          domain: account.domain,
          category: account.category,
          first_seen: account.first_seen,
          last_activity: new Date().toISOString(),
          risk_score: account.risk_score || 'low',
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;

      // Update metrics
      await supabase
        .from('user_metrics')
        .update({
          accounts_discovered_count: (accountsQuery.data?.length || 0) + 1,
          last_active_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Account added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add account');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('discovered_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Account removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove account');
    },
  });

  return {
    accounts: accountsQuery.data || [],
    isLoading: accountsQuery.isLoading,
    error: accountsQuery.error,
    addAccount: addAccountMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    isAdding: addAccountMutation.isPending,
    isDeleting: deleteAccountMutation.isPending,
  };
}
