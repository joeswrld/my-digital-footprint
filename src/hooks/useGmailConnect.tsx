import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function useGmailConnect() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'true') {
      toast.success('Gmail connected successfully! Scanning for accounts...');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Trigger scan
      scanEmails();
    } else if (params.get('error')) {
      toast.error('Failed to connect Gmail. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connectGmail = useCallback(async () => {
    if (!session?.access_token) {
      toast.error('Please sign in first');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch(
        `https://gsvkwedgiwwvnroghbzr.supabase.co/functions/v1/gmail-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            redirect_uri: window.location.origin + '/dashboard',
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Gmail connect error:', error);
      toast.error('Failed to start Gmail connection');
      setIsConnecting(false);
    }
  }, [session]);

  const scanEmails = useCallback(async () => {
    if (!session?.access_token) {
      toast.error('Please sign in first');
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch(
        `https://gsvkwedgiwwvnroghbzr.supabase.co/functions/v1/gmail-scan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Discovered ${data.discovered} new accounts from ${data.total_scanned} emails`);
      
      // Refresh accounts list
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    } catch (error) {
      console.error('Gmail scan error:', error);
      toast.error('Failed to scan emails');
    } finally {
      setIsScanning(false);
    }
  }, [session, queryClient]);

  return {
    connectGmail,
    scanEmails,
    isConnecting,
    isScanning,
  };
}
