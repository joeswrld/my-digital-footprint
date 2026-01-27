import { ReactNode } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  // Initialize realtime notifications
  useRealtimeNotifications();
  
  return <>{children}</>;
}
