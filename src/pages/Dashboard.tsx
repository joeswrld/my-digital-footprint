import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useActions } from '@/hooks/useActions';
import { useMetrics } from '@/hooks/useMetrics';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { AccountsList } from '@/components/dashboard/AccountsList';
import { AddAccountDialog } from '@/components/dashboard/AddAccountDialog';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { accounts, isLoading: accountsLoading, addAccount, isAdding } = useAccounts();
  const { actions, createAction, isCreating } = useActions();
  const { metrics } = useMetrics();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  const pendingActions = actions.filter(a => a.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onAddAccount={() => setIsAddDialogOpen(true)} />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="space-y-8">
          {/* Metrics Overview */}
          <MetricsCards
            accountsCount={accounts.length}
            pendingActionsCount={pendingActions.length}
            metrics={metrics}
          />

          {/* Accounts List */}
          <AccountsList
            accounts={accounts}
            actions={actions}
            isLoading={accountsLoading}
            onRequestAction={(accountId, actionType) => {
              createAction({ accountId, actionType });
            }}
            isActionPending={isCreating}
          />
        </div>
      </main>

      <AddAccountDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(data) => {
          addAccount(data);
          setIsAddDialogOpen(false);
        }}
        isSubmitting={isAdding}
      />
    </div>
  );
};

export default Dashboard;
