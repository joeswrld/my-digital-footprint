import { Card, CardContent } from '@/components/ui/card';
import { UserMetrics } from '@/types/database';
import { Globe, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MetricsCardsProps {
  accountsCount: number;
  pendingActionsCount: number;
  metrics: UserMetrics | null;
}

export function MetricsCards({ accountsCount, pendingActionsCount, metrics }: MetricsCardsProps) {
  const timeToFirstAction = metrics?.first_action_at
    ? formatDistanceToNow(new Date(metrics.first_action_at), { addSuffix: true })
    : 'No actions yet';

  const cards = [
    {
      title: 'Accounts Discovered',
      value: accountsCount,
      icon: Globe,
      description: 'Total accounts linked to your email',
      color: 'text-accent',
    },
    {
      title: 'Pending Actions',
      value: pendingActionsCount,
      icon: AlertCircle,
      description: 'Deletion or revoke requests',
      color: pendingActionsCount > 0 ? 'text-warning' : 'text-muted-foreground',
    },
    {
      title: 'Actions Taken',
      value: metrics?.actions_taken_count || 0,
      icon: TrendingUp,
      description: 'Total requests submitted',
      color: 'text-success',
    },
    {
      title: 'First Action',
      value: metrics?.first_action_at ? 'Taken' : '—',
      icon: Clock,
      description: timeToFirstAction,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="animate-slide-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-1 text-3xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <div className={`rounded-lg bg-secondary p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
