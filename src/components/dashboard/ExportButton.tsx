import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { DiscoveredAccount, AccountAction } from '@/types/database';
import { useDataExport } from '@/hooks/useDataExport';

interface ExportButtonProps {
  accounts: DiscoveredAccount[];
  actions: AccountAction[];
  disabled?: boolean;
}

export function ExportButton({ accounts, actions, disabled }: ExportButtonProps) {
  const { exportAsJSON, exportAsCSV } = useDataExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || accounts.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => exportAsJSON(accounts, actions)}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsCSV(accounts, actions)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
