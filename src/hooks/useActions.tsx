import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AccountAction, ActionType } from '@/types/database';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const actionsQuery = useQuery({
    queryKey: ['actions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('account_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccountAction[];
    },
    enabled: !!user,
  });

  const createActionMutation = useMutation({
    mutationFn: async ({
      accountId,
      actionType,
      notes,
    }: {
      accountId: string;
      actionType: ActionType;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('account_actions')
        .insert({
          user_id: user.id,
          discovered_account_id: accountId,
          action_type: actionType,
          status: 'pending',
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Update metrics - first action tracking
      const { data: metrics } = await supabase
        .from('user_metrics')
        .select('first_action_at, actions_taken_count')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('user_metrics')
        .update({
          actions_taken_count: (metrics?.actions_taken_count || 0) + 1,
          first_action_at: metrics?.first_action_at || new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      const actionLabel = variables.actionType === 'deletion' ? 'Deletion' : 'Revoke';
      toast.success(`${actionLabel} request submitted`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit request');
    },
  });

  return {
    actions: actionsQuery.data || [],
    isLoading: actionsQuery.isLoading,
    error: actionsQuery.error,
    createAction: createActionMutation.mutate,
    isCreating: createActionMutation.isPending,
  };
}
