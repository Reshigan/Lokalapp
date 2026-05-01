import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'brand' | 'accent' | 'neutral' | 'success' | 'warning';
  className?: string;
  onClick?: () => void;
}

const TONE: Record<NonNullable<StatCardProps['tone']>, { iconBg: string; iconText: string }> = {
  brand:   { iconBg: 'bg-brand-50',   iconText: 'text-brand-700'   },
  accent:  { iconBg: 'bg-accent-50',  iconText: 'text-accent-600'  },
  neutral: { iconBg: 'bg-surface-subtle', iconText: 'text-ink-soft' },
  success: { iconBg: 'bg-success-soft', iconText: 'text-emerald-700' },
  warning: { iconBg: 'bg-warning-soft', iconText: 'text-amber-700'   },
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', className, onClick }: StatCardProps) {
  const t = TONE[tone];
  return (
    <div
      onClick={onClick}
      className={cn(
        'card p-4 md:p-5 flex items-start gap-3',
        onClick && 'cursor-pointer hover:shadow-pop transition-shadow',
        className,
      )}
    >
      {Icon && (
        <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', t.iconBg)}>
          <Icon className={cn('w-5 h-5', t.iconText)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
        <p className="text-2xl md:text-3xl font-semibold text-ink leading-tight mt-0.5">{value}</p>
        {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
      </div>
    </div>
  );
}

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: StatCardProps['tone'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBadge({ icon: Icon, tone = 'brand', size = 'md', className }: IconBadgeProps) {
  const t = TONE[tone];
  const sz = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const ic = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <span className={cn('rounded-xl grid place-items-center shrink-0', sz, t.iconBg, className)}>
      <Icon className={cn(ic, t.iconText)} />
    </span>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card p-8 text-center', className)}>
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-surface-subtle grid place-items-center mb-3">
          <Icon className="w-6 h-6 text-ink-muted" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
