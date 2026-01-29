import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Search,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  MousePointer,
  Mail,
  Calendar,
  Activity,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { DiscoveredAccount, AccountAction } from '@/types/database';
import { cn } from '@/lib/utils';

interface AccountGraphProps {
  accounts: DiscoveredAccount[];
  actions: AccountAction[];
}

type DeletionMethod = 'api' | 'browser' | 'manual';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  social: '👥',
  finance: '💳',
  shopping: '🛒',
  saas: '💼',
  other: '🌐',
};

const CATEGORY_COLORS: Record<string, string> = {
  social: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  finance: 'bg-green-500/10 text-green-500 border-green-500/20',
  shopping: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  saas: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  other: 'bg-muted text-muted-foreground border-muted',
};

const RISK_CONFIG: Record<string, { color: string; icon: typeof Shield }> = {
  low: { color: 'text-green-500', icon: ShieldCheck },
  medium: { color: 'text-yellow-500', icon: Shield },
  high: { color: 'text-destructive', icon: ShieldAlert },
};

const DELETION_METHODS: Record<DeletionMethod, { label: string; icon: typeof Trash2; color: string }> = {
  api: { label: 'Auto', icon: Trash2, color: 'text-green-500' },
  browser: { label: 'Assisted', icon: MousePointer, color: 'text-blue-500' },
  manual: { label: 'Guided', icon: Mail, color: 'text-orange-500' },
};

// Mock deletion method detection (in real app, this would come from a service database)
const getDeletionMethod = (domain: string): DeletionMethod => {
  const apiDomains = ['twitter.com', 'instagram.com', 'facebook.com'];
  const browserDomains = ['linkedin.com', 'reddit.com', 'discord.com'];
  
  if (apiDomains.some((d) => domain.includes(d))) return 'api';
  if (browserDomains.some((d) => domain.includes(d))) return 'browser';
  return 'manual';
};

export const AccountGraph = ({ accounts, actions }: AccountGraphProps) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        acc.service_name.toLowerCase().includes(search.toLowerCase()) ||
        acc.domain.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || acc.category === categoryFilter;
      const matchesRisk = riskFilter === 'all' || acc.risk_score === riskFilter;
      return matchesSearch && matchesCategory && matchesRisk;
    });
  }, [accounts, search, categoryFilter, riskFilter]);

  const accountsWithActions = useMemo(() => {
    return filteredAccounts.map((acc) => {
      const accountActions = actions.filter((a) => a.discovered_account_id === acc.id);
      const pendingAction = accountActions.find(
        (a) => a.status === 'pending' || a.status === 'in_progress'
      );
      const deletionMethod = getDeletionMethod(acc.domain);
      
      return {
        ...acc,
        pendingAction,
        deletionMethod,
        daysSinceActivity: acc.last_activity
          ? differenceInDays(new Date(), new Date(acc.last_activity))
          : null,
      };
    });
  }, [filteredAccounts, actions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Account Graph
        </CardTitle>
        <CardDescription>
          All discovered accounts with deletion availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="shopping">Shopping</SelectItem>
              <SelectItem value="saas">SaaS</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Deletion Method Legend */}
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="font-medium">Deletion Methods:</span>
          {Object.entries(DELETION_METHODS).map(([key, { label, icon: Icon, color }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <Icon className={cn('h-4 w-4', color)} />
              <span className="text-muted-foreground">
                {label} ({key === 'api' ? 'Automatic' : key === 'browser' ? 'Browser Extension' : 'Email/Steps'})
              </span>
            </div>
          ))}
        </div>

        {/* Account Grid */}
        {accountsWithActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No accounts found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {accounts.length === 0
                ? 'Connect Gmail or use the browser extension to discover accounts'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accountsWithActions.map((account) => {
              const RiskIcon = RISK_CONFIG[account.risk_score || 'low'].icon;
              const riskColor = RISK_CONFIG[account.risk_score || 'low'].color;
              const DeletionIcon = DELETION_METHODS[account.deletionMethod].icon;
              const deletionColor = DELETION_METHODS[account.deletionMethod].color;

              return (
                <Link
                  key={account.id}
                  to={`/account/${account.id}`}
                  className="group"
                >
                  <div className="rounded-lg border bg-card p-4 transition-all hover:border-accent hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {CATEGORY_ICONS[account.category || 'other']}
                        </span>
                        <div>
                          <h4 className="font-medium group-hover:text-accent transition-colors">
                            {account.service_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">{account.domain}</p>
                        </div>
                      </div>
                      <RiskIcon className={cn('h-5 w-5', riskColor)} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', CATEGORY_COLORS[account.category || 'other'])}
                      >
                        {account.category || 'other'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs gap-1', deletionColor, 'border-current/20')}
                      >
                        <DeletionIcon className="h-3 w-3" />
                        {DELETION_METHODS[account.deletionMethod].label}
                      </Badge>
                      {account.pendingAction && (
                        <Badge variant="secondary" className="text-xs">
                          Action pending
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(account.first_seen), 'MMM d, yyyy')}
                      </div>
                      {account.daysSinceActivity !== null && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {account.daysSinceActivity === 0
                            ? 'Active today'
                            : `${account.daysSinceActivity}d inactive`}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {accounts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredAccounts.length} of {accounts.length} accounts
          </div>
        )}
      </CardContent>
    </Card>
  );
};
