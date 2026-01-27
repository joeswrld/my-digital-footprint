import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useActions } from '@/hooks/useActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Trash2,
  Ban,
  Globe,
  ShoppingCart,
  Wallet,
  Wrench,
  Users,
  Loader2,
  Mail,
  Calendar,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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

const riskDescriptions = {
  low: 'This service follows good security practices and poses minimal risk to your data.',
  medium: 'This service has some security considerations. Review your data exposure periodically.',
  high: 'This service may have security concerns. Consider limiting data sharing or removing access.',
};

// Deletion/revocation instructions per category
const deletionInstructions = {
  social: [
    'Log into your account at the service website',
    'Navigate to Settings or Account Settings',
    'Look for "Privacy" or "Account" section',
    'Find "Delete Account" or "Deactivate Account" option',
    'Follow the confirmation steps (may require email verification)',
    'Wait for the deletion grace period (usually 30 days)',
  ],
  finance: [
    'Contact customer support to initiate account closure',
    'Download any tax documents or transaction history',
    'Transfer or withdraw any remaining funds',
    'Request written confirmation of account closure',
    'Monitor for any final statements',
    'Update any linked accounts or autopay settings',
  ],
  shopping: [
    'Log into your account',
    'Go to Account Settings or Privacy Settings',
    'Look for "Close Account" or "Delete Account"',
    'Cancel any active subscriptions first',
    'Request deletion of purchase history if desired',
    'Remove saved payment methods before deletion',
  ],
  saas: [
    'Export any important data before deletion',
    'Cancel active subscription to avoid charges',
    'Navigate to Account or Billing settings',
    'Find "Delete Account" or "Close Account" option',
    'Revoke any connected integrations',
    'Confirm deletion via email if required',
  ],
  other: [
    'Log into your account',
    'Navigate to Account Settings',
    'Look for Privacy or Data Management section',
    'Find the account deletion option',
    'Follow the confirmation process',
    'Save confirmation of deletion request',
  ],
};

const revocationInstructions = [
  'Go to your connected apps or integrations settings',
  'Find this service in the list of authorized apps',
  'Click "Revoke Access" or "Remove"',
  'Confirm the revocation',
  'Check that the service no longer appears in connected apps',
];

const AccountDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { actions, createAction, isCreating } = useActions();

  if (authLoading || accountsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const account = accounts.find((a) => a.id === id);

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Account not found</h2>
              <p className="mt-2 text-muted-foreground">
                This account may have been deleted or doesn't exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const Icon = categoryIcons[account.category];
  const accountActions = actions.filter((a) => a.discovered_account_id === account.id);
  const hasPendingDeletion = accountActions.some(
    (a) => a.action_type === 'deletion' && a.status === 'pending'
  );
  const hasPendingRevoke = accountActions.some(
    (a) => a.action_type === 'revoke' && a.status === 'pending'
  );
  const instructions = deletionInstructions[account.category];

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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 ${categoryColors[account.category]}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{account.service_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Globe className="h-4 w-4" />
                      {account.domain}
                      <a
                        href={`https://${account.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={`${riskColors[account.risk_score]} text-sm`}>
                    {account.risk_score} risk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">First Seen</p>
                      <p className="text-sm font-medium">
                        {format(new Date(account.first_seen), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Activity</p>
                      <p className="text-sm font-medium">
                        {account.last_activity
                          ? formatDistanceToNow(new Date(account.last_activity), { addSuffix: true })
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-sm font-medium capitalize">{account.source}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`rounded-lg border p-4 ${
                    account.risk_score === 'high'
                      ? 'border-destructive/30 bg-destructive/5'
                      : account.risk_score === 'medium'
                      ? 'border-warning/30 bg-warning/5'
                      : 'border-success/30 bg-success/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {account.risk_score === 'high' ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : account.risk_score === 'medium' ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                    <span className="font-medium capitalize">{account.risk_score} Risk Level</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {riskDescriptions[account.risk_score]}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Recommendations</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {account.risk_score === 'high' && (
                      <>
                        <li>• Review what data this service has access to</li>
                        <li>• Consider deleting your account if no longer needed</li>
                        <li>• Check for any data breach notifications</li>
                      </>
                    )}
                    {account.risk_score === 'medium' && (
                      <>
                        <li>• Periodically review your privacy settings</li>
                        <li>• Use strong, unique passwords</li>
                        <li>• Enable two-factor authentication if available</li>
                      </>
                    )}
                    {account.risk_score === 'low' && (
                      <>
                        <li>• Continue following good security practices</li>
                        <li>• Keep your account information up to date</li>
                        <li>• Review permissions periodically</li>
                      </>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Deletion Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  How to Delete Your Account
                </CardTitle>
                <CardDescription>
                  Step-by-step instructions for removing your {account.service_name} account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {instructions.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
                <Separator className="my-4" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="h-4 w-4" />
                  <span>
                    Visit{' '}
                    <a
                      href={`https://${account.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {account.domain}
                    </a>{' '}
                    to start the deletion process
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Revocation Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  How to Revoke Access
                </CardTitle>
                <CardDescription>
                  Remove this service's access to your connected accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {revocationInstructions.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => createAction({ accountId: account.id, actionType: 'deletion' })}
                  disabled={hasPendingDeletion || isCreating}
                >
                  {hasPendingDeletion ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Deletion Pending
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Request Deletion
                    </>
                  )}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => createAction({ accountId: account.id, actionType: 'revoke' })}
                  disabled={hasPendingRevoke || isCreating}
                >
                  {hasPendingRevoke ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Revoke Pending
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Revoke Access
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Action History */}
            <Card>
              <CardHeader>
                <CardTitle>Action History</CardTitle>
                <CardDescription>Previous actions on this account</CardDescription>
              </CardHeader>
              <CardContent>
                {accountActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No actions taken yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {accountActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        {action.action_type === 'deletion' ? (
                          <Trash2 className="h-4 w-4 text-destructive mt-0.5" />
                        ) : (
                          <Ban className="h-4 w-4 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">
                            {action.action_type} Request
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            action.status === 'completed'
                              ? 'bg-success/10 text-success'
                              : action.status === 'failed'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-warning/10 text-warning'
                          }
                        >
                          {action.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetails;
