import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserMetrics } from '@/types/database';
import { useAuth } from './useAuth';

export function useMetrics() {
  const { user } = useAuth();

  const metricsQuery = useQuery({
    queryKey: ['metrics', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserMetrics | null;
    },
    enabled: !!user,
  });

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
  };
}
