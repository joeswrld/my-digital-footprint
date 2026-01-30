import { useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useActions } from '@/hooks/useActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  TrendingDown,
  AlertTriangle,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  Clock,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { FootprintScore } from '@/components/footprint/FootprintScore';
import { AccountGraph } from '@/components/footprint/AccountGraph';
import { BreachMonitor } from '@/components/footprint/BreachMonitor';
import { FootprintSkeleton } from '@/components/footprint/FootprintSkeleton';

const Footprint = () => {
  const { user, loading: authLoading } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { actions, isLoading: actionsLoading } = useActions();

  const isLoading = authLoading || accountsLoading || actionsLoading;

  // Calculate footprint metrics
  const footprintMetrics = useMemo(() => {
    if (!accounts) return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeAccounts = accounts.filter((acc) => {
      if (!acc.last_activity) return false;
      return new Date(acc.last_activity) >= thirtyDaysAgo;
    });

    const inactiveAccounts = accounts.filter((acc) => {
      if (!acc.last_activity) return true;
      return new Date(acc.last_activity) < thirtyDaysAgo;
    });

    const highRiskAccounts = accounts.filter((acc) => acc.risk_score === 'high');
    const mediumRiskAccounts = accounts.filter((acc) => acc.risk_score === 'medium');

    // Calculate exposure score (0-100)
    // Formula: Base score from account count + risk modifiers + inactivity penalty
    const baseScore = Math.min(accounts.length * 5, 40); // Max 40 from count
    const riskScore = highRiskAccounts.length * 15 + mediumRiskAccounts.length * 5; // Risk contribution
    const inactivityPenalty = Math.min(inactiveAccounts.length * 3, 20); // Inactive accounts add risk
    const exposureScore = Math.min(Math.round(baseScore + riskScore + inactivityPenalty), 100);

    // Mock breach data (in real app, this would come from an API like HaveIBeenPwned)
    const breachedServices = accounts.filter((acc) => {
      // Simulate breach detection based on well-known breached domains
      const breachedDomains = ['linkedin.com', 'adobe.com', 'dropbox.com', 'myspace.com'];
      return breachedDomains.some((d) => acc.domain.includes(d));
    });

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      inactiveAccounts: inactiveAccounts.length,
      highRiskAccounts: highRiskAccounts.length,
      mediumRiskAccounts: mediumRiskAccounts.length,
      breachedServices: breachedServices.length,
      exposureScore,
      accounts,
    };
  }, [accounts]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        {/* Header */}
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg bg-accent/10 p-2">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Digital Footprint</h1>
            <p className="text-muted-foreground">
              Your complete digital presence overview
            </p>
          </div>
        </div>

        {isLoading ? (
          <FootprintSkeleton />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Exposure Score - Large Card */}
            <div className="lg:col-span-1">
              <FootprintScore
                score={footprintMetrics?.exposureScore || 0}
                totalAccounts={footprintMetrics?.totalAccounts || 0}
                highRiskCount={footprintMetrics?.highRiskAccounts || 0}
                breachedCount={footprintMetrics?.breachedServices || 0}
              />
            </div>

            {/* Summary Stats */}
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Accounts</p>
                      <p className="text-2xl font-bold">{footprintMetrics?.totalAccounts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <Activity className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold">{footprintMetrics?.activeAccounts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Inactive</p>
                      <p className="text-2xl font-bold">{footprintMetrics?.inactiveAccounts || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">High Risk</p>
                      <p className="text-2xl font-bold text-destructive">
                        {footprintMetrics?.highRiskAccounts || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-500/10 p-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Medium Risk</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        {footprintMetrics?.mediumRiskAccounts || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-600/10 p-2">
                      <Zap className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Breached</p>
                      <p className="text-2xl font-bold text-red-600">
                        {footprintMetrics?.breachedServices || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Breach Monitor */}
            <div className="lg:col-span-3">
              <BreachMonitor accounts={accounts || []} />
            </div>

            {/* Account Graph */}
            <div className="lg:col-span-3">
              <AccountGraph accounts={accounts || []} actions={actions || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Footprint;
