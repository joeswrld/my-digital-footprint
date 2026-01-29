import { useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useActions } from '@/hooks/useActions';
import { useMetrics } from '@/hooks/useMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { ArrowLeft, TrendingUp, PieChartIcon, Activity, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ChartSkeleton } from '@/components/analytics/ChartSkeleton';
import { EmptyState } from '@/components/analytics/EmptyState';

const CATEGORY_COLORS: Record<string, string> = {
  social: 'hsl(217, 91%, 60%)',
  finance: 'hsl(142, 71%, 45%)',
  shopping: 'hsl(38, 92%, 50%)',
  saas: 'hsl(262, 83%, 58%)',
  other: 'hsl(215, 16%, 47%)',
};

const RISK_COLORS: Record<string, string> = {
  low: 'hsl(142, 71%, 45%)',
  medium: 'hsl(38, 92%, 50%)',
  high: 'hsl(0, 72%, 51%)',
};

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { actions, isLoading: actionsLoading } = useActions();
  const { metrics } = useMetrics();

  const isLoading = authLoading || accountsLoading || actionsLoading;

  // Category distribution data
  const categoryData = useMemo(() => {
    if (!accounts) return [];
    const counts: Record<string, number> = {};
    accounts.forEach((acc) => {
      const cat = acc.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: CATEGORY_COLORS[name] || CATEGORY_COLORS.other,
    }));
  }, [accounts]);

  // Risk distribution data
  const riskData = useMemo(() => {
    if (!accounts) return [];
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0 };
    accounts.forEach((acc) => {
      const risk = acc.risk_score || 'low';
      counts[risk] = (counts[risk] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: RISK_COLORS[name],
    }));
  }, [accounts]);

  // Action completion rates
  const actionStats = useMemo(() => {
    if (!actions) return { pending: 0, completed: 0, failed: 0 };
    return {
      pending: actions.filter((a) => a.status === 'pending' || a.status === 'in_progress').length,
      completed: actions.filter((a) => a.status === 'completed').length,
      failed: actions.filter((a) => a.status === 'failed').length,
    };
  }, [actions]);

  const actionCompletionData = [
    { name: 'Pending', value: actionStats.pending, fill: 'hsl(217, 91%, 60%)' },
    { name: 'Completed', value: actionStats.completed, fill: 'hsl(142, 71%, 45%)' },
    { name: 'Failed', value: actionStats.failed, fill: 'hsl(0, 72%, 51%)' },
  ];

  // Discovery trend (last 30 days)
  const discoveryTrend = useMemo(() => {
    if (!accounts) return [];
    const days = 30;
    const data: { date: string; count: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const count = accounts.filter((acc) => {
        const accDate = startOfDay(new Date(acc.first_seen));
        return accDate.getTime() === day.getTime();
      }).length;
      data.push({
        date: format(day, 'MMM d'),
        count,
      });
    }
    return data;
  }, [accounts]);

  // Action type breakdown
  const actionTypeData = useMemo(() => {
    if (!actions) return [];
    const counts: Record<string, number> = { deletion: 0, revoke: 0 };
    actions.forEach((a) => {
      counts[a.action_type] = (counts[a.action_type] || 0) + 1;
    });
    return [
      { name: 'Deletion Requests', value: counts.deletion, fill: 'hsl(0, 72%, 51%)' },
      { name: 'Access Revocations', value: counts.revoke, fill: 'hsl(38, 92%, 50%)' },
    ];
  }, [actions]);

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

  const chartConfig = {
    count: { label: 'Accounts', color: 'hsl(var(--accent))' },
    value: { label: 'Count', color: 'hsl(var(--accent))' },
  };

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
            <Activity className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Insights into your account discovery and actions
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Loading Skeleton for Discovery Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton type="area" height="h-[300px]" />
              </CardContent>
            </Card>

            {/* Loading Skeleton for Category Distribution */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-2" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton type="pie" />
              </CardContent>
            </Card>

            {/* Loading Skeleton for Risk Distribution */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton type="horizontal-bar" />
              </CardContent>
            </Card>

            {/* Loading Skeleton for Action Status */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton type="pie" />
              </CardContent>
            </Card>

            {/* Loading Skeleton for Action Types */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-44 mt-2" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton type="bar" />
              </CardContent>
            </Card>

            {/* Loading Skeleton for Summary Stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-16 mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Discovery Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Account Discovery Trend
                </CardTitle>
                <CardDescription>New accounts discovered over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart data={discoveryTrend}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--accent))"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Category Distribution
                </CardTitle>
                <CardDescription>Accounts by service category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <EmptyState type="category" />
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Accounts by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                {riskData.every((d) => d.value === 0) ? (
                  <EmptyState type="risk" />
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={riskData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        type="number"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        width={80}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Action Completion */}
            <Card>
              <CardHeader>
                <CardTitle>Action Status</CardTitle>
                <CardDescription>Status of deletion and revocation requests</CardDescription>
              </CardHeader>
              <CardContent>
                {actions?.length === 0 ? (
                  <EmptyState type="actions" />
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart>
                      <Pie
                        data={actionCompletionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                        labelLine={false}
                      >
                        {actionCompletionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Action Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Action Types</CardTitle>
                <CardDescription>Breakdown by action type</CardDescription>
              </CardHeader>
              <CardContent>
                {actions?.length === 0 ? (
                  <EmptyState type="actions" />
                ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={actionTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        className="text-xs"
                      />
                      <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {actionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Total Accounts</p>
                    <p className="text-3xl font-bold">{accounts?.length || 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Total Actions</p>
                    <p className="text-3xl font-bold">{actions?.length || 0}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-3xl font-bold">
                      {actions?.length
                        ? `${Math.round((actionStats.completed / actions.length) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">High-Risk Accounts</p>
                    <p className="text-3xl font-bold text-risk-high">
                      {accounts?.filter((a) => a.risk_score === 'high').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
