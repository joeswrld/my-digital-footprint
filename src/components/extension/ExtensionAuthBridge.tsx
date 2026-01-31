/**
 * ExtensionAuthBridge
 * 
 * This component runs on the FixSense dashboard and broadcasts authentication
 * state to the browser extension via window.postMessage. The extension's content
 * script listens for these messages on the FixSense domain only.
 * 
 * Security: Only shares the access token, not refresh tokens or sensitive data.
 * The extension uses this to authenticate API calls to Supabase Edge Functions.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Message type for extension communication
const EXTENSION_MESSAGE_TYPE = 'FIXSENSE_AUTH_STATE';

export const ExtensionAuthBridge = () => {
  useEffect(() => {
    // Function to broadcast auth state to the extension
    const broadcastAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Post message to window - the extension content script listens for this
      window.postMessage({
        type: EXTENSION_MESSAGE_TYPE,
        payload: {
          isAuthenticated: !!session,
          accessToken: session?.access_token || null,
          userId: session?.user?.id || null,
          email: session?.user?.email || null,
          expiresAt: session?.expires_at || null,
        }
      }, window.location.origin);
    };

    // Broadcast initial state
    broadcastAuthState();

    // Listen for auth state changes and broadcast them
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ExtensionAuthBridge] Auth event:', event);
      
      window.postMessage({
        type: EXTENSION_MESSAGE_TYPE,
        payload: {
          isAuthenticated: !!session,
          accessToken: session?.access_token || null,
          userId: session?.user?.id || null,
          email: session?.user?.email || null,
          expiresAt: session?.expires_at || null,
        }
      }, window.location.origin);
    });

    // Also listen for requests from the extension to get current auth state
    const handleExtensionRequest = (event: MessageEvent) => {
      // Only respond to messages from our own origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'FIXSENSE_REQUEST_AUTH_STATE') {
        broadcastAuthState();
      }
    };

    window.addEventListener('message', handleExtensionRequest);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleExtensionRequest);
    };
  }, []);

  // This component doesn't render anything
  return null;
};

export default ExtensionAuthBridge;
