import { useCallback } from 'react';
import { DiscoveredAccount, AccountAction } from '@/types/database';
import { toast } from 'sonner';

interface ExportData {
  exportedAt: string;
  accounts: DiscoveredAccount[];
  actions: AccountAction[];
}

export function useDataExport() {
  const generateExportData = useCallback(
    (accounts: DiscoveredAccount[], actions: AccountAction[]): ExportData => {
      return {
        exportedAt: new Date().toISOString(),
        accounts,
        actions,
      };
    },
    []
  );

  const exportAsJSON = useCallback(
    (accounts: DiscoveredAccount[], actions: AccountAction[]) => {
      const data = generateExportData(accounts, actions);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      downloadFile(blob, `fixsense-export-${formatDate()}.json`);
      toast.success('Data exported as JSON');
    },
    [generateExportData]
  );

  const exportAsCSV = useCallback(
    (accounts: DiscoveredAccount[], actions: AccountAction[]) => {
      // Accounts CSV
      const accountsHeaders = [
        'ID',
        'Service Name',
        'Domain',
        'Category',
        'Risk Score',
        'Source',
        'First Seen',
        'Last Activity',
      ];
      const accountsRows = accounts.map((acc) => [
        acc.id,
        acc.service_name,
        acc.domain,
        acc.category,
        acc.risk_score,
        acc.source,
        acc.first_seen,
        acc.last_activity || '',
      ]);

      // Actions CSV
      const actionsHeaders = [
        'ID',
        'Account ID',
        'Action Type',
        'Status',
        'Notes',
        'Created At',
        'Completed At',
      ];
      const actionsRows = actions.map((action) => [
        action.id,
        action.discovered_account_id,
        action.action_type,
        action.status,
        action.notes || '',
        action.created_at,
        action.completed_at || '',
      ]);

      const accountsCSV = [accountsHeaders, ...accountsRows]
        .map((row) => row.map(escapeCSV).join(','))
        .join('\n');

      const actionsCSV = [actionsHeaders, ...actionsRows]
        .map((row) => row.map(escapeCSV).join(','))
        .join('\n');

      const combinedCSV = `DISCOVERED ACCOUNTS\n${accountsCSV}\n\nACTION HISTORY\n${actionsCSV}`;

      const blob = new Blob([combinedCSV], { type: 'text/csv' });
      downloadFile(blob, `fixsense-export-${formatDate()}.csv`);
      toast.success('Data exported as CSV');
    },
    []
  );

  return { exportAsJSON, exportAsCSV };
}

function escapeCSV(value: unknown): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(): string {
  return new Date().toISOString().split('T')[0];
}
