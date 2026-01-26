import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountCategory, RiskLevel } from '@/types/database';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    service_name: string;
    domain: string;
    category: AccountCategory;
    first_seen: string;
    risk_score: RiskLevel;
  }) => void;
  isSubmitting: boolean;
}

const formSchema = z.object({
  service_name: z.string().min(1, 'Service name is required').max(100),
  domain: z.string().min(1, 'Domain is required').max(255),
  category: z.enum(['social', 'finance', 'shopping', 'saas', 'other']),
  risk_score: z.enum(['low', 'medium', 'high']),
});

export function AddAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddAccountDialogProps) {
  const [serviceName, setServiceName] = useState('');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState<AccountCategory>('other');
  const [riskScore, setRiskScore] = useState<RiskLevel>('low');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse({
      service_name: serviceName,
      domain: domain,
      category,
      risk_score: riskScore,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    onSubmit({
      service_name: serviceName,
      domain: domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      category,
      first_seen: new Date().toISOString(),
      risk_score: riskScore,
    });

    // Reset form
    setServiceName('');
    setDomain('');
    setCategory('other');
    setRiskScore('low');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Manually add an account you know about.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input
              id="serviceName"
              placeholder="e.g., Netflix, Facebook, Shopify"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.service_name && (
              <p className="text-sm text-destructive">{errors.service_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="e.g., netflix.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.domain && (
              <p className="text-sm text-destructive">{errors.domain}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as AccountCategory)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="saas">SaaS / Tools</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select
                value={riskScore}
                onValueChange={(v) => setRiskScore(v as RiskLevel)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
