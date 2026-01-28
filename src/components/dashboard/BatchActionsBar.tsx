import { Button } from '@/components/ui/button';
import { Trash2, Ban, X } from 'lucide-react';

interface BatchActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onRevoke: () => void;
  onClearSelection: () => void;
  isActionPending: boolean;
}

export function BatchActionsBar({
  selectedCount,
  onDelete,
  onRevoke,
  onClearSelection,
  isActionPending,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-50 mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {selectedCount} account{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRevoke}
            disabled={isActionPending}
          >
            <Ban className="mr-2 h-4 w-4" />
            Revoke Access
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isActionPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Request Deletion
          </Button>
        </div>
      </div>
    </div>
  );
}
