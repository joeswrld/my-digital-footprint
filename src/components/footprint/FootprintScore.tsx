import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FootprintScoreProps {
  score: number;
  totalAccounts: number;
  highRiskCount: number;
  breachedCount: number;
}

export const FootprintScore = ({
  score,
  totalAccounts,
  highRiskCount,
  breachedCount,
}: FootprintScoreProps) => {
  const { level, color, icon: Icon, description, bgColor } = useMemo(() => {
    if (score <= 25) {
      return {
        level: 'Low Exposure',
        color: 'text-green-500',
        bgColor: 'bg-green-500',
        icon: ShieldCheck,
        description: 'Your digital footprint is minimal. Great job staying secure!',
      };
    }
    if (score <= 50) {
      return {
        level: 'Moderate Exposure',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500',
        icon: Shield,
        description: 'Some accounts may need attention. Review inactive services.',
      };
    }
    if (score <= 75) {
      return {
        level: 'High Exposure',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500',
        icon: ShieldAlert,
        description: 'Consider removing unused accounts to reduce your footprint.',
      };
    }
    return {
      level: 'Critical Exposure',
      color: 'text-destructive',
      bgColor: 'bg-destructive',
      icon: ShieldAlert,
      description: 'Immediate action recommended. Many high-risk accounts detected.',
    };
  }, [score]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={cn('h-5 w-5', color)} />
          Exposure Score
        </CardTitle>
        <CardDescription>Your overall data exposure risk</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Circle */}
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 283} 283`}
              className={color}
            />
          </svg>
          <div className="text-center">
            <span className={cn('text-4xl font-bold', color)}>{score}</span>
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Level Badge */}
        <div className="text-center">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
              bgColor,
              'text-white'
            )}
          >
            {level}
          </span>
        </div>

        {/* Description */}
        <p className="text-center text-sm text-muted-foreground">{description}</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 border-t pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalAccounts}</p>
            <p className="text-xs text-muted-foreground">Accounts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">{highRiskCount}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{breachedCount}</p>
            <p className="text-xs text-muted-foreground">Breached</p>
          </div>
        </div>

        {/* Reduction Tips */}
        {score > 25 && (
          <div className="rounded-lg border border-dashed p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="h-4 w-4 text-green-500" />
              How to reduce your score
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {highRiskCount > 0 && <li>• Review and secure {highRiskCount} high-risk accounts</li>}
              {breachedCount > 0 && <li>• Change passwords for {breachedCount} breached services</li>}
              <li>• Delete unused or forgotten accounts</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
