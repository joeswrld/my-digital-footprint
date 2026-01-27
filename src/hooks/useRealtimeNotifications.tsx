import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface DiscoveredAccountPayload {
  id: string;
  user_id: string;
  service_name: string;
  domain: string;
  category: string;
  source: string;
}

interface AccountActionPayload {
  id: string;
  user_id: string;
  action_type: string;
  status: string;
  discovered_account_id: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new discovered accounts
    const accountsChannel = supabase
      .channel('discovered_accounts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discovered_accounts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<DiscoveredAccountPayload>) => {
          const newAccount = payload.new as DiscoveredAccountPayload;
          
          // Show toast notification
          toast.success(`New account discovered: ${newAccount.service_name}`, {
            description: `Found via ${newAccount.source === 'gmail_scan' ? 'Gmail scan' : 'manual entry'}`,
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/account/${newAccount.id}`;
              },
            },
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          queryClient.invalidateQueries({ queryKey: ['metrics'] });
        }
      )
      .subscribe();

    // Subscribe to action status changes
    const actionsChannel = supabase
      .channel('account_actions_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'account_actions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<AccountActionPayload>) => {
          const updatedAction = payload.new as AccountActionPayload;
          
          if (updatedAction.status === 'completed') {
            toast.success(
              `${updatedAction.action_type === 'deletion' ? 'Deletion' : 'Revocation'} completed!`,
              {
                description: 'The action has been successfully processed.',
              }
            );
          } else if (updatedAction.status === 'failed') {
            toast.error(
              `${updatedAction.action_type === 'deletion' ? 'Deletion' : 'Revocation'} failed`,
              {
                description: 'Please try again or contact support.',
              }
            );
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['actions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, [user, queryClient]);
}
