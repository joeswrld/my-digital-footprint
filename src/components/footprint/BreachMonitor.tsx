import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldX, ExternalLink, Calendar, Lock, Database } from 'lucide-react';
import { format } from 'date-fns';
import { DiscoveredAccount } from '@/types/database';
import { cn } from '@/lib/utils';

interface BreachMonitorProps {
  accounts: DiscoveredAccount[];
}

interface BreachInfo {
  domain: string;
  name: string;
  breachDate: string;
  dataExposed: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: string;
}

// Mock breach database (in production, this would come from HaveIBeenPwned API or similar)
const KNOWN_BREACHES: Record<string, BreachInfo> = {
  'linkedin.com': {
    domain: 'linkedin.com',
    name: 'LinkedIn',
    breachDate: '2021-04-08',
    dataExposed: ['Email', 'Name', 'Phone', 'Employment data'],
    severity: 'high',
    affectedUsers: '700M',
  },
  'adobe.com': {
    domain: 'adobe.com',
    name: 'Adobe',
    breachDate: '2013-10-04',
    dataExposed: ['Email', 'Password hints', 'Encrypted passwords'],
    severity: 'critical',
    affectedUsers: '153M',
  },
  'dropbox.com': {
    domain: 'dropbox.com',
    name: 'Dropbox',
    breachDate: '2012-07-01',
    dataExposed: ['Email', 'Password'],
    severity: 'high',
    affectedUsers: '68M',
  },
  'myspace.com': {
    domain: 'myspace.com',
    name: 'MySpace',
    breachDate: '2008-06-01',
    dataExposed: ['Email', 'Password', 'Username'],
    severity: 'medium',
    affectedUsers: '360M',
  },
  'twitter.com': {
    domain: 'twitter.com',
    name: 'Twitter',
    breachDate: '2023-01-05',
    dataExposed: ['Email', 'Phone'],
    severity: 'medium',
    affectedUsers: '200M',
  },
};

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  low: { color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Low' },
  medium: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Medium' },
  high: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'High' },
  critical: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Critical' },
};

export const BreachMonitor = ({ accounts }: BreachMonitorProps) => {
  const breaches = useMemo(() => {
    const detected: (BreachInfo & { accountId: string })[] = [];
    
    accounts.forEach((account) => {
      const breachKey = Object.keys(KNOWN_BREACHES).find((domain) =>
        account.domain.includes(domain)
      );
      
      if (breachKey) {
        detected.push({
          ...KNOWN_BREACHES[breachKey],
          accountId: account.id,
        });
      }
    });
    
    // Sort by severity (critical first) and then by date
    return detected.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.breachDate).getTime() - new Date(a.breachDate).getTime();
    });
  }, [accounts]);

  if (breaches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5" />
            Breach Monitor
          </CardTitle>
          <CardDescription>Monitoring your accounts for known data breaches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-500/10 p-3">
              <Lock className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No breaches detected</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              None of your discovered accounts appear in our breach database. We'll continue
              monitoring.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Breach Monitor
            </CardTitle>
            <CardDescription>
              {breaches.length} of your accounts appear in known data breaches
            </CardDescription>
          </div>
          <Badge variant="destructive">{breaches.length} breaches</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {breaches.map((breach, index) => {
          const severity = SEVERITY_CONFIG[breach.severity];
          
          return (
            <div
              key={`${breach.domain}-${index}`}
              className={cn(
                'rounded-lg border p-4',
                severity.bgColor,
                'border-current/10'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-full p-2', severity.bgColor)}>
                    <Database className={cn('h-5 w-5', severity.color)} />
                  </div>
                  <div>
                    <h4 className="font-medium">{breach.name}</h4>
                    <p className="text-sm text-muted-foreground">{breach.domain}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(severity.color, 'border-current/30')}
                >
                  {severity.label} Severity
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Breach Date</p>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(breach.breachDate), 'MMMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Affected Users</p>
                  <p className="mt-1 text-sm">{breach.affectedUsers}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Data Exposed</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {breach.dataExposed.slice(0, 3).map((data) => (
                      <Badge key={data} variant="secondary" className="text-xs">
                        {data}
                      </Badge>
                    ))}
                    {breach.dataExposed.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{breach.dataExposed.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`https://${breach.domain}/account/security`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Change Password
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button size="sm" variant="ghost">
                  View Details
                </Button>
              </div>
            </div>
          );
        })}

        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Change passwords for all breached services and enable 2FA where
            available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
