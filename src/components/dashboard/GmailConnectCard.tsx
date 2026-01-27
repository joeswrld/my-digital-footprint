import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGmailConnect } from '@/hooks/useGmailConnect';
import { useMetrics } from '@/hooks/useMetrics';

export function GmailConnectCard() {
  const { connectGmail, scanEmails, isConnecting, isScanning } = useGmailConnect();
  const { metrics } = useMetrics();

  const isConnected = metrics?.gmail_connected;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${isConnected ? 'bg-success/10' : 'bg-primary/10'}`}>
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <Mail className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-base">
              {isConnected ? 'Gmail Connected' : 'Connect Gmail'}
            </CardTitle>
            <CardDescription className="text-sm">
              {isConnected
                ? 'Automatically discover accounts from your inbox'
                : 'Scan your emails to find services you\'ve signed up for'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={scanEmails}
            disabled={isScanning}
            className="w-full"
          >
            {isScanning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan Emails
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={connectGmail}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail
              </>
            )}
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          We only read email metadata (sender, subject, date). Your email content stays private.
        </p>
      </CardContent>
    </Card>
  );
}
