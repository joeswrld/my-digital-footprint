import { Link } from 'react-router-dom';
import { DiscoveredAccount, AccountAction, ActionType } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Globe,
  ShoppingCart,
  Wallet,
  Wrench,
  Users,
  MoreVertical,
  Trash2,
  Ban,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AccountsListProps {
  accounts: DiscoveredAccount[];
  actions: AccountAction[];
  isLoading: boolean;
  onRequestAction: (accountId: string, actionType: ActionType) => void;
  isActionPending: boolean;
}

const categoryIcons = {
  social: Users,
  finance: Wallet,
  shopping: ShoppingCart,
  saas: Wrench,
  other: Globe,
};

const categoryColors = {
  social: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  finance: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  shopping: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  saas: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-secondary text-secondary-foreground',
};

const riskColors = {
  low: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function AccountsList({
  accounts,
  actions,
  isLoading,
  onRequestAction,
  isActionPending,
}: AccountsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Accounts</CardTitle>
          <CardDescription>Loading your discovered accounts...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-secondary p-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No accounts yet</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Add accounts manually or connect Gmail to discover them automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getAccountActions = (accountId: string) => {
    return actions.filter((a) => a.discovered_account_id === accountId);
  };

  const hasPendingAction = (accountId: string, actionType: ActionType) => {
    return getAccountActions(accountId).some(
      (a) => a.action_type === actionType && a.status === 'pending'
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
        <CardDescription>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} discovered
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.map((account) => {
            const Icon = categoryIcons[account.category];
            const accountActions = getAccountActions(account.id);
            const hasPending = accountActions.some((a) => a.status === 'pending');

            return (
              <Link
                to={`/account/${account.id}`}
                key={account.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 group cursor-pointer"
              >
                {/* Category Icon */}
                <div className={`rounded-lg p-2.5 ${categoryColors[account.category]}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{account.service_name}</h4>
                    <Badge variant="outline" className={riskColors[account.risk_score]}>
                      {account.risk_score}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {account.domain}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    First seen{' '}
                    {formatDistanceToNow(new Date(account.first_seen), { addSuffix: true })}
                    {account.last_activity && (
                      <> • Last activity {formatDistanceToNow(new Date(account.last_activity), { addSuffix: true })}</>
                    )}
                  </p>
                </div>

                {/* Status Badges */}
                {hasPending && (
                  <Badge variant="secondary" className="hidden sm:flex gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="icon" disabled={isActionPending}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onRequestAction(account.id, 'deletion');
                      }}
                      disabled={hasPendingAction(account.id, 'deletion')}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Request Deletion
                      {hasPendingAction(account.id, 'deletion') && (
                        <Clock className="ml-auto h-3 w-3 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        onRequestAction(account.id, 'revoke');
                      }}
                      disabled={hasPendingAction(account.id, 'revoke')}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Revoke Access
                      {hasPendingAction(account.id, 'revoke') && (
                        <Clock className="ml-auto h-3 w-3 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
