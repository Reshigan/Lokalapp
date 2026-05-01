import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** string path | -1 to go back | function */
  back?: string | number | (() => void);
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, back, actions, className }: PageHeaderProps) {
  const navigate = useNavigate();
  const onBack = () => {
    if (typeof back === 'function') back();
    else if (typeof back === 'string') navigate(back);
    else navigate(-1);
  };

  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {back !== undefined && (
          <button
            onClick={onBack}
            className="mt-1 p-1.5 rounded-lg text-ink-soft hover:bg-surface-subtle hover:text-ink shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-ink truncate">{title}</h1>
          {description && <p className="text-sm text-ink-muted mt-1 max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
