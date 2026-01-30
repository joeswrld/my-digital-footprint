import { BarChart3, PieChart, TrendingUp, Activity, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  type: 'discovery' | 'category' | 'risk' | 'actions' | 'general';
  title?: string;
  description?: string;
}

const illustrations: Record<string, { icon: ReactNode; defaultTitle: string; defaultDesc: string }> = {
  discovery: {
    icon: <TrendingUp className="h-12 w-12" />,
    defaultTitle: 'No discovery data yet',
    defaultDesc: 'Connect Gmail or add accounts to see your discovery trend',
  },
  category: {
    icon: <PieChart className="h-12 w-12" />,
    defaultTitle: 'No accounts discovered',
    defaultDesc: 'Your category breakdown will appear here once you have accounts',
  },
  risk: {
    icon: <Activity className="h-12 w-12" />,
    defaultTitle: 'No risk data available',
    defaultDesc: 'Risk distribution will show once accounts are analyzed',
  },
  actions: {
    icon: <BarChart3 className="h-12 w-12" />,
    defaultTitle: 'No actions taken yet',
    defaultDesc: 'Start managing your accounts to see action statistics',
  },
  general: {
    icon: <Search className="h-12 w-12" />,
    defaultTitle: 'No data available',
    defaultDesc: 'Data will appear here once available',
  },
};

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const config = illustrations[type] || illustrations.general;

  return (
    <div className="flex h-[250px] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted/50 p-4 text-muted-foreground/60">
        {config.icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {title || config.defaultTitle}
        </p>
        <p className="text-xs text-muted-foreground/70 max-w-[200px]">
          {description || config.defaultDesc}
        </p>
      </div>
    </div>
  );
}
